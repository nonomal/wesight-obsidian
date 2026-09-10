import { createHash } from 'crypto';

import type {
  MultiPlatformId,
  MultiPlatformTaskStatus,
  MultiPublishArticleV1,
  MultiPublishAsset,
  MultiPublishSnapshot,
  MultiPublishTargetPayloadV1,
} from '../multiPublish/types';
import type { QuickTransformPlatformId } from './selection';

export const QUICK_PUBLISH_CAPABILITY = 'target-payloads-v1';

export type QuickPublishSnapshotMap = Partial<Record<QuickTransformPlatformId, MultiPublishSnapshot>>;

type QuickPublishTaskStatus = {
  targets: readonly MultiPlatformId[];
  platforms: Partial<Record<MultiPlatformId, { status: MultiPlatformTaskStatus }>>;
};

export function isQuickPublishTaskReady(task: QuickPublishTaskStatus | null): boolean {
  return Boolean(
    task?.targets.length
    && task.targets.every(platformId => task.platforms[platformId]?.status === 'ready'),
  );
}

function articleFromSnapshot(snapshot: MultiPublishSnapshot): MultiPublishArticleV1 {
  return {
    title: snapshot.title,
    digest: snapshot.digest,
    markdown: snapshot.markdown,
    html: snapshot.html,
    coverAssetId: snapshot.coverAssetId,
    tags: snapshot.tags,
    ...(snapshot.original === undefined ? {} : { original: snapshot.original }),
  };
}

function assetIdentity(asset: MultiPublishAsset): string {
  return `${asset.sha256}:${asset.mimeType}:${asset.size}`;
}

export function buildQuickPublishBatchSnapshot(
  targets: QuickTransformPlatformId[],
  snapshots: QuickPublishSnapshotMap,
): MultiPublishSnapshot {
  const uniqueTargets = Array.from(new Set(targets));
  if (!uniqueTargets.length) throw new Error('请选择至少一个发布平台');
  const firstSnapshot = snapshots[uniqueTargets[0]];
  if (!firstSnapshot) throw new Error('平台内容还没有生成完成');

  const canonicalAssets = new Map<string, MultiPublishAsset>();
  const targetPayloads: Partial<Record<MultiPlatformId, MultiPublishTargetPayloadV1>> = {};
  const sourceHashes: string[] = [];
  const warnings = new Set<string>();

  for (const platformId of uniqueTargets) {
    const snapshot = snapshots[platformId];
    if (!snapshot) throw new Error(`${platformId} 内容还没有生成完成`);
    sourceHashes.push(`${platformId}:${snapshot.contentHash}`);
    snapshot.warnings.forEach(warning => warnings.add(warning));

    const remappedIds = new Map<string, string>();
    for (const asset of snapshot.assets) {
      const identity = assetIdentity(asset);
      const canonical = canonicalAssets.get(identity);
      if (canonical) {
        remappedIds.set(asset.id, canonical.id);
      } else {
        canonicalAssets.set(identity, asset);
        remappedIds.set(asset.id, asset.id);
      }
    }

    const article = articleFromSnapshot(snapshot);
    if (article.coverAssetId) article.coverAssetId = remappedIds.get(article.coverAssetId) ?? null;
    targetPayloads[platformId] = {
      article,
      assetIds: snapshot.assets.map(asset => remappedIds.get(asset.id) ?? asset.id),
      ...(snapshot.targetOptions ? { targetOptions: snapshot.targetOptions } : {}),
    };
  }

  const contentHash = createHash('sha256').update(sourceHashes.join('|')).digest('hex');
  return {
    ...firstSnapshot,
    contentHash,
    assets: Array.from(canonicalAssets.values()),
    warnings: Array.from(warnings),
    targetPayloads,
  };
}
