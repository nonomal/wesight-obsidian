import { describe, expect, test } from 'vitest';

import {
  buildJikePostCopyPrompt,
  buildJikePostText,
  clampJikePostBody,
  createInitialJikePostCopy,
  JIKE_POST_BODY_LIMIT,
  normalizeJikeTopics,
  parseJikePostCopyOutput,
} from '../src/jikePost/copy';
import type { MultiPublishSnapshot } from '../src/multiPublish/types';

const snapshot: MultiPublishSnapshot = {
  sourcePath: '文章/测试.md',
  contentHash: 'c'.repeat(64),
  title: '世界模型走出概念',
  digest: '',
  markdown: '# 新变化\n\n世界模型开始进入互动娱乐。',
  html: '<h1>新变化</h1>',
  coverAssetId: null,
  tags: ['AI', '#世界模型#'],
  assets: [],
  warnings: [],
};

describe('jike post copy', () => {
  test('creates an editable draft with a default circle', () => {
    expect(createInitialJikePostCopy(snapshot)).toMatchObject({
      tone: 'opinion',
      circle: 'AI 探索站',
      topics: ['AI', '世界模型'],
    });
  });

  test('builds a source-grounded Jike prompt', () => {
    const prompt = buildJikePostCopyPrompt(snapshot, 'experience', '保留三个具体场景');
    expect(prompt).toContain('一句判断、两个依据、一个开放问题');
    expect(prompt).toContain('保留三个具体场景');
    expect(prompt).toContain(snapshot.markdown);
  });

  test('parses JSON and clamps body, topics, and circle', () => {
    const output = JSON.stringify({
      body: '甲'.repeat(JIKE_POST_BODY_LIMIT + 20),
      topics: ['#AI#', 'AI', '互动 娱乐'],
      circle: '一个很长但仍然可以正常截断并保存的即刻圈子名称用于测试',
    });
    const parsed = parseJikePostCopyOutput(output, 'casual');
    expect(Array.from(buildJikePostText(parsed?.body ?? '', parsed?.topics ?? [])).length)
      .toBeLessThanOrEqual(JIKE_POST_BODY_LIMIT);
    expect(parsed?.topics).toEqual(['AI', '互动娱乐']);
    expect(Array.from(parsed?.circle ?? '').length).toBeLessThanOrEqual(30);
    expect(parsed?.tone).toBe('casual');
  });

  test('preserves intentional line breaks and renders topics', () => {
    expect(clampJikePostBody('第一段\n\n第二段 ')).toBe('第一段\n\n第二段 ');
    expect(buildJikePostText('正文 ', normalizeJikeTopics(['#AI#', '世界 模型'])))
      .toBe('正文\n\n#AI# #世界模型#');
  });
});
