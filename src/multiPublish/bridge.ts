import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import http, { type IncomingMessage, type ServerResponse } from 'http';

import type {
  MultiPlatformId,
  MultiPlatformTaskState,
  MultiPublishConnectionState,
  MultiPublishPairing,
  MultiPublishSnapshot,
  MultiPublishTaskEventV1,
  MultiPublishTaskState,
  PublishTaskV1,
} from './types';
import { MULTI_PLATFORM_STATUS, PUBLISH_PLATFORM_IDS } from './types';

const TASK_TTL_MS = 10 * 60 * 1000;
const PAIR_TTL_MS = 10 * 60 * 1000;
const MAX_ASSET_BYTES = 10 * 1024 * 1024;
const MAX_TASK_BYTES = 100 * 1024 * 1024;
const MAX_JSON_BODY_BYTES = 64 * 1024;
const TARGET_PAYLOADS_CAPABILITY = 'target-payloads-v1';

interface TaskRecord {
  manifest: PublishTaskV1;
  token: string;
  assets: Map<string, { body: ArrayBuffer; mimeType: string; fileName: string }>;
  state: MultiPublishTaskState;
}

interface PairTokenRecord {
  token: string;
  expiresAt: number;
}

interface BridgeOptions {
  getPairing: () => MultiPublishPairing | null;
  savePairing: (pairing: MultiPublishPairing | null) => Promise<void>;
  now?: () => number;
}

type Listener = () => void;

function json(response: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

function bearer(request: IncomingMessage): string {
  const match = /^Bearer\s+(.+)$/i.exec(request.headers.authorization ?? '');
  return match?.[1] ?? '';
}

function hexSignature(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

function signaturesMatch(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, 'hex');
  const rightBytes = Buffer.from(right, 'hex');
  return leftBytes.length > 0
    && leftBytes.length === rightBytes.length
    && timingSafeEqual(leftBytes, rightBytes);
}

function isPlatformId(value: unknown): value is MultiPlatformId {
  return typeof value === 'string' && PUBLISH_PLATFORM_IDS.includes(value as MultiPlatformId);
}

function isTaskEvent(value: unknown): value is MultiPublishTaskEventV1 {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<MultiPublishTaskEventV1>;
  return event.protocolVersion === 1
    && typeof event.taskId === 'string'
    && isPlatformId(event.platformId)
    && typeof event.status === 'string'
    && MULTI_PLATFORM_STATUS.includes(event.status)
    && typeof event.occurredAt === 'string';
}

async function readJson(request: IncomingMessage): Promise<{ raw: string; value: unknown }> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.from(chunk as Uint8Array);
    size += bytes.length;
    if (size > MAX_JSON_BODY_BYTES) throw new Error('请求体过大');
    chunks.push(bytes);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return { raw, value: JSON.parse(raw) as unknown };
}

function bridgePage(): string {
  return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WeSight 发布助手</title><style>body{margin:0;background:#f8f6f3;color:#342923;font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.card{max-width:520px;margin:12vh auto;padding:30px;border:1px solid #eadfd8;border-radius:16px;background:#fff;box-shadow:0 18px 50px rgba(80,54,40,.08)}h1{margin:0 0 10px;font-size:20px;color:#d97757}p{margin:0;color:#736159}</style></head><body><main class="card"><h1>WeSight 发布助手</h1><p id="wesight-bridge-status">正在等待浏览器扩展响应…</p></main></body></html>';
}

export class MultiPublishBridge {
  private server: http.Server | null = null;
  private port: number | null = null;
  private lastSeenAt = 0;
  private extensionVersion: string | null = null;
  private supportedPlatforms: MultiPlatformId[] | null = null;
  private capabilities: string[] | null = null;
  private pairToken: PairTokenRecord | null = null;
  private tasks = new Map<string, TaskRecord>();
  private listeners = new Set<Listener>();
  private cleanupTimer: number | null = null;
  private readonly now: () => number;

  constructor(private readonly options: BridgeOptions) {
    this.now = options.now ?? Date.now;
  }

  async start(): Promise<void> {
    if (this.server) return;
    const server = http.createServer((request, response) => {
      void this.handle(request, response).catch(() => {
        if (!response.headersSent) json(response, 500, { error: '本地通道处理失败' });
        else response.end();
      });
    });
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === 'string') {
      server.close();
      throw new Error('无法获取本地通道端口');
    }
    this.server = server;
    this.port = address.port;
    this.cleanupTimer = window.setInterval(() => this.cleanupExpired(), 30_000);
    this.emit();
  }

  async stop(): Promise<void> {
    if (this.cleanupTimer) window.clearInterval(this.cleanupTimer);
    this.cleanupTimer = null;
    this.tasks.clear();
    this.pairToken = null;
    const server = this.server;
    this.server = null;
    this.port = null;
    if (server) await new Promise<void>(resolve => server.close(() => resolve()));
    this.emit();
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getConnectionState(): MultiPublishConnectionState {
    const pairing = this.options.getPairing();
    return {
      running: this.port !== null,
      paired: Boolean(pairing),
      connected: Boolean(pairing && this.now() - this.lastSeenAt < 30_000),
      baseUrl: this.port === null ? null : `http://127.0.0.1:${this.port}`,
      extensionVersion: this.extensionVersion,
      supportedPlatforms: this.supportedPlatforms,
      capabilities: this.capabilities,
    };
  }

  getTask(taskId: string): MultiPublishTaskState | null {
    return this.tasks.get(taskId)?.state ?? null;
  }

  getLatestTask(): MultiPublishTaskState | null {
    return Array.from(this.tasks.values())
      .sort((left, right) => Date.parse(right.state.createdAt) - Date.parse(left.state.createdAt))[0]?.state ?? null;
  }

  async clearPairing(): Promise<void> {
    await this.options.savePairing(null);
    this.lastSeenAt = 0;
    this.extensionVersion = null;
    this.supportedPlatforms = null;
    this.capabilities = null;
    this.emit();
  }

  createTask(snapshot: MultiPublishSnapshot, targets: MultiPlatformId[], forcePair = false): {
    task: MultiPublishTaskState;
    handoffUrl: string;
  } {
    if (this.port === null) throw new Error('本地通道尚未启动');
    const uniqueTargets = Array.from(new Set(targets));
    if (!uniqueTargets.length || !uniqueTargets.every(isPlatformId)) throw new Error('请选择至少一个发布平台');
    const totalBytes = snapshot.assets.reduce((total, asset) => total + asset.size, 0);
    if (snapshot.assets.some(asset => asset.size > MAX_ASSET_BYTES)) throw new Error('单张图片不能超过 10 MB');
    if (totalBytes > MAX_TASK_BYTES) throw new Error('任务图片总大小不能超过 100 MB');
    const assetIds = new Set(snapshot.assets.map(asset => asset.id));
    if (snapshot.targetPayloads) {
      for (const platformId of uniqueTargets) {
        const payload = snapshot.targetPayloads[platformId];
        if (!payload) throw new Error(`缺少 ${platformId} 的平台内容`);
        if (payload.assetIds.some(assetId => !assetIds.has(assetId))) {
          throw new Error(`${platformId} 的图片映射无效`);
        }
        if (payload.article.coverAssetId && !payload.assetIds.includes(payload.article.coverAssetId)) {
          throw new Error(`${platformId} 的封面映射无效`);
        }
      }
    }
    const createdAt = this.now();
    const taskId = randomUUID();
    const token = randomBytes(32).toString('hex');
    const manifest: PublishTaskV1 = {
      protocolVersion: 1,
      taskId,
      createdAt: new Date(createdAt).toISOString(),
      expiresAt: new Date(createdAt + TASK_TTL_MS).toISOString(),
      source: { vaultPath: snapshot.sourcePath, contentHash: snapshot.contentHash },
      article: {
        title: snapshot.title,
        digest: snapshot.digest,
        markdown: snapshot.markdown,
        html: snapshot.html,
        coverAssetId: snapshot.coverAssetId,
        tags: snapshot.tags,
        ...(snapshot.original === undefined ? {} : { original: snapshot.original }),
      },
      ...(snapshot.targetOptions ? { targetOptions: snapshot.targetOptions } : {}),
      ...(snapshot.targetPayloads ? { targetPayloads: snapshot.targetPayloads } : {}),
      assets: snapshot.assets.map(asset => ({
        id: asset.id,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        size: asset.size,
        sha256: asset.sha256,
      })),
      targets: uniqueTargets,
      behavior: { finalAction: 'manual', groupTabs: true },
    };
    const platforms = Object.fromEntries(PUBLISH_PLATFORM_IDS.map(platformId => [platformId, {
      platformId,
      status: uniqueTargets.includes(platformId) ? 'queued' : 'cancelled',
      warnings: [],
      occurredAt: new Date(createdAt).toISOString(),
    }])) as unknown as Record<MultiPlatformId, MultiPlatformTaskState>;
    const state: MultiPublishTaskState = {
      taskId,
      title: snapshot.title,
      createdAt: manifest.createdAt,
      expiresAt: manifest.expiresAt,
      targets: uniqueTargets,
      platforms,
    };
    this.tasks.set(taskId, {
      manifest,
      token,
      state,
      assets: new Map(snapshot.assets.map(asset => [asset.id, {
        body: asset.body,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
      }])),
    });
    const needsPairing = forcePair || !this.options.getPairing();
    if (needsPairing) {
      this.pairToken = { token: randomBytes(32).toString('hex'), expiresAt: createdAt + PAIR_TTL_MS };
    }
    const fragment = new URLSearchParams({ taskToken: token });
    if (needsPairing && this.pairToken) fragment.set('pairToken', this.pairToken.token);
    const handoffUrl = `http://127.0.0.1:${this.port}/wesight-bridge?taskId=${encodeURIComponent(taskId)}#${fragment.toString()}`;
    this.emit();
    return { task: state, handoffUrl };
  }

  createRetryUrl(taskId: string, platformId: MultiPlatformId): string {
    if (this.port === null) throw new Error('本地通道尚未启动');
    const record = this.tasks.get(taskId);
    if (!record || !record.manifest.targets.includes(platformId)) throw new Error('任务已经失效');
    const fragment = new URLSearchParams({ taskToken: record.token });
    return `http://127.0.0.1:${this.port}/wesight-bridge?taskId=${encodeURIComponent(taskId)}&retryPlatform=${encodeURIComponent(platformId)}#${fragment.toString()}`;
  }

  createOpenUrl(taskId: string, platformId: MultiPlatformId): string {
    if (this.port === null) throw new Error('本地通道尚未启动');
    const record = this.tasks.get(taskId);
    if (!record || !record.manifest.targets.includes(platformId)) throw new Error('任务已经失效');
    const fragment = new URLSearchParams({ taskToken: record.token });
    return `http://127.0.0.1:${this.port}/wesight-bridge?taskId=${encodeURIComponent(taskId)}&openPlatform=${encodeURIComponent(platformId)}#${fragment.toString()}`;
  }

  createOpenTaskUrl(taskId: string): string {
    if (this.port === null) throw new Error('本地通道尚未启动');
    const record = this.tasks.get(taskId);
    if (!record) throw new Error('任务已经失效');
    const fragment = new URLSearchParams({ taskToken: record.token });
    return `http://127.0.0.1:${this.port}/wesight-bridge?taskId=${encodeURIComponent(taskId)}&openTask=1#${fragment.toString()}`;
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  private cleanupExpired(): void {
    const now = this.now();
    if (this.pairToken && this.pairToken.expiresAt <= now) this.pairToken = null;
    for (const [taskId, record] of this.tasks) {
      if (Date.parse(record.manifest.expiresAt) <= now) this.tasks.delete(taskId);
    }
    this.emit();
  }

  private applyCors(request: IncomingMessage, response: ServerResponse): boolean {
    const origin = request.headers.origin ?? '';
    const extensionOrigin = /^chrome-extension:\/\/([a-p]{32})$/.exec(origin);
    const pairing = this.options.getPairing();
    if (extensionOrigin && (!pairing || pairing.clientId === extensionOrigin[1])) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Vary', 'Origin');
      response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-WeSight-Client, X-WeSight-Signature, X-WeSight-Platforms, X-WeSight-Version, X-WeSight-Capabilities');
      response.setHeader('Access-Control-Expose-Headers', 'X-WeSight-Signature');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      return true;
    }
    return !origin;
  }

  private authenticatedTask(request: IncomingMessage, taskId: string): TaskRecord | null {
    const pairing = this.options.getPairing();
    const task = this.tasks.get(taskId);
    if (!pairing || !task) return null;
    if (request.headers['x-wesight-client'] !== pairing.clientId) return null;
    if (bearer(request) !== task.token) return null;
    if (Date.parse(task.manifest.expiresAt) <= this.now()) return null;
    this.recordExtensionCapabilities(request);
    return task;
  }

  private recordExtensionCapabilities(request: IncomingMessage): void {
    const rawPlatforms = request.headers['x-wesight-platforms'];
    const nextPlatforms = typeof rawPlatforms === 'string'
      ? rawPlatforms.split(',').map(value => value.trim()).filter(isPlatformId)
      : [];
    const rawVersion = request.headers['x-wesight-version'];
    const nextVersion = typeof rawVersion === 'string' && rawVersion.trim()
      ? rawVersion.trim().slice(0, 50)
      : null;
    const rawCapabilities = request.headers['x-wesight-capabilities'];
    const nextCapabilities = typeof rawCapabilities === 'string'
      ? Array.from(new Set(rawCapabilities.split(',').map(value => value.trim()).filter(Boolean))).slice(0, 20)
      : [];
    const changed = this.extensionVersion !== nextVersion
      || this.supportedPlatforms === null
      || this.supportedPlatforms.join(',') !== nextPlatforms.join(',')
      || this.capabilities === null
      || this.capabilities.join(',') !== nextCapabilities.join(',');
    this.extensionVersion = nextVersion;
    this.supportedPlatforms = nextPlatforms;
    this.capabilities = nextCapabilities;
    this.lastSeenAt = this.now();
    if (changed) this.emit();
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? '/', `http://127.0.0.1:${this.port ?? 0}`);
    if (!this.applyCors(request, response)) {
      json(response, 403, { error: '来源不允许' });
      return;
    }
    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }
    if (request.method === 'GET' && url.pathname === '/health') {
      const pairing = this.options.getPairing();
      if (pairing && request.headers['x-wesight-client'] === pairing.clientId) {
        this.recordExtensionCapabilities(request);
      }
      json(response, 200, { protocolVersion: 1, paired: Boolean(pairing) });
      return;
    }
    if (request.method === 'GET' && url.pathname === '/wesight-bridge') {
      const body = bridgePage();
      response.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
      });
      response.end(body);
      return;
    }
    if (request.method === 'POST' && url.pathname === '/v1/pair') {
      const token = bearer(request);
      if (!this.pairToken || this.pairToken.expiresAt <= this.now() || token !== this.pairToken.token) {
        json(response, 401, { error: '配对令牌无效或已经过期' });
        return;
      }
      const { value } = await readJson(request);
      const record = value as Partial<MultiPublishPairing>;
      const originClient = /^chrome-extension:\/\/([a-p]{32})$/.exec(request.headers.origin ?? '')?.[1];
      if (!record || typeof record.clientId !== 'string' || record.clientId !== originClient || !/^[a-f0-9]{64}$/i.test(record.secret ?? '')) {
        json(response, 400, { error: '配对信息无效' });
        return;
      }
      await this.options.savePairing({
        clientId: record.clientId,
        secret: record.secret!,
        pairedAt: new Date(this.now()).toISOString(),
      });
      this.pairToken = null;
      this.lastSeenAt = this.now();
      this.emit();
      json(response, 200, { paired: true });
      return;
    }
    const taskMatch = /^\/v1\/tasks\/([^/]+)$/.exec(url.pathname);
    if (request.method === 'GET' && taskMatch) {
      const task = this.authenticatedTask(request, decodeURIComponent(taskMatch[1]));
      if (!task) {
        json(response, 401, { error: '任务凭据无效或已经过期' });
        return;
      }
      if (task.manifest.targetPayloads && !this.capabilities?.includes(TARGET_PAYLOADS_CAPABILITY)) {
        json(response, 426, { error: '发布助手版本过旧，请更新扩展后重试' });
        return;
      }
      const pairing = this.options.getPairing()!;
      const body = JSON.stringify(task.manifest);
      response.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        'Cache-Control': 'no-store',
        'X-WeSight-Signature': hexSignature(pairing.secret, body),
      });
      response.end(body);
      return;
    }
    const assetMatch = /^\/v1\/tasks\/([^/]+)\/assets\/([^/]+)$/.exec(url.pathname);
    if (request.method === 'GET' && assetMatch) {
      const task = this.authenticatedTask(request, decodeURIComponent(assetMatch[1]));
      const asset = task?.assets.get(decodeURIComponent(assetMatch[2]));
      if (!task || !asset) {
        json(response, 404, { error: '图片不存在或任务已经释放' });
        return;
      }
      const body = Buffer.from(asset.body);
      response.writeHead(200, {
        'Content-Type': asset.mimeType,
        'Content-Length': body.length,
        'Content-Disposition': `inline; filename="${encodeURIComponent(asset.fileName)}"`,
        'Cache-Control': 'no-store',
      });
      response.end(body);
      return;
    }
    const eventMatch = /^\/v1\/tasks\/([^/]+)\/events$/.exec(url.pathname);
    if (request.method === 'POST' && eventMatch) {
      const taskId = decodeURIComponent(eventMatch[1]);
      const task = this.authenticatedTask(request, taskId);
      const pairing = this.options.getPairing();
      if (!task || !pairing) {
        json(response, 401, { error: '任务凭据无效或已经过期' });
        return;
      }
      const { raw, value } = await readJson(request);
      const signature = String(request.headers['x-wesight-signature'] ?? '');
      if (!signaturesMatch(signature, hexSignature(pairing.secret, raw))) {
        json(response, 401, { error: '事件签名无效' });
        return;
      }
      if (!isTaskEvent(value) || value.taskId !== taskId || !task.manifest.targets.includes(value.platformId)) {
        json(response, 400, { error: '任务事件无效' });
        return;
      }
      task.state.platforms[value.platformId] = {
        platformId: value.platformId,
        status: value.status,
        message: typeof value.message === 'string' ? value.message.slice(0, 500) : undefined,
        tabId: typeof value.tabId === 'number' ? value.tabId : undefined,
        draftUrl: typeof value.draftUrl === 'string' ? value.draftUrl : undefined,
        warnings: Array.isArray(value.warnings)
          ? value.warnings.filter((item): item is string => typeof item === 'string').slice(0, 20).map(item => item.slice(0, 500))
          : [],
        occurredAt: value.occurredAt,
      };
      if (task.state.targets.every(platformId => ['ready', 'cancelled'].includes(task.state.platforms[platformId].status))) {
        task.assets.clear();
        task.manifest.article.markdown = '';
        task.manifest.article.html = '';
        for (const payload of Object.values(task.manifest.targetPayloads ?? {})) {
          if (!payload) continue;
          payload.article.markdown = '';
          payload.article.html = '';
        }
      }
      this.emit();
      json(response, 200, { received: true });
      return;
    }
    json(response, 404, { error: '接口不存在' });
  }
}
