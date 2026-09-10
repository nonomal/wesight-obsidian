import { describe, expect, test, vi } from 'vitest';

import type { MultiPublishSnapshot } from '../src/multiPublish/types';
import {
  quickTransformSourceImages,
  readSnapshotAssetReference,
  snapshotAssetId,
} from '../src/quickTransform/images';

function snapshot(): MultiPublishSnapshot {
  return {
    sourcePath: '文章/远程图片.md',
    contentHash: 'content-hash',
    title: '远程图片',
    digest: '',
    markdown: '正文',
    html: '<p>正文</p>',
    coverAssetId: null,
    tags: [],
    assets: [
      {
        id: 'remote-hash',
        fileName: 'remote.png',
        mimeType: 'image/png',
        size: 3,
        sha256: 'a'.repeat(64),
        body: new Uint8Array([1, 2, 3]).buffer,
        previewUrl: 'https://cdn.example.com/remote.png',
      },
      {
        id: 'local-hash',
        fileName: 'local.png',
        mimeType: 'image/png',
        size: 2,
        sha256: 'b'.repeat(64),
        body: new Uint8Array([4, 5]).buffer,
        vaultPath: 'attachments/local.png',
        previewUrl: 'app://vault/attachments/local.png',
      },
    ],
    warnings: [],
  };
}

describe('quick transform article images', () => {
  test('keeps remote and local article images available for selection', () => {
    const images = quickTransformSourceImages(snapshot(), path => `resource://${path}`);

    expect(images).toHaveLength(2);
    expect(images[0]).toMatchObject({
      fileName: 'remote.png',
      previewUrl: 'https://cdn.example.com/remote.png',
    });
    expect(snapshotAssetId(images[0].vaultPath)).toBe('remote-hash');
    expect(images[1]).toMatchObject({
      vaultPath: 'attachments/local.png',
      previewUrl: 'app://vault/attachments/local.png',
    });
  });

  test('reads downloaded remote bytes from the snapshot and local bytes from the Vault', async () => {
    const source = snapshot();
    const images = quickTransformSourceImages(source, path => `resource://${path}`);
    const readVaultBinary = vi.fn(async () => new Uint8Array([9]).buffer);

    const remote = await readSnapshotAssetReference(source, images[0].vaultPath, readVaultBinary);
    expect(Array.from(new Uint8Array(remote))).toEqual([1, 2, 3]);
    expect(readVaultBinary).not.toHaveBeenCalled();

    const local = await readSnapshotAssetReference(source, images[1].vaultPath, readVaultBinary);
    expect(Array.from(new Uint8Array(local))).toEqual([9]);
    expect(readVaultBinary).toHaveBeenCalledWith('attachments/local.png');
  });
});
