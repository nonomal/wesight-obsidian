import { describe, expect, test } from 'vitest';

import type { MultiPublishSnapshot } from '../src/multiPublish/types';
import {
  buildWeiboPostCopyPrompt,
  buildWeiboPostText,
  clampWeiboPostBody,
  createInitialWeiboPostCopy,
  normalizeWeiboTopics,
  parseWeiboPostCopyOutput,
  WEIBO_POST_TOPICS_CHAR_LIMIT,
  WEIBO_POST_BODY_LIMIT,
  weiboPostPreview,
} from '../src/weiboPost/copy';

const snapshot: MultiPublishSnapshot = {
  sourcePath: '文章/测试.md',
  contentHash: 'a'.repeat(64),
  title: '世界模型走出概念',
  digest: '',
  markdown: '# 新变化\n\n世界模型开始进入互动娱乐。',
  html: '<h1>新变化</h1>',
  coverAssetId: null,
  tags: ['AI', '#世界模型#'],
  assets: [],
  warnings: [],
};

describe('weibo post copy', () => {
  test('creates an editable draft and normalizes topics', () => {
    expect(createInitialWeiboPostCopy(snapshot)).toMatchObject({
      tone: 'opinion',
      topics: ['AI', '世界模型'],
    });
    expect(normalizeWeiboTopics(['#AI#', 'AI', ' 世界 模型 '])).toEqual(['AI', '世界模型']);
  });

  test('builds a source-grounded prompt for each tone', () => {
    const prompt = buildWeiboPostCopyPrompt(snapshot, 'news', '更像行业简讯');
    expect(prompt).toContain('当前语气');
    expect(prompt).toContain('更像行业简讯');
    expect(prompt).toContain(snapshot.markdown);
  });

  test('parses JSON, keeps the requested tone, and clamps the body', () => {
    const output = JSON.stringify({ body: '甲'.repeat(WEIBO_POST_BODY_LIMIT + 10), topics: ['AI'] });
    const parsed = parseWeiboPostCopyOutput(output, 'casual');
    expect(Array.from(buildWeiboPostText(parsed?.body ?? '', parsed?.topics ?? [])).length)
      .toBeLessThanOrEqual(WEIBO_POST_BODY_LIMIT);
    expect(parsed?.tone).toBe('casual');
    expect(weiboPostPreview(parsed?.body ?? '')).toHaveLength(140);
  });

  test('preserves intentional spaces and line breaks while editing', () => {
    expect(clampWeiboPostBody('第一段\n\n第二段 ')).toBe('第一段\n\n第二段 ');
    expect(buildWeiboPostText('正文 ', ['#AI#', '世界 模型'])).toBe('正文\n\n#AI# #世界模型#');
  });

  test('keeps rendered topics within the compact 60-character editor budget', () => {
    const topics = normalizeWeiboTopics([
      '这是一个超过二十个字符会被截断的微博话题标题',
      '世界模型',
      '互动娱乐',
      '数字人',
      '额外话题不会让总长度越界',
    ]);
    const rendered = topics.map(topic => `#${topic}#`).join(' ');
    expect(Array.from(rendered).length).toBeLessThanOrEqual(WEIBO_POST_TOPICS_CHAR_LIMIT);
    expect(Array.from(topics[0] ?? '').length).toBeLessThanOrEqual(20);
  });
});
