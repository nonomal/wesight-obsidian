import {
  XHS_VISUAL_CATEGORY_IDS,
  getXhsCategory,
  getXhsStyle,
  type XhsStyleAlternative,
  type XhsStyleChoice,
  type XhsStyleRecommendation,
  type XhsVisualCategoryId,
} from './types';

interface ContentSignals {
  headings: number;
  orderedSteps: number;
  bullets: number;
  images: number;
  quotes: number;
  codeBlocks: number;
  tables: number;
  comparisonTerms: number;
  dataTerms: number;
  interfaceTerms: number;
  lifeTerms: number;
  storyTerms: number;
}

const CATEGORY_DEFAULT_STYLE: Record<XhsVisualCategoryId, string> = {
  typography: 'minimal',
  photography: 'lifestyle',
  collage: 'magazine',
  illustration: 'hand-drawn',
  infographic: 'method',
  screenshot: 'tutorial',
};

function matchCount(value: string, pattern: RegExp): number {
  return Array.from(value.matchAll(pattern)).length;
}

export function analyzeXhsContent(markdown: string): ContentSignals {
  return {
    headings: matchCount(markdown, /^#{1,4}\s+.+$/gm),
    orderedSteps: matchCount(markdown, /^\s*\d+[.)、]\s+.+$/gm),
    bullets: matchCount(markdown, /^\s*[-*+]\s+.+$/gm),
    images: matchCount(markdown, /!\[[^\]]*]\([^)]+\)|!\[\[[^\]]+]]/g),
    quotes: matchCount(markdown, /^\s*>\s+.+$/gm),
    codeBlocks: matchCount(markdown, /```[\s\S]*?```/g),
    tables: matchCount(markdown, /^\s*\|.+\|\s*$/gm),
    comparisonTerms: matchCount(markdown, /对比|前后|之前|现在|变化|优缺点|VS|vs\.?/g),
    dataTerms: matchCount(markdown, /\d+(?:\.\d+)?%|\d+[倍次]|数据|指标|增长|下降/g),
    interfaceTerms: matchCount(markdown, /截图|界面|按钮|菜单|设置|安装|部署|代码|命令|API|Prompt|插件/g),
    lifeTerms: matchCount(markdown, /日常|生活|旅行|穿搭|美食|探店|居家|好物|开箱|亲测|体验/g),
    storyTerms: matchCount(markdown, /故事|经历|成长|情绪|复盘|转折|第一次|后来|终于|感受/g),
  };
}

function recommendedStyle(categoryId: XhsVisualCategoryId, signals: ContentSignals): string {
  if (categoryId === 'infographic') {
    if (signals.comparisonTerms >= 2) return 'comparison';
    if (signals.orderedSteps >= 3) return 'steps';
    if (signals.dataTerms >= 3) return 'data-cards';
    if (signals.headings >= 5) return 'flowchart';
    return 'method';
  }
  if (categoryId === 'screenshot') return signals.codeBlocks ? 'code' : 'tutorial';
  if (categoryId === 'photography') return signals.lifeTerms >= 3 ? 'lifestyle' : 'product';
  if (categoryId === 'collage') return signals.images >= 6 ? 'grid' : 'magazine';
  if (categoryId === 'illustration') return signals.storyTerms >= 3 ? 'comic' : 'hand-drawn';
  if (signals.codeBlocks || signals.interfaceTerms >= 3) return 'tech';
  if (signals.quotes >= 2) return 'handwritten';
  return CATEGORY_DEFAULT_STYLE[categoryId];
}

function recommendationReasons(categoryId: XhsVisualCategoryId, signals: ContentSignals): string[] {
  const reasons: string[] = [];
  if (signals.orderedSteps) reasons.push(`识别到 ${signals.orderedSteps} 个步骤`);
  if (signals.bullets) reasons.push(`包含 ${signals.bullets} 个清单项`);
  if (signals.comparisonTerms) reasons.push(`出现 ${signals.comparisonTerms} 处对比表达`);
  if (signals.interfaceTerms) reasons.push(`包含 ${signals.interfaceTerms} 处界面或工具描述`);
  if (signals.images) reasons.push(`原文包含 ${signals.images} 张图片`);
  if (signals.storyTerms) reasons.push(`内容包含 ${signals.storyTerms} 处叙事线索`);
  if (signals.dataTerms) reasons.push(`包含 ${signals.dataTerms} 处数据表达`);
  if (!reasons.length) reasons.push(`${getXhsCategory(categoryId).label}适合当前正文密度`);
  return reasons.slice(0, 3);
}

export function recommendXhsVisualStyle(markdown: string): XhsStyleRecommendation {
  const signals = analyzeXhsContent(markdown);
  const scores: Record<XhsVisualCategoryId, number> = {
    typography: 20 + signals.headings * 2 + signals.quotes * 4,
    photography: 8 + signals.images * 3 + signals.lifeTerms * 7,
    collage: 6 + signals.images * 5 + signals.lifeTerms * 2,
    illustration: 7 + signals.storyTerms * 6 + signals.quotes * 2,
    infographic: 12
      + signals.headings * 3
      + signals.orderedSteps * 7
      + signals.bullets * 2
      + signals.tables * 5
      + signals.comparisonTerms * 4
      + signals.dataTerms * 3,
    screenshot: 8
      + signals.interfaceTerms * 5
      + signals.codeBlocks * 10
      + signals.images * 2,
  };
  const ranked = XHS_VISUAL_CATEGORY_IDS
    .map(categoryId => ({ categoryId, score: scores[categoryId] }))
    .sort((left, right) => right.score - left.score);
  const top = ranked[0];
  const gap = Math.max(0, top.score - ranked[1].score);
  const confidence = Math.min(96, Math.max(72, 78 + gap));
  const styleId = recommendedStyle(top.categoryId, signals);
  const alternatives: XhsStyleAlternative[] = ranked.slice(1, 3).map((item, index) => ({
    categoryId: item.categoryId,
    styleId: recommendedStyle(item.categoryId, signals),
    confidence: Math.max(60, confidence - 7 - index * 7),
  }));
  return {
    categoryId: top.categoryId,
    styleId,
    confidence,
    reasons: recommendationReasons(top.categoryId, signals),
    alternatives,
    source: 'local',
  };
}

export function buildXhsRecommendationPrompt(markdown: string): string {
  const article = markdown.length > 14_000 ? `${markdown.slice(0, 14_000)}\n（后文已省略）` : markdown;
  const categories = XHS_VISUAL_CATEGORY_IDS.map(categoryId => {
    const category = getXhsCategory(categoryId);
    return `${categoryId}=${category.label}；styles=${category.styles.map(style => `${style.id}:${style.label}`).join(',')}`;
  });
  return [
    '分析下面文章的结构和文案内容，推荐最适合的小红书图片视觉大类与二级样式。',
    '仅返回 JSON，不要使用 Markdown 代码围栏。',
    'JSON 格式：{"categoryId":"infographic","styleId":"steps","confidence":92,"reasons":["原因1","原因2"],"alternatives":[{"categoryId":"screenshot","styleId":"tutorial","confidence":85}]}',
    '可选分类与样式：',
    ...categories,
    '要求：推荐必须基于文章结构和文案内容；confidence 为 60 到 98 的整数；备选最多 2 个。',
    '===== 原文 START =====',
    article,
    '===== 原文 END =====',
  ].join('\n');
}

function validChoice(categoryId: unknown, styleId: unknown): XhsStyleChoice | null {
  if (typeof categoryId !== 'string' || typeof styleId !== 'string') return null;
  if (!XHS_VISUAL_CATEGORY_IDS.includes(categoryId as XhsVisualCategoryId)) return null;
  const category = getXhsCategory(categoryId as XhsVisualCategoryId);
  if (!category.styles.some(style => style.id === styleId)) return null;
  return { categoryId: categoryId as XhsVisualCategoryId, styleId };
}

export function parseXhsRecommendationOutput(output: string): XhsStyleRecommendation | null {
  const cleaned = output.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
    const choice = validChoice(parsed.categoryId, parsed.styleId);
    if (!choice) return null;
    const confidence = typeof parsed.confidence === 'number'
      ? Math.max(60, Math.min(98, Math.round(parsed.confidence)))
      : 80;
    const reasons = Array.isArray(parsed.reasons)
      ? parsed.reasons.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).slice(0, 3)
      : [];
    const alternatives: XhsStyleAlternative[] = [];
    if (Array.isArray(parsed.alternatives)) {
      for (const value of parsed.alternatives.slice(0, 2)) {
        if (!value || typeof value !== 'object') continue;
        const item = value as Record<string, unknown>;
        const alternative = validChoice(item.categoryId, item.styleId);
        if (!alternative || alternative.categoryId === choice.categoryId) continue;
        alternatives.push({
          ...alternative,
          confidence: typeof item.confidence === 'number'
            ? Math.max(50, Math.min(97, Math.round(item.confidence)))
            : Math.max(50, confidence - 8 - alternatives.length * 6),
        });
      }
    }
    return {
      ...choice,
      confidence,
      reasons: reasons.length ? reasons : [`${getXhsStyle(choice.categoryId, choice.styleId).label}贴合文章结构`],
      alternatives,
      source: 'engine',
    };
  } catch {
    return null;
  }
}
