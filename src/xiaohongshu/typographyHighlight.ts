export interface XhsTypographyHighlightSegment {
  lineIndex: number;
  prefix: string;
  text: string;
}

export interface XhsTypographyHighlightRange {
  text: string;
  start: number;
  end: number;
}

type HighlightCandidateKind = 'entity' | 'numeric' | 'product' | 'result' | 'topic';

interface HighlightCandidate extends XhsTypographyHighlightRange {
  kind: HighlightCandidateKind;
  score: number;
  signalCount: number;
  compactLength: number;
}

interface TextSpan {
  text: string;
  start: number;
  end: number;
}

const MIN_HIGHLIGHT_SCORE = 76;
const MIN_VISUAL_HAN_GRAPHEMES = 3;
const MAX_VISUAL_HAN_GRAPHEMES = 8;
const EMPTY_PREVIEW_TEXT = '图片文字会在这里按照所选样式排版。';
const CLAUSE_PATTERN = /[^\n\r。！？!?；;，,、：:（）()【】[\]“”"'《》「」『』<>|/\\]+/gu;
const QUOTED_PATTERN = /[《“「『【[]([^》”」』】\]]{2,16})[》”」』】\]]/gu;
const PRODUCT_PATTERN = /(^|[^A-Za-z0-9])([A-Za-z][A-Za-z0-9._#-]*(?:(?:\s+|\s*[+/&]\s*)(?:[A-Za-z][A-Za-z0-9._#-]*|[0-9]+(?:\.[0-9]+)+)){0,3})(?=$|[^A-Za-z0-9])/gu;
const NUMBER_WITH_UNIT_PATTERN = /[0-9０-９一二三四五六七八九十百千]+(?:[.．][0-9０-９]+)?\s*(?:[%％]|倍|分钟|小时|秒|天|周|个月|元|万|亿|k|K|条|步|种|张|页|款|项|次)/gu;
const NUMERIC_RESULT_NOUN_PATTERN = /^\s*(?:总)?(?:访问量|访问|浏览量|浏览|阅读量|阅读|播放量|播放|下载量|下载|曝光量|曝光|用户|粉丝|收藏|点赞|评论|转发|订单|销量|成交|收入|营收|线索|页面|文章|图片|内容)/u;
const UNCERTAIN_DATA_PATTERN = /朋友说|有人说|听说|据说|大约|可能|预计|估计|也许|或许|差不多|约(?=\s*[0-9０-９一二三四五六七八九十百千])/gu;
const NUMERIC_RESULT_BOUNDARIES = [
  '已经',
  '正在',
  '达到',
  '突破',
  '提升',
  '提高',
  '增长',
  '下降',
  '减少',
  '降低',
  '完成',
  '实现',
  '上线',
  '发布',
  '推出',
  '回来',
  '成为',
  '超过',
  '不足',
  '左右',
  '以上',
  '以下',
  '之后',
  '以后',
  '以前',
  '写完',
  '做完',
  '后',
  '前',
  '内',
  '外',
  '中',
  '了',
];
const LOCATION_END_PATTERN = /(?:特别行政区|自治区|会展中心|艺术中心|博物馆|美术馆|图书馆|咖啡馆|纪念馆|体育馆|展览馆|大剧院|街道|大道|公园|广场|书店|机场|车站|剧院|剧场|省|市|区|县|镇|村|街|路|巷|山|湖|湾|岛|谷|滩|港|园|城|宫|寺|塔|桥|馆)$/u;
const ADMINISTRATIVE_LOCATION_NAMES = [
  '哈尔滨',
  '呼和浩特',
  '乌鲁木齐',
  '石家庄',
  '黑龙江',
  '内蒙古',
  '北京',
  '上海',
  '天津',
  '重庆',
  '河北',
  '山西',
  '辽宁',
  '吉林',
  '江苏',
  '浙江',
  '安徽',
  '福建',
  '江西',
  '山东',
  '河南',
  '湖北',
  '湖南',
  '广东',
  '海南',
  '四川',
  '贵州',
  '云南',
  '陕西',
  '甘肃',
  '青海',
  '台湾',
  '广西',
  '西藏',
  '宁夏',
  '新疆',
  '沈阳',
  '长春',
  '南京',
  '杭州',
  '合肥',
  '福州',
  '南昌',
  '济南',
  '郑州',
  '武汉',
  '长沙',
  '广州',
  '深圳',
  '海口',
  '成都',
  '贵阳',
  '昆明',
  '西安',
  '兰州',
  '西宁',
  '南宁',
  '拉萨',
  '银川',
  '苏州',
  '厦门',
  '青岛',
  '宁波',
  '大连',
  '香港',
  '澳门',
  '台北',
].sort((left, right) => right.length - left.length);
const LOCATION_ACTION_BOUNDARIES = [
  '正式上线',
  '正式发布',
  '回来',
  '上线',
  '发布',
  '推出',
  '更新',
  '开放',
  '回归',
  '宣布',
  '举行',
];
const MAX_PRODUCT_TOPIC_GRAPHEMES = 18;
const TOPIC_HEAD_WEIGHTS: Array<{ term: string; score: number }> = [
  { term: '工作流', score: 12 },
  { term: '知识库', score: 11 },
  { term: '提示词', score: 11 },
  { term: '智能体', score: 11 },
  { term: '浏览器', score: 10 },
  { term: '编辑器', score: 10 },
  { term: '数据库', score: 10 },
  { term: '关键词', score: 10 },
  { term: '实验室', score: 10 },
  { term: '工作室', score: 10 },
  { term: '助手', score: 9 },
  { term: '引擎', score: 9 },
  { term: '框架', score: 9 },
  { term: '应用', score: 8 },
  { term: '计划', score: 8 },
  { term: '社区', score: 8 },
  { term: '教程', score: 8 },
  { term: '指南', score: 8 },
  { term: '方法', score: 8 },
  { term: '技巧', score: 8 },
  { term: '模型', score: 8 },
  { term: '工具', score: 8 },
  { term: '插件', score: 8 },
  { term: '模板', score: 8 },
  { term: '平台', score: 8 },
  { term: '系统', score: 8 },
  { term: '项目', score: 8 },
  { term: '方案', score: 8 },
  { term: '流程', score: 8 },
  { term: '排版', score: 8 },
  { term: '图片', score: 8 },
  { term: '文案', score: 8 },
  { term: '设计', score: 8 },
  { term: '库', score: 8 },
];
const ANNOUNCED_NAME_SUFFIXES = [
  '实验室',
  '工作室',
  '俱乐部',
  '研究院',
  '研究所',
  '写作助手',
  '方舟',
  '计划',
  '助手',
  '引擎',
  '社区',
  '书屋',
  '品牌',
  '团队',
  '联盟',
  '中心',
  '平台',
  '模型',
  '系统',
  '项目',
  '框架',
  '工具',
  '应用',
  '插件',
  '模板',
  '书社',
  '工坊',
];
const ANNOUNCED_NAME_ACTION_PATTERN = /(?:(?:正式|重新|刚刚|今日|今天))?(?:上线|发布|推出|开放|回归)(?:了|啦|中)?$/u;
const GENERIC_NAME_PARTS = [
  '全新',
  '最新',
  '智能',
  '开源',
  '本地',
  '自动',
  '功能',
  '内容',
  '产品',
  '平台',
  '模型',
  '系统',
  '项目',
  '工具',
  '应用',
  '插件',
  '模板',
  '助手',
  '引擎',
  '框架',
  '社区',
  '计划',
];
const LOCATION_CONTEXT_TERMS = [
  '坐落在',
  '这里是',
  '介绍',
  '位于',
  '来到',
  '去了',
  '打卡',
  '游览',
  '探访',
  '走进',
  '路过',
  '逛了',
  '这是',
  '在',
  '去',
];
const TRAILING_ACTION_PATTERN = /(?:(?:正式|重新|刚刚|今日|今天))?(?:回来|上线|发布|推出|更新|开放|回归)(?:了|啦|中)?$/u;
const DATE_ONLY_PATTERN = /^[0-9０-９]{4}年[0-9０-９]{1,2}月[0-9０-９]{1,2}日(?:发布|更新|上线)?(?:了)?$/u;
const ORDINAL_PATTERN = /^第?[0-9０-９一二三四五六七八九十百千]+(?:步|页|章|节|项|条|张)$/u;
const INVALID_EDGE = /^[的了吧呢啊呀哦啦嘛着过个种篇]|[的了吧呢啊呀哦啦嘛着过个种篇]$/u;

const LEADING_FILLERS = [
  '大家好呀',
  '我们发现',
  '朋友说',
  '有人说',
  '一起来',
  '大家好',
  '我发现',
  '我们用',
  '这一次',
  '贼全',
  '超全',
  '但是',
  '为什么',
  '终于',
  '然后',
  '其实',
  '首先',
  '其次',
  '最后',
  '最近',
  '今天',
  '大约',
  '据说',
  '听说',
  '现在',
  '这个',
  '那个',
  '我们',
  '大家',
  '可以',
  '已经',
  '一起',
  '开始',
  '通过',
  '使用',
  '基于',
  '解决',
  '整理',
  '只要',
  '我用',
  '我想',
  '希望',
  '先',
  '但',
  '再',
  '又',
  '把',
  '将',
  '让',
  '从',
  '用',
  '我',
  '你',
  '就',
];

const TRAILING_FILLERS = [
  '真的太好用了',
  '太厉害了吧',
  '太好用了',
  '真的很厉害',
  '回来以后',
  '很好用了',
  '太厉害了',
  '真的不错',
  '值得一试',
  '分享一下',
  '看一下',
  '没想到吧',
  '回来了',
  '爆火了',
  '正式上线',
  '正式发布',
  '上线了',
  '值得关注',
  '发布了',
  '完成了',
  '成功了',
  '很好用',
  '太好用',
  '太厉害',
  '很厉害',
  '很不错',
  '真的',
  '回来',
  '开始',
  '起来',
  '一下',
  '看看',
  '试试',
  '火了',
  '上线',
  '发布',
  '推出',
  '更新',
  '开放',
  '回归',
  '爆了',
  '来了',
  '了吧',
  '了',
  '吧',
  '呢',
  '啊',
  '呀',
  '哦',
  '啦',
  '嘛',
];

const LOW_INFORMATION_TOKENS = [
  '太好用了',
  '太厉害了',
  '没想到吧',
  '分享一下',
  '看一下',
  '感觉不错',
  '值得一试',
  '大家',
  '我们',
  '然后',
  '其实',
  '就是',
  '这样',
  '这个',
  '那个',
  '这些',
  '那些',
  '一个',
  '一种',
  '一篇',
  '工具',
  '方法',
  '功能',
  '内容',
  '问题',
  '结果',
  '产品',
  '项目',
  '平台',
  '教程',
  '指南',
  '方案',
  '体验',
  '模型',
  '系统',
  '行动',
  '开始',
  '可以',
  '已经',
  '终于',
  '真的',
  '非常',
  '特别',
  '觉得',
  '感觉',
  '好用',
  '厉害',
  '不错',
  '太强',
  'AI',
  'API',
  'App',
  '就',
  '也',
  '都',
  '很',
  '太',
  '了',
  '的',
  '呢',
  '吧',
  '啊',
];

const STRONG_SIGNAL_TERMS = [
  '小红书',
  '公众号',
  '知识库',
  '工作流',
  '提示词',
  '智能体',
  '浏览器',
  '编辑器',
  '数据库',
  '关键词',
  '助手',
  '引擎',
  '框架',
  '应用',
  '计划',
  '实验室',
  '工作室',
  '社区',
  '开源',
  '实战',
  '自动',
  '本地',
  '离线',
  '部署',
  '生成',
  '同步',
  '提效',
  '降本',
  '效率',
  '写作',
  '插件',
  '模板',
  '设计',
  '排版',
  '图片',
  '文案',
  '发布',
  '流程',
  '信息',
  '成本',
  '提升',
  '降低',
  '缩短',
  '识别',
  '短语',
];

const GENERAL_SIGNAL_TERMS = [
  '教程',
  '指南',
  '方法',
  '技巧',
  '模型',
  '工具',
  '功能',
  '平台',
  '系统',
  '项目',
  '方案',
  '步骤',
  '体验',
];

const RESULT_TERMS = [
  '缩短到',
  '降低到',
  '提升到',
  '增长到',
  '拆成',
  '提升',
  '提高',
  '增长',
  '降低',
  '减少',
  '节省',
  '节约',
  '缩短',
  '突破',
  '达到',
  '只需',
  '完成',
  '搞定',
  '压缩',
];

const PRODUCT_CONTEXT_PATTERN = /(?:用|使用|接入|安装|打开|基于|借助|通过)\s*$/u;
const LOW_VALUE_PRODUCTS = new Set(['ai', 'api', 'app']);
const KNOWN_PRODUCTS = new Set([
  'claude code',
  'codex',
  'openai codex',
  'obsidian',
  'react',
  'typescript',
  'wesight',
]);

export function selectXhsTypographyHighlight(value: string): XhsTypographyHighlightRange | null {
  if (!value.trim() || value.trim() === EMPTY_PREVIEW_TEXT) return null;
  const candidates = collectCandidates(value)
    .filter(candidate => candidate.score >= MIN_HIGHLIGHT_SCORE);
  const firstParagraphEnd = findFirstParagraphEnd(value);
  candidates.sort((left, right) => (
    getCandidatePriority(right, firstParagraphEnd) - getCandidatePriority(left, firstParagraphEnd)
    || right.score - left.score
    || right.signalCount - left.signalCount
    || Math.abs(left.compactLength - 6) - Math.abs(right.compactLength - 6)
    || left.start - right.start
    || right.compactLength - left.compactLength
  ));
  const selected = candidates[0];
  if (!selected) return null;
  return { text: selected.text, start: selected.start, end: selected.end };
}

function findFirstParagraphEnd(value: string): number {
  const firstContentStart = value.search(/\S/u);
  if (firstContentStart < 0) return 0;
  const following = value.slice(firstContentStart);
  const lineBreak = following.match(/\r\n|\r|\n/u);
  return lineBreak ? firstContentStart + (lineBreak.index ?? following.length) : value.length;
}

function getCandidatePriority(candidate: HighlightCandidate, firstParagraphEnd: number): number {
  const isSemantic = candidate.kind !== 'numeric' && candidate.kind !== 'result';
  const isInFirstParagraph = candidate.start < firstParagraphEnd;
  if (isSemantic && isInFirstParagraph) return 4;
  if (isSemantic) return 3;
  if (isInFirstParagraph) return 2;
  return 1;
}

export function findXhsTypographyHighlightSegments(
  lines: string[],
  source: string,
  highlight: XhsTypographyHighlightRange | null,
): XhsTypographyHighlightSegment[] {
  if (
    !highlight
    || highlight.start < 0
    || highlight.end <= highlight.start
    || highlight.end > source.length
    || source.slice(highlight.start, highlight.end) !== highlight.text
  ) return [];

  const sourceGraphemes = splitXhsTypographyGraphemes(source)
    .filter(grapheme => !/^\s+$/u.test(grapheme.text));
  const targetStart = sourceGraphemes.findIndex(grapheme => grapheme.end > highlight.start);
  const target = sourceGraphemes.filter(grapheme => (
    grapheme.start < highlight.end && grapheme.end > highlight.start
  ));
  if (targetStart < 0 || target.length < 2) return [];

  const positions: Array<{ text: string; lineIndex: number; start: number; end: number }> = [];
  lines.forEach((line, lineIndex) => {
    splitXhsTypographyGraphemes(line).forEach(grapheme => {
      if (/^\s+$/u.test(grapheme.text)) return;
      positions.push({
        text: grapheme.text,
        lineIndex,
        start: grapheme.start,
        end: grapheme.end,
      });
    });
  });

  const selected = positions.slice(targetStart, targetStart + target.length);
  if (
    selected.length !== target.length
    || selected.some((position, index) => position.text !== target[index].text)
  ) return [];

  const groups: Array<{ lineIndex: number; start: number; end: number }> = [];
  selected.forEach(position => {
    const previous = groups[groups.length - 1];
    if (previous?.lineIndex === position.lineIndex) {
      previous.end = position.end;
      return;
    }
    groups.push({
      lineIndex: position.lineIndex,
      start: position.start,
      end: position.end,
    });
  });

  return groups.map(group => {
    const line = lines[group.lineIndex] ?? '';
    return {
      lineIndex: group.lineIndex,
      prefix: line.slice(0, group.start),
      text: line.slice(group.start, group.end),
    };
  }).filter(segment => segment.text.trim().length > 0);
}

function collectCandidates(source: string): HighlightCandidate[] {
  const candidates = new Map<string, HighlightCandidate>();
  collectQuotedCandidates(source, candidates);

  Array.from(source.matchAll(CLAUSE_PATTERN)).forEach((match, clauseIndex) => {
    const raw = match[0];
    const outer = trimWhitespaceSpan(raw);
    if (!outer) return;
    const clauseStart = (match.index ?? 0) + outer.start;
    const clause = outer.text;
    const dateOnly = DATE_ONLY_PATTERN.test(clause.replace(/\s+/gu, ''));
    collectProductCandidates(clause, clauseStart, clauseIndex, candidates);
    collectNumericCandidates(clause, clauseStart, clauseIndex, candidates);
    if (!dateOnly) collectHanCandidates(clause, clauseStart, clauseIndex, candidates);
  });

  return Array.from(candidates.values());
}

function collectQuotedCandidates(
  source: string,
  candidates: Map<string, HighlightCandidate>,
): void {
  for (const match of source.matchAll(QUOTED_PATTERN)) {
    const text = match[1]?.trim();
    if (!text) continue;
    const offsetInMatch = match[0].indexOf(text);
    addCandidate(candidates, text, (match.index ?? 0) + offsetInMatch, 'entity', 108, 2);
  }
}

function collectProductCandidates(
  clause: string,
  clauseStart: number,
  clauseIndex: number,
  candidates: Map<string, HighlightCandidate>,
): void {
  for (const match of clause.matchAll(PRODUCT_PATTERN)) {
    const boundary = match[1] ?? '';
    const text = match[2] ?? '';
    const localStart = (match.index ?? 0) + boundary.length;
    const context = clause.slice(Math.max(0, localStart - 8), localStart);
    const normalized = text.normalize('NFKC');
    const normalizedLower = normalized.toLocaleLowerCase();
    const tokens = normalized.split(/\s*(?:\+|\/|&)\s*|\s+/u).filter(Boolean);
    const wordTokens = tokens.filter(token => !/^\d+(?:\.\d+)+$/u.test(token));
    const brandTokens = wordTokens.filter(token => (
      /[a-z][A-Z]/u.test(token)
      || /^[A-Z]{2,}[A-Za-z0-9._#-]*$/u.test(token)
      || /^[A-Z][a-z]+$/u.test(token)
    ));
    const hasContext = PRODUCT_CONTEXT_PATTERN.test(context);
    const known = KNOWN_PRODUCTS.has(normalizedLower);
    const hasConnector = /[+/&]/u.test(normalized);
    const hasVersion = /\d+(?:\.\d+)+/u.test(normalized);
    const hasCamelCase = /[a-z][A-Z]/u.test(normalized);
    const hasAllCaps = /(?:^|\s)[A-Z]{2,}(?:\s|$)/u.test(normalized);
    const isOrdinaryLowercase = wordTokens.every(token => token === token.toLocaleLowerCase());
    const looksLikeSentence = wordTokens.length > 1 && brandTokens.length < Math.ceil(wordTokens.length / 2);
    if (LOW_VALUE_PRODUCTS.has(normalizedLower) && !hasContext) continue;
    if (isOrdinaryLowercase && !hasContext && !known) continue;
    if (looksLikeSentence && !hasContext && !known && !hasConnector && !hasVersion) continue;

    let score = 66 - Math.min(6, clauseIndex * 0.5);
    if (known) score += 18;
    if (hasContext) score += 14;
    if (hasCamelCase) score += 18;
    if (hasAllCaps) score += 15;
    if (hasConnector) score += 12;
    if (hasVersion) score += 12;
    if (brandTokens.length > 0) score += 10;
    if (tokens.length > 1) score += 10;
    addCandidate(candidates, text, clauseStart + localStart, 'product', score, 2);
    collectProductTopicCandidate(
      clause,
      clauseStart,
      localStart,
      text.length,
      clauseIndex,
      candidates,
    );
  }
}

function collectProductTopicCandidate(
  clause: string,
  clauseStart: number,
  productStart: number,
  productLength: number,
  clauseIndex: number,
  candidates: Map<string, HighlightCandidate>,
): void {
  const productEnd = productStart + productLength;
  const remainder = clause.slice(productEnd);
  const spacingLength = remainder.match(/^\s*/u)?.[0].length ?? 0;
  if (spacingLength === 0) return;
  const han = remainder.slice(spacingLength).match(/^\p{Script=Han}+/u)?.[0] ?? '';
  const topic = trimHanSpan(han);
  if (!topic || topic.start > 0) return;

  const strongSignals = countTerms(topic.text, STRONG_SIGNAL_TERMS);
  const generalSignals = countTerms(topic.text, GENERAL_SIGNAL_TERMS);
  if (strongSignals + generalSignals === 0) return;
  if (countHanGraphemes(topic.text) > MAX_VISUAL_HAN_GRAPHEMES) return;

  const combinedEnd = productEnd + spacingLength + topic.end;
  const text = clause.slice(productStart, combinedEnd);
  if (graphemeLength(text.replace(/\s+/gu, '')) > MAX_PRODUCT_TOPIC_GRAPHEMES) return;
  addCandidate(
    candidates,
    text,
    clauseStart + productStart,
    'product',
    108 + strongSignals * 6 + generalSignals * 3 - Math.min(6, clauseIndex * 0.5),
    2 + strongSignals + generalSignals,
  );
}

function collectNumericCandidates(
  clause: string,
  clauseStart: number,
  clauseIndex: number,
  candidates: Map<string, HighlightCandidate>,
): void {
  const matches = Array.from(clause.matchAll(NUMBER_WITH_UNIT_PATTERN));
  matches.forEach((match, matchIndex) => {
    const numericText = match[0];
    const numericStart = match.index ?? 0;
    if (ORDINAL_PATTERN.test(`${clause[numericStart - 1] === '第' ? '第' : ''}${numericText.replace(/\s+/gu, '')}`)) return;

    const before = clause.slice(0, numericStart);
    const after = clause.slice(numericStart + numericText.length);
    const beforeAction = findLastTerm(before, RESULT_TERMS);
    const afterAction = findFirstTerm(after, RESULT_TERMS);
    const resultNoun = extractNumericResultNoun(after);
    const uncertaintyPenalty = calculateNumericUncertaintyPenalty(clause, numericStart);
    if (uncertaintyPenalty > 0) return;
    const beforeActionIsAttached = beforeAction
      ? numericStart - beforeAction.end <= 3
        && !/[^到为至仅只\s]/u.test(before.slice(beforeAction.end))
      : false;

    if (beforeAction && beforeActionIsAttached) {
      const hasEarlierQuantity = matches.some(other => (
        (other.index ?? 0) < beforeAction.start
      ));
      const localStart = hasEarlierQuantity ? beforeAction.start : trimGeneralLeadingOffset(clause);
      const text = clause.slice(
        localStart,
        numericStart + numericText.length + resultNoun.length,
      ).trimEnd();
      addCandidate(
        candidates,
        text,
        clauseStart + localStart,
        'numeric',
        122 + (resultNoun ? 8 : 0) - uncertaintyPenalty - matchIndex - clauseIndex,
        3,
      );
      return;
    }

    if (afterAction && afterAction.start <= 2) {
      const text = clause.slice(numericStart).trimEnd();
      addCandidate(
        candidates,
        text,
        clauseStart + numericStart,
        'numeric',
        114 - uncertaintyPenalty - matchIndex - clauseIndex,
        3,
      );
      return;
    }

    const completeNumericText = `${numericText}${resultNoun}`.trimEnd();
    addCandidate(
      candidates,
      completeNumericText,
      clauseStart + numericStart,
      'numeric',
      92 + (resultNoun ? 6 : 0) - uncertaintyPenalty - clauseIndex,
      resultNoun ? 2 : 1,
    );
  });
}

function calculateNumericUncertaintyPenalty(clause: string, numericStart: number): number {
  const contextThroughFirstDigit = clause.slice(0, numericStart + 1);
  const qualifierCount = Array.from(contextThroughFirstDigit.matchAll(UNCERTAIN_DATA_PATTERN)).length;
  return Math.min(72, qualifierCount * 24);
}

function extractNumericResultNoun(after: string): string {
  const knownResult = after.match(NUMERIC_RESULT_NOUN_PATTERN)?.[0];
  if (knownResult) return knownResult;

  const whitespace = after.match(/^\s*/u)?.[0] ?? '';
  const hanRun = after.slice(whitespace.length).match(/^\p{Script=Han}+/u)?.[0] ?? '';
  if (!hanRun) return '';

  let boundary = hanRun.length;
  NUMERIC_RESULT_BOUNDARIES.forEach(term => {
    const index = hanRun.indexOf(term);
    if (index >= 0 && index < boundary) boundary = index;
  });
  const noun = hanRun.slice(0, boundary);
  const length = graphemeLength(noun);
  if (length < 1 || length > 6) return '';
  if (/^(?:有|为|占|达|需|要|可|能|将|会|已|正|又|再|才|只)$/u.test(noun)) return '';
  return `${whitespace}${noun}`;
}

function collectHanCandidates(
  clause: string,
  clauseStart: number,
  clauseIndex: number,
  candidates: Map<string, HighlightCandidate>,
): void {
  for (const match of clause.matchAll(/\p{Script=Han}+/gu)) {
    const raw = match[0];
    const trimmed = trimHanSpan(raw);
    if (!trimmed) continue;
    const start = clauseStart + (match.index ?? 0) + trimmed.start;
    collectAnnouncedNameCandidate(raw, trimmed, clauseStart + (match.index ?? 0), clauseIndex, candidates);
    collectLocationCandidate(trimmed.text, start, clauseIndex, candidates);
    addHanCandidate(candidates, trimmed.text, start, clauseIndex);
    collectCompoundSignalCandidates(trimmed.text, start, clauseIndex, candidates);
  }
}

function collectAnnouncedNameCandidate(
  raw: string,
  trimmed: TextSpan,
  sourceStart: number,
  clauseIndex: number,
  candidates: Map<string, HighlightCandidate>,
): void {
  const trailing = raw.slice(trimmed.end);
  if (!ANNOUNCED_NAME_ACTION_PATTERN.test(trailing)) return;
  const text = trimmed.text;
  const compactLength = graphemeLength(text);
  if (compactLength < MIN_VISUAL_HAN_GRAPHEMES || compactLength > MAX_VISUAL_HAN_GRAPHEMES) return;
  const suffix = ANNOUNCED_NAME_SUFFIXES.find(term => text.endsWith(term));
  if (!suffix) return;

  let properNameCore = text.slice(0, -suffix.length);
  GENERIC_NAME_PARTS.forEach(term => {
    properNameCore = properNameCore.replaceAll(term, '');
  });
  if (graphemeLength(properNameCore) < 2) return;

  addCandidate(
    candidates,
    text,
    sourceStart + trimmed.start,
    'entity',
    112 - Math.min(6, clauseIndex * 0.5),
    4,
  );
}

function collectCompoundSignalCandidates(
  text: string,
  sourceStart: number,
  clauseIndex: number,
  candidates: Map<string, HighlightCandidate>,
): void {
  const occurrences = [...STRONG_SIGNAL_TERMS, ...GENERAL_SIGNAL_TERMS]
    .flatMap(term => {
      const spans: Array<{ start: number; end: number }> = [];
      let searchFrom = 0;
      while (searchFrom < text.length) {
        const start = text.indexOf(term, searchFrom);
        if (start < 0) break;
        spans.push({ start, end: start + term.length });
        searchFrom = start + term.length;
      }
      return spans;
    })
    .sort((left, right) => left.start - right.start || right.end - left.end)
    .filter((span, index, sorted) => !sorted.slice(0, index).some(other => (
      other.start <= span.start && other.end >= span.end
    )));

  let group: Array<{ start: number; end: number }> = [];
  const flush = (): void => {
    for (let startIndex = 0; startIndex < group.length; startIndex += 1) {
      for (let endIndex = startIndex; endIndex < group.length; endIndex += 1) {
        const start = group[startIndex]?.start ?? 0;
        const end = group[endIndex]?.end ?? start;
        const candidate = text.slice(start, end);
        if (graphemeLength(candidate) > MAX_VISUAL_HAN_GRAPHEMES) break;
        addHanCandidate(candidates, candidate, sourceStart + start, clauseIndex);
      }
    }
    group = [];
  };

  occurrences.forEach(span => {
    const previous = group[group.length - 1];
    if (!previous) {
      group.push(span);
      return;
    }
    const gap = text.slice(previous.end, span.start);
    if (span.start <= previous.end || gap === '的') {
      group.push(span);
      return;
    }
    flush();
    group.push(span);
  });
  flush();
}

function collectLocationCandidate(
  text: string,
  sourceStart: number,
  clauseIndex: number,
  candidates: Map<string, HighlightCandidate>,
): void {
  if (collectAdministrativeLocationCandidates(text, sourceStart, clauseIndex, candidates)) return;

  const context = findLastTerm(text, LOCATION_CONTEXT_TERMS);
  if (!context) return;
  const localStart = context.end;
  const locationEnd = findNearestLocationEnd(text, localStart, localStart, text.length, false);
  if (locationEnd <= localStart) return;
  const candidate = text.slice(localStart, locationEnd);

  addCandidate(
    candidates,
    candidate,
    sourceStart + localStart,
    'entity',
    116 - Math.min(6, clauseIndex * 0.5),
    3,
  );
}

function collectAdministrativeLocationCandidates(
  text: string,
  sourceStart: number,
  clauseIndex: number,
  candidates: Map<string, HighlightCandidate>,
): boolean {
  let found = false;
  ADMINISTRATIVE_LOCATION_NAMES.forEach(name => {
    let searchFrom = 0;
    while (searchFrom < text.length) {
      const start = text.indexOf(name, searchFrom);
      if (start < 0) break;
      const nameEnd = start + name.length;
      const remaining = text.slice(nameEnd);
      const action = findFirstTerm(remaining, LOCATION_ACTION_BOUNDARIES);
      const scanEnd = action ? nameEnd + action.start : text.length;
      const context = findLastTerm(text.slice(0, start), LOCATION_CONTEXT_TERMS);
      const allowNameOnly = scanEnd === nameEnd || context?.end === start;
      const locationEnd = findNearestLocationEnd(
        text,
        start,
        nameEnd,
        scanEnd,
        allowNameOnly,
      );
      if (locationEnd > start) {
        const candidate = text.slice(start, locationEnd);
        addCandidate(
          candidates,
          candidate,
          sourceStart + start,
          'entity',
          122 - Math.min(6, clauseIndex * 0.5),
          4,
        );
        found = true;
      }
      searchFrom = nameEnd;
    }
  });
  return found;
}

function findNearestLocationEnd(
  text: string,
  start: number,
  nameEnd: number,
  scanEnd: number,
  allowNameOnly: boolean,
): number {
  const tail = text.slice(start, scanEnd);
  const graphemes = splitXhsTypographyGraphemes(tail);
  const fallbackNameEnd = allowNameOnly ? nameEnd : -1;
  for (let index = 0; index < graphemes.length; index += 1) {
    const end = start + (graphemes[index]?.end ?? 0);
    const candidate = text.slice(start, end);
    const length = graphemeLength(candidate);
    if (length > MAX_VISUAL_HAN_GRAPHEMES) break;
    if (end === nameEnd) continue;
    if (end > nameEnd && LOCATION_END_PATTERN.test(candidate)) return end;
  }
  return fallbackNameEnd;
}

function addHanCandidate(
  candidates: Map<string, HighlightCandidate>,
  text: string,
  start: number,
  clauseIndex: number,
): void {
  const compactLength = graphemeLength(text.replace(/\s+/gu, ''));
  if (compactLength < 2 || compactLength > MAX_VISUAL_HAN_GRAPHEMES) return;
  const strongSignals = countTerms(text, STRONG_SIGNAL_TERMS);
  const generalSignals = countTerms(text, GENERAL_SIGNAL_TERMS);
  const hasResult = RESULT_TERMS.some(term => text.includes(term)) || text.includes('说清楚');
  if (strongSignals === 0 && generalSignals === 0 && !hasResult) return;
  const headScore = getTopicHeadScore(text);
  if (!hasResult && headScore === 0) return;

  let score = 54 - Math.min(6, clauseIndex * 0.5);
  score += strongSignals * 14;
  score += generalSignals * 7;
  if (hasResult) score += 10;
  if (compactLength >= 4 && compactLength <= 8) score += 8;
  score += headScore;
  if (meaningfulCoreLength(text) >= 2) score += 4;
  addCandidate(
    candidates,
    text,
    start,
    headScore > 0 ? 'topic' : 'result',
    score,
    strongSignals + generalSignals,
  );
}

function getTopicHeadScore(text: string): number {
  return TOPIC_HEAD_WEIGHTS.find(item => text.endsWith(item.term))?.score ?? 0;
}

function addCandidate(
  candidates: Map<string, HighlightCandidate>,
  rawText: string,
  rawStart: number,
  kind: HighlightCandidateKind,
  score: number,
  signalCount: number,
): void {
  const leadingWhitespace = rawText.match(/^\s+/u)?.[0].length ?? 0;
  const text = rawText.trim();
  const start = rawStart + leadingWhitespace;
  const compact = text.replace(/\s+/gu, '');
  const compactLength = graphemeLength(compact);
  if (!isEligibleCandidate(text, compact, compactLength, kind)) return;
  const candidate: HighlightCandidate = {
    text,
    start,
    end: start + text.length,
    kind,
    score,
    signalCount,
    compactLength,
  };
  const key = `${candidate.start}:${candidate.end}:${candidate.text}`;
  const existing = candidates.get(key);
  if (!existing || candidate.score > existing.score) candidates.set(key, candidate);
}

function isEligibleCandidate(
  text: string,
  compact: string,
  compactLength: number,
  kind: HighlightCandidateKind,
): boolean {
  if (compactLength < 2) return false;
  if (text === EMPTY_PREVIEW_TEXT || /^\d+$/u.test(compact)) return false;
  if (/^(?:哈|啊|呀|哦|嗯|哇|6)+$/u.test(compact)) return false;
  if (kind === 'numeric') return !ORDINAL_PATTERN.test(compact) && compactLength <= 12;
  if (kind === 'product') return compactLength <= 28;
  if (/^\p{Script=Han}+$/u.test(compact) && compactLength > MAX_VISUAL_HAN_GRAPHEMES) return false;
  if (compactLength > 16 || INVALID_EDGE.test(compact)) return false;
  return meaningfulCoreLength(compact) >= 2;
}

function countHanGraphemes(value: string): number {
  return splitXhsTypographyGraphemes(value)
    .filter(grapheme => /\p{Script=Han}/u.test(grapheme.text))
    .length;
}

function meaningfulCoreLength(value: string): number {
  let core = value.normalize('NFKC').replace(/[^\p{Letter}\p{Number}+#._-]+/gu, '');
  [...LOW_INFORMATION_TOKENS]
    .sort((left, right) => right.length - left.length)
    .forEach(token => {
      core = core.replaceAll(token, '');
      core = core.replaceAll(token.toLocaleLowerCase(), '');
    });
  return graphemeLength(core);
}

function trimWhitespaceSpan(raw: string): TextSpan | null {
  const leading = raw.match(/^\s+/u)?.[0].length ?? 0;
  const trailing = raw.match(/\s+$/u)?.[0].length ?? 0;
  const end = raw.length - trailing;
  if (end <= leading) return null;
  return { text: raw.slice(leading, end), start: leading, end };
}

function trimHanSpan(raw: string): TextSpan | null {
  let start = 0;
  let end = raw.length;
  let changed = true;
  while (changed && end > start) {
    changed = false;
    const current = raw.slice(start, end);
    const trailingAction = current.match(TRAILING_ACTION_PATTERN)?.[0];
    if (
      trailingAction
      && graphemeLength(current.slice(0, -trailingAction.length)) >= 2
    ) {
      end -= trailingAction.length;
      changed = true;
      continue;
    }
    const leading = LEADING_FILLERS.find(value => (
      current.startsWith(value)
      && graphemeLength(current.slice(value.length)) >= 2
    ));
    if (leading) {
      start += leading.length;
      changed = true;
      continue;
    }
    const trailing = TRAILING_FILLERS.find(value => (
      current.endsWith(value)
      && graphemeLength(current.slice(0, -value.length)) >= 2
    ));
    if (trailing) {
      end -= trailing.length;
      changed = true;
    }
  }
  const text = raw.slice(start, end);
  return graphemeLength(text) >= 2 ? { text, start, end } : null;
}

function trimGeneralLeadingOffset(value: string): number {
  let offset = value.match(/^\s+/u)?.[0].length ?? 0;
  let changed = true;
  while (changed) {
    changed = false;
    const current = value.slice(offset);
    const filler = LEADING_FILLERS.find(item => (
      current.startsWith(item) && current.length - item.length >= 2
    ));
    if (filler) {
      offset += filler.length;
      while (/\s/u.test(value[offset] ?? '')) offset += 1;
      changed = true;
    }
  }
  return offset;
}

function findLastTerm(value: string, terms: string[]): { start: number; end: number } | null {
  let found: { start: number; end: number } | null = null;
  terms.forEach(term => {
    const start = value.lastIndexOf(term);
    if (start >= 0 && (!found || start > found.start)) found = { start, end: start + term.length };
  });
  return found;
}

function findFirstTerm(value: string, terms: string[]): { start: number; end: number } | null {
  let found: { start: number; end: number } | null = null;
  terms.forEach(term => {
    const start = value.indexOf(term);
    if (start >= 0 && (!found || start < found.start)) found = { start, end: start + term.length };
  });
  return found;
}

function countTerms(value: string, terms: string[]): number {
  return terms.reduce((count, term) => count + (value.includes(term) ? 1 : 0), 0);
}

export function splitXhsTypographyGraphemes(value: string): TextSpan[] {
  if (typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(value)).map(segment => ({
      text: segment.segment,
      start: segment.index,
      end: segment.index + segment.segment.length,
    }));
  }

  const spans: TextSpan[] = [];
  let current: TextSpan | null = null;
  let offset = 0;
  for (const text of Array.from(value)) {
    const start = offset;
    offset += text.length;
    const joinsPrevious = current && (
      text === '\u200d'
      || current.text.endsWith('\u200d')
      || /^(?:\p{Mark}|[\u{1f3fb}-\u{1f3ff}]|\ufe0f)$/u.test(text)
    );
    if (joinsPrevious && current) {
      current.text += text;
      current.end = offset;
      continue;
    }
    if (current) spans.push(current);
    current = { text, start, end: offset };
  }
  if (current) spans.push(current);
  return spans;
}

function graphemeLength(value: string): number {
  return splitXhsTypographyGraphemes(value).length;
}
