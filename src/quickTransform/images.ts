import type { MultiPublishAsset, MultiPublishSnapshot } from '../multiPublish/types';

const SNAPSHOT_ASSET_PREFIX = 'wesight-snapshot-asset://';

export interface QuickTransformSourceImage {
  id: string;
  vaultPath: string;
  previewUrl: string;
  fileName: string;
  mimeType: string;
  label: string;
  size: number;
}

export function snapshotAssetReference(assetId: string): string {
  return `${SNAPSHOT_ASSET_PREFIX}${assetId}`;
}

export function snapshotAssetId(reference: string): string | null {
  if (!reference.startsWith(SNAPSHOT_ASSET_PREFIX)) return null;
  const assetId = reference.slice(SNAPSHOT_ASSET_PREFIX.length).trim();
  return assetId || null;
}

function assetReference(asset: MultiPublishAsset): string {
  return asset.vaultPath?.trim() || snapshotAssetReference(asset.id);
}

export function quickTransformSourceImages(
  snapshot: MultiPublishSnapshot,
  getResourcePath: (vaultPath: string) => string,
): QuickTransformSourceImage[] {
  return snapshot.assets
    .filter(asset => asset.mimeType.startsWith('image/'))
    .map((asset, index) => ({
      id: `article:${asset.id}`,
      vaultPath: assetReference(asset),
      previewUrl: asset.previewUrl?.trim()
        || (asset.vaultPath ? getResourcePath(asset.vaultPath) : ''),
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      label: `原文图片 ${index + 1}`,
      size: asset.size,
    }))
    .filter(image => Boolean(image.previewUrl));
}

export async function readSnapshotAssetReference(
  snapshot: MultiPublishSnapshot,
  reference: string,
  readVaultBinary: (vaultPath: string) => Promise<ArrayBuffer>,
): Promise<ArrayBuffer> {
  const assetId = snapshotAssetId(reference);
  if (!assetId) return readVaultBinary(reference);
  const asset = snapshot.assets.find(candidate => candidate.id === assetId);
  if (!asset) throw new Error('原文图片已经失效，请重新打开当前文章');
  return asset.body;
}
