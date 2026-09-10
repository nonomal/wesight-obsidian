import { createHmac } from 'crypto';
import http from 'http';

import { MultiPublishBridge } from '../src/multiPublish/bridge';
import type { MultiPublishPairing, MultiPublishSnapshot } from '../src/multiPublish/types';

const CLIENT_ID = 'a'.repeat(32);
const SECRET = 'b'.repeat(64);

interface LoopbackResponse {
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

async function loopbackRequest(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {},
): Promise<LoopbackResponse> {
  return new Promise((resolve, reject) => {
    const request = http.request(url, {
      method: options.method ?? 'GET',
      headers: options.headers,
    }, response => {
      const chunks: Uint8Array[] = [];
      response.on('data', chunk => chunks.push(Buffer.from(chunk as Uint8Array)));
      response.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({
          status: response.statusCode ?? 0,
          headers: {
            get: name => {
              const value = response.headers[name.toLowerCase()];
              return Array.isArray(value) ? value.join(', ') : value ?? null;
            },
          },
          text: async () => body.toString('utf8'),
          arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
        });
      });
    });
    request.on('error', reject);
    if (options.body) request.write(options.body);
    request.end();
  });
}

function snapshot(): MultiPublishSnapshot {
  const body = new Uint8Array([1, 2, 3]).buffer;
  return {
    sourcePath: '文章/测试.md',
    contentHash: 'c'.repeat(64),
    title: '多平台测试',
    digest: '摘要',
    markdown: '正文',
    html: '<p>正文</p>',
    coverAssetId: null,
    tags: ['测试'],
    original: true,
    assets: [{ id: 'd'.repeat(64), fileName: '图.png', mimeType: 'image/png', size: 3, sha256: 'd'.repeat(64), body }],
    warnings: [],
  };
}

describe('multi-platform loopback bridge', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { setInterval, clearInterval });
  });

  afterEach(() => vi.unstubAllGlobals());

  test('pairs, signs a task manifest, serves assets, and verifies task events', async () => {
    let pairing: MultiPublishPairing | null = null;
    const bridge = new MultiPublishBridge({
      getPairing: () => pairing,
      savePairing: async value => { pairing = value; },
    });
    await bridge.start();
    try {
      const created = bridge.createTask(snapshot(), [
        'zhihu', 'csdn', 'juejin', 'bilibili-article', 'toutiao', 'weibo-article',
      ]);
      const handoff = new URL(created.handoffUrl);
      const taskToken = new URLSearchParams(handoff.hash.slice(1)).get('taskToken')!;
      const pairToken = new URLSearchParams(handoff.hash.slice(1)).get('pairToken')!;
      const baseUrl = bridge.getConnectionState().baseUrl!;
      const extensionHeaders = { Origin: `chrome-extension://${CLIENT_ID}` };
      const pairResponse = await loopbackRequest(`${baseUrl}/v1/pair`, {
        method: 'POST',
        headers: { ...extensionHeaders, Authorization: `Bearer ${pairToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: CLIENT_ID, secret: SECRET }),
      });
      expect(pairResponse.status).toBe(200);
      expect(pairing).toMatchObject({ clientId: CLIENT_ID, secret: SECRET });

      const taskResponse = await loopbackRequest(`${baseUrl}/v1/tasks/${created.task.taskId}`, {
        headers: {
          ...extensionHeaders,
          Authorization: `Bearer ${taskToken}`,
          'X-WeSight-Client': CLIENT_ID,
          'X-WeSight-Platforms': 'zhihu,xiaohongshu',
          'X-WeSight-Version': '0.1.0',
          'X-WeSight-Capabilities': 'target-payloads-v1',
        },
      });
      const taskBody = await taskResponse.text();
      expect(taskResponse.status).toBe(200);
      expect(taskResponse.headers.get('x-wesight-signature'))
        .toBe(createHmac('sha256', SECRET).update(taskBody).digest('hex'));
      const parsedTask = JSON.parse(taskBody) as { behavior: { finalAction: string; groupTabs: boolean }; targets: string[] };
      expect(parsedTask.behavior).toEqual({ finalAction: 'manual', groupTabs: true });
      expect(parsedTask.targets).toHaveLength(6);
      expect(bridge.getConnectionState()).toMatchObject({
        extensionVersion: '0.1.0',
        supportedPlatforms: ['zhihu', 'xiaohongshu'],
        capabilities: ['target-payloads-v1'],
      });

      const openUrl = new URL(bridge.createOpenUrl(created.task.taskId, 'zhihu'));
      expect(openUrl.searchParams.get('openPlatform')).toBe('zhihu');
      expect(new URLSearchParams(openUrl.hash.slice(1)).get('taskToken')).toBe(taskToken);
      const openTaskUrl = new URL(bridge.createOpenTaskUrl(created.task.taskId));
      expect(openTaskUrl.searchParams.get('openTask')).toBe('1');
      expect(new URLSearchParams(openTaskUrl.hash.slice(1)).get('taskToken')).toBe(taskToken);

      const assetResponse = await loopbackRequest(`${baseUrl}/v1/tasks/${created.task.taskId}/assets/${'d'.repeat(64)}`, {
        headers: { ...extensionHeaders, Authorization: `Bearer ${taskToken}`, 'X-WeSight-Client': CLIENT_ID },
      });
      expect(new Uint8Array(await assetResponse.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));

      const event = JSON.stringify({
        protocolVersion: 1,
        taskId: created.task.taskId,
        platformId: 'weibo-article',
        status: 'ready',
        message: '内容已准备，请检查后发布',
        occurredAt: new Date().toISOString(),
      });
      const eventResponse = await loopbackRequest(`${baseUrl}/v1/tasks/${created.task.taskId}/events`, {
        method: 'POST',
        headers: {
          ...extensionHeaders,
          Authorization: `Bearer ${taskToken}`,
          'Content-Type': 'application/json',
          'X-WeSight-Client': CLIENT_ID,
          'X-WeSight-Signature': createHmac('sha256', SECRET).update(event).digest('hex'),
        },
        body: event,
      });
      expect(eventResponse.status).toBe(200);
      expect(bridge.getTask(created.task.taskId)?.platforms['weibo-article'].status).toBe('ready');

      const xiaohongshu = bridge.createTask(snapshot(), ['xiaohongshu']);
      expect(xiaohongshu.task.targets).toEqual(['xiaohongshu']);
      expect(xiaohongshu.task.platforms.xiaohongshu.status).toBe('queued');
      expect(xiaohongshu.task.platforms.zhihu.status).toBe('cancelled');
    } finally {
      await bridge.stop();
    }
  });

  test('rejects expired task access', async () => {
    let now = Date.now();
    const pairing: MultiPublishPairing = { clientId: CLIENT_ID, secret: SECRET, pairedAt: new Date(now).toISOString() };
    const bridge = new MultiPublishBridge({ getPairing: () => pairing, savePairing: async () => undefined, now: () => now });
    await bridge.start();
    try {
      const created = bridge.createTask(snapshot(), ['juejin']);
      const token = new URLSearchParams(new URL(created.handoffUrl).hash.slice(1)).get('taskToken')!;
      now += 10 * 60 * 1000 + 1;
      const response = await loopbackRequest(`${bridge.getConnectionState().baseUrl}/v1/tasks/${created.task.taskId}`, {
        headers: {
          Origin: `chrome-extension://${CLIENT_ID}`,
          Authorization: `Bearer ${token}`,
          'X-WeSight-Client': CLIENT_ID,
        },
      });
      expect(response.status).toBe(401);
    } finally {
      await bridge.stop();
    }
  });

  test('requires a capability-aware extension for platform-specific payloads', async () => {
    const pairing: MultiPublishPairing = {
      clientId: CLIENT_ID,
      secret: SECRET,
      pairedAt: new Date().toISOString(),
    };
    const bridge = new MultiPublishBridge({ getPairing: () => pairing, savePairing: async () => undefined });
    await bridge.start();
    try {
      const batch = snapshot();
      batch.targetPayloads = {
        xiaohongshu: {
          article: {
            title: '小红书标题',
            digest: '小红书摘要',
            markdown: '小红书正文',
            html: '<p>小红书正文</p>',
            coverAssetId: null,
            tags: ['小红书'],
          },
          assetIds: [],
        },
        'weibo-post': {
          article: {
            title: '微博标题',
            digest: '微博摘要',
            markdown: '微博正文',
            html: '<p>微博正文</p>',
            coverAssetId: null,
            tags: ['微博'],
          },
          assetIds: [],
        },
      };
      const created = bridge.createTask(batch, ['xiaohongshu', 'weibo-post']);
      const token = new URLSearchParams(new URL(created.handoffUrl).hash.slice(1)).get('taskToken')!;
      const requestHeaders = {
        Origin: `chrome-extension://${CLIENT_ID}`,
        Authorization: `Bearer ${token}`,
        'X-WeSight-Client': CLIENT_ID,
        'X-WeSight-Platforms': 'xiaohongshu,weibo-post',
        'X-WeSight-Version': '0.1.0',
      };
      const outdated = await loopbackRequest(
        `${bridge.getConnectionState().baseUrl}/v1/tasks/${created.task.taskId}`,
        { headers: requestHeaders },
      );
      expect(outdated.status).toBe(426);

      const current = await loopbackRequest(
        `${bridge.getConnectionState().baseUrl}/v1/tasks/${created.task.taskId}`,
        { headers: { ...requestHeaders, 'X-WeSight-Capabilities': 'target-payloads-v1' } },
      );
      expect(current.status).toBe(200);
      const manifest = JSON.parse(await current.text()) as { targetPayloads: Record<string, { article: { markdown: string } }> };
      expect(manifest.targetPayloads.xiaohongshu.article.markdown).toBe('小红书正文');
      expect(manifest.targetPayloads['weibo-post'].article.markdown).toBe('微博正文');
    } finally {
      await bridge.stop();
    }
  });
});
