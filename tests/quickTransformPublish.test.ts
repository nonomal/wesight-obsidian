import { describe, expect, test } from 'vitest';

import type { MultiPublishSnapshot } from '../src/multiPublish/types';
import {
  buildQuickPublishBatchSnapshot,
  isQuickPublishTaskReady,
  QUICK_PUBLISH_CAPABILITY,
} from '../src/quickTransform/publish';

function snapshot(input: {
  title: string;
  markdown: string;
  assetId: string;
  sha256?: string;
  circle?: string;
}): MultiPublishSnapshot {
  const sha256 = input.sha256 ?? input.assetId.padEnd(64, '0').slice(0, 64);
  return {
    sourcePath: '文章/测试.md',
    contentHash: `${input.title}:${input.markdown}`,
    title: input.title,
    digest: input.markdown,
    markdown: input.markdown,
    html: `<p>${input.markdown}</p>`,
    coverAssetId: input.assetId,
    tags: [input.title],
    assets: [{
      id: input.assetId,
      fileName: `${input.assetId}.png`,
      mimeType: 'image/png',
      size: 3,
      sha256,
      body: new Uint8Array([1, 2, 3]).buffer,
    }],
    warnings: [],
    ...(input.circle ? { targetOptions: { jikePost: { circle: input.circle } } } : {}),
  };
}

describe('quick transform publish batch', () => {
  test('allows a fresh publish only after every selected platform is ready', () => {
    const task = {
      targets: ['xiaohongshu', 'weibo-post', 'jike-post'] as const,
      platforms: {
        xiaohongshu: { status: 'ready' as const },
        'weibo-post': { status: 'ready' as const },
        'jike-post': { status: 'ready' as const },
      },
    };

    expect(isQuickPublishTaskReady(task)).toBe(true);
    expect(isQuickPublishTaskReady({
      ...task,
      platforms: {
        ...task.platforms,
        'jike-post': { status: 'filling' },
      },
    })).toBe(false);
    expect(isQuickPublishTaskReady(null)).toBe(false);
  });

  test('keeps platform copy isolated and de-duplicates shared images', () => {
    const sharedHash = 'a'.repeat(64);
    const xiaohongshu = snapshot({ title: '小红书标题', markdown: '小红书正文', assetId: 'xhs-image', sha256: sharedHash });
    const weibo = snapshot({ title: '微博标题', markdown: '微博正文', assetId: 'weibo-image', sha256: sharedHash });
    const jike = snapshot({ title: '即刻标题', markdown: '即刻正文', assetId: 'jike-image', sha256: sharedHash, circle: 'AI 探索站' });

    const result = buildQuickPublishBatchSnapshot(
      ['xiaohongshu', 'weibo-post', 'jike-post'],
      { xiaohongshu, 'weibo-post': weibo, 'jike-post': jike },
    );

    expect(QUICK_PUBLISH_CAPABILITY).toBe('target-payloads-v1');
    expect(result.assets).toHaveLength(1);
    expect(result.targetPayloads?.xiaohongshu?.article.markdown).toBe('小红书正文');
    expect(result.targetPayloads?.['weibo-post']?.article.markdown).toBe('微博正文');
    expect(result.targetPayloads?.['jike-post']?.article.markdown).toBe('即刻正文');
    expect(result.targetPayloads?.['jike-post']?.targetOptions?.jikePost?.circle).toBe('AI 探索站');
    expect(result.targetPayloads?.xiaohongshu?.assetIds).toEqual(['xhs-image']);
    expect(result.targetPayloads?.['weibo-post']?.assetIds).toEqual(['xhs-image']);
    expect(result.targetPayloads?.['jike-post']?.article.coverAssetId).toBe('xhs-image');
  });

  test('requires generated content for every selected platform', () => {
    expect(() => buildQuickPublishBatchSnapshot(
      ['xiaohongshu', 'weibo-post'],
      { xiaohongshu: snapshot({ title: '小红书', markdown: '正文', assetId: 'image' }) },
    )).toThrow('weibo-post 内容还没有生成完成');
  });
});
