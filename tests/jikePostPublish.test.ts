import { describe, expect, test, vi } from 'vitest';

import {
  buildJikePostPublishSnapshot,
  validateJikePostPublishInput,
} from '../src/jikePost/publish';
import type { JikePostImage } from '../src/jikePost/types';
import type { MultiPublishSnapshot } from '../src/multiPublish/types';

const source: MultiPublishSnapshot = {
  sourcePath: '文章/测试.md',
  contentHash: 'd'.repeat(64),
  title: '原文标题',
  digest: '',
  markdown: '原文正文',
  html: '<p>原文正文</p>',
  coverAssetId: null,
  tags: [],
  assets: [],
  warnings: [],
};

function image(index: number): JikePostImage {
  return {
    id: `image-${index}`,
    vaultPath: `.wesight/jike/image-${index}.png`,
    fileName: `image-${index}.png`,
    mimeType: 'image/png',
    label: `配图 ${index}`,
    source: 'upload',
  };
}

describe('jike post publish snapshot', () => {
  test('keeps image order and passes circle as a target option', async () => {
    const readBinary = vi.fn(async (vaultPath: string) => (
      new Uint8Array([Number(vaultPath.match(/(\d+)/)?.[1] ?? 0)]).buffer
    ));
    const result = await buildJikePostPublishSnapshot({
      source,
      copy: {
        body: '即刻动态正文',
        topics: ['AI', '#世界模型#'],
        tone: 'opinion',
        circle: 'AI 探索站',
      },
      images: [image(3), image(1), image(2)],
      readBinary,
    });
    expect(result.assets.map(asset => asset.fileName)).toEqual(['image-3.png', 'image-1.png', 'image-2.png']);
    expect(result.coverAssetId).toBe(result.assets[0]?.id);
    expect(result.markdown).toBe('即刻动态正文');
    expect(result.tags).toEqual(['AI', '世界模型']);
    expect(result.targetOptions?.jikePost?.circle).toBe('AI 探索站');
  });

  test('supports text-only posts and validates required fields', async () => {
    const result = await buildJikePostPublishSnapshot({
      source,
      copy: { body: '纯文字动态', topics: [], tone: 'casual', circle: '产品沉思录' },
      images: [],
      readBinary: vi.fn(),
    });
    expect(result.assets).toEqual([]);
    expect(result.coverAssetId).toBeNull();
    const errors = validateJikePostPublishInput(
      { body: '', topics: [], tone: 'experience', circle: '' },
      [],
    );
    expect(errors.join(' ')).toContain('填写即刻动态正文');
    expect(errors.join(' ')).toContain('即刻圈子');
  });

  test('reports unreadable images and duplicate items', async () => {
    expect(validateJikePostPublishInput(
      { body: '正文', topics: [], tone: 'experience', circle: 'AI 探索站' },
      [image(1), image(1)],
    ).join(' ')).toContain('重复项');
    await expect(buildJikePostPublishSnapshot({
      source,
      copy: { body: '正文', topics: [], tone: 'casual', circle: 'AI 探索站' },
      images: [image(1)],
      readBinary: async () => { throw new Error('missing'); },
    })).rejects.toThrow('第 1 张即刻配图读取失败');
  });
});
