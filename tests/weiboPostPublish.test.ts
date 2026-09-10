import { describe, expect, test, vi } from 'vitest';

import type { MultiPublishSnapshot } from '../src/multiPublish/types';
import {
  buildWeiboPostPublishSnapshot,
  validateWeiboPostPublishInput,
} from '../src/weiboPost/publish';
import type { WeiboPostImage } from '../src/weiboPost/types';

const source: MultiPublishSnapshot = {
  sourcePath: '文章/测试.md',
  contentHash: 'b'.repeat(64),
  title: '原文标题',
  digest: '',
  markdown: '原文正文',
  html: '<p>原文正文</p>',
  coverAssetId: null,
  tags: [],
  assets: [],
  warnings: [],
};

function image(index: number): WeiboPostImage {
  return {
    id: `image-${index}`,
    vaultPath: `.wesight/weibo/image-${index}.png`,
    fileName: `image-${index}.png`,
    mimeType: 'image/png',
    label: `配图 ${index}`,
    source: 'upload',
  };
}

describe('weibo post publish snapshot', () => {
  test('keeps image order, uses the first image as cover, and passes topics separately', async () => {
    const readBinary = vi.fn(async (vaultPath: string) => (
      new Uint8Array([Number(vaultPath.match(/(\d+)/)?.[1] ?? 0)]).buffer
    ));
    const result = await buildWeiboPostPublishSnapshot({
      source,
      copy: { body: '微博正文', topics: ['AI', '#世界模型#'], tone: 'opinion' },
      images: [image(3), image(1), image(2)],
      readBinary,
    });
    expect(result.assets.map(asset => asset.fileName)).toEqual(['image-3.png', 'image-1.png', 'image-2.png']);
    expect(result.coverAssetId).toBe(result.assets[0]?.id);
    expect(result.markdown).toBe('微博正文');
    expect(result.tags).toEqual(['AI', '世界模型']);
  });

  test('blocks missing copy, missing images, duplicates, and more than nine images', () => {
    const empty = validateWeiboPostPublishInput({ body: '', topics: [], tone: 'news' }, []);
    expect(empty.join(' ')).toContain('填写微博正文');
    expect(empty.join(' ')).toContain('至少选择 1 张');
    const duplicate = validateWeiboPostPublishInput(
      { body: '正文', topics: [], tone: 'news' },
      [image(1), image(1), ...Array.from({ length: 8 }, (_, index) => image(index + 2))],
    );
    expect(duplicate.join(' ')).toContain('最多支持 9 张');
    expect(duplicate.join(' ')).toContain('重复项');
    const overCombinedLimit = validateWeiboPostPublishInput(
      { body: '正'.repeat(1998), topics: ['AI'], tone: 'news' },
      [image(1)],
    );
    expect(overCombinedLimit.join(' ')).toContain('正文和话题合计');
  });

  test('reports unreadable image files', async () => {
    await expect(buildWeiboPostPublishSnapshot({
      source,
      copy: { body: '微博正文', topics: [], tone: 'casual' },
      images: [image(1)],
      readBinary: async () => { throw new Error('missing'); },
    })).rejects.toThrow('第 1 张微博配图读取失败');
  });
});
