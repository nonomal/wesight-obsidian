import { describe, expect, test } from 'vitest';

import {
  analyzeXhsContent,
  parseXhsRecommendationOutput,
  recommendXhsVisualStyle,
} from '../src/xiaohongshu/recommendation';

describe('Xiaohongshu visual style recommendation', () => {
  test('recommends information graphics for structured workflows', () => {
    const markdown = [
      '# 为什么重做',
      '- 信息分散',
      '- 配图不统一',
      '# 新工作流',
      '1. 选题',
      '2. 写作',
      '3. 配图',
      '4. 审核',
      '5. 发布',
      '之前需要多个工具，现在可以串联起来。',
    ].join('\n');

    const recommendation = recommendXhsVisualStyle(markdown);

    expect(recommendation.categoryId).toBe('infographic');
    expect(recommendation.styleId).toBe('comparison');
    expect(recommendation.reasons.join('')).toContain('5 个步骤');
  });

  test('recommends screenshot enhancement for software tutorials', () => {
    const markdown = [
      '# 插件安装教程',
      '打开设置界面，点击插件按钮。',
      '```bash',
      'npm run build',
      '```',
      '然后在菜单里选择 API 配置。',
    ].join('\n');

    const recommendation = recommendXhsVisualStyle(markdown);

    expect(recommendation.categoryId).toBe('screenshot');
    expect(recommendation.styleId).toBe('code');
  });

  test('detects article signals used by the recommendation', () => {
    const signals = analyzeXhsContent('# 标题\n\n> 金句\n\n![图](a.png)\n\n提升 30%');

    expect(signals.headings).toBe(1);
    expect(signals.quotes).toBe(1);
    expect(signals.images).toBe(1);
    expect(signals.dataTerms).toBeGreaterThan(0);
  });

  test('parses a validated engine recommendation', () => {
    const recommendation = parseXhsRecommendationOutput(JSON.stringify({
      categoryId: 'infographic',
      styleId: 'steps',
      confidence: 92,
      reasons: ['包含多步流程', '存在清单结构'],
      alternatives: [
        { categoryId: 'screenshot', styleId: 'tutorial', confidence: 84 },
        { categoryId: 'typography', styleId: 'tech', confidence: 76 },
      ],
    }));

    expect(recommendation).toEqual({
      categoryId: 'infographic',
      styleId: 'steps',
      confidence: 92,
      reasons: ['包含多步流程', '存在清单结构'],
      alternatives: [
        { categoryId: 'screenshot', styleId: 'tutorial', confidence: 84 },
        { categoryId: 'typography', styleId: 'tech', confidence: 76 },
      ],
      source: 'engine',
    });
  });

  test('rejects unknown categories and styles', () => {
    expect(parseXhsRecommendationOutput('{"categoryId":"unknown","styleId":"steps"}')).toBeNull();
    expect(parseXhsRecommendationOutput('{"categoryId":"infographic","styleId":"unknown"}')).toBeNull();
  });
});
