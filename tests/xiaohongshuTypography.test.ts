import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../src/xiaohongshu/typographyTemplates', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/xiaohongshu/typographyTemplates')>();
  return {
    ...actual,
    renderXhsTypographyTemplateBlob: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
  };
});

import { XiaohongshuGenerationService } from '../src/xiaohongshu/generationService';
import {
  XHS_TYPOGRAPHY_TEMPLATE_IDS,
  XHS_TYPOGRAPHY_TEMPLATES,
  XHS_HANDWRITING_FONT_FAMILY,
  applyXhsTypographyFocusBreaks,
  buildXhsTypographyPageInput,
  calculateXhsTypographyMarkerRect,
  calculateXhsTypographyVerticalOffset,
  getXhsTypographyTemplate,
  getXhsTypographyFontFamily,
  renderXhsTypographyTemplateBlob,
  wrapXhsTypographyText,
} from '../src/xiaohongshu/typographyTemplates';
import {
  findXhsTypographyHighlightSegments,
  selectXhsTypographyHighlight,
  splitXhsTypographyGraphemes,
} from '../src/xiaohongshu/typographyHighlight';
import { getXhsCategory } from '../src/xiaohongshu/types';

const EXPECTED_LABELS = [
  '基础',
  '美漫',
  '插图',
  '简约',
  '涂写',
  '便签',
  '几何',
  '边框',
  '手写',
  '弥散',
  '涂鸦',
  '备忘',
  '清新',
  '书摘',
  '科技',
  '光影',
  '手帐',
  '印刷',
  '札记',
  '柔和',
  '贺卡',
];

describe('xiaohongshu typography templates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('keeps the 21 template names and order aligned with the reference set', () => {
    const category = getXhsCategory('typography');

    expect(XHS_TYPOGRAPHY_TEMPLATE_IDS).toHaveLength(21);
    expect(category.styles.map(style => style.id)).toEqual([...XHS_TYPOGRAPHY_TEMPLATE_IDS]);
    expect(XHS_TYPOGRAPHY_TEMPLATES.map(template => template.label)).toEqual(EXPECTED_LABELS);
    expect(category.styles.map(style => style.label)).toEqual(EXPECTED_LABELS);
  });

  test('provides a reference image and measured text regions for every template', () => {
    for (const id of XHS_TYPOGRAPHY_TEMPLATE_IDS) {
      const template = getXhsTypographyTemplate(id);
      expect(template.id).toBe(id);
      expect(template.referenceImage).toBeTruthy();
      expect(template.title.rect.width).toBeGreaterThan(0);
      expect(template.body.rect.height).toBeGreaterThan(0);
    }
  });

  test('uses measured unified layouts for the five official highlight templates', () => {
    expect(getXhsTypographyTemplate('basic').unified).toEqual({
      rect: { x: 0.125, y: 0.30, width: 0.75, height: 0.39 },
      fontSize: 66,
      minFontSize: 42,
      lineHeight: 1.31,
      maxLines: 5,
      highlightWrap: 'isolate',
    });
    expect(getXhsTypographyTemplate('comic').unified).toEqual({
      rect: { x: 0.116, y: 0.13, width: 0.76, height: 0.40 },
      fontSize: 68,
      minFontSize: 42,
      lineHeight: 1.32,
      maxLines: 5,
      highlightWrap: 'isolate',
    });
    expect(getXhsTypographyTemplate('illustrated').unified).toEqual({
      rect: { x: 0.105, y: 0.13, width: 0.80, height: 0.38 },
      fontSize: 66,
      minFontSize: 42,
      lineHeight: 1.27,
      maxLines: 5,
      highlightWrap: 'balanced',
    });
    expect(getXhsTypographyTemplate('minimal').unified).toEqual({
      rect: { x: 0.107, y: 0.28, width: 0.78, height: 0.47 },
      fontSize: 79,
      minFontSize: 46,
      lineHeight: 1.30,
      maxLines: 5,
      highlightWrap: 'isolate',
    });
    expect(getXhsTypographyTemplate('scribble').unified).toEqual({
      rect: { x: 0.11, y: 0.27, width: 0.78, height: 0.50 },
      fontSize: 92,
      minFontSize: 50,
      lineHeight: 1.20,
      maxLines: 5,
      highlightWrap: 'lead-context',
      align: 'center',
    });
  });

  test('keeps one unified text block for a sentence or paragraph', () => {
    expect(buildXhsTypographyPageInput('第一段\n\n第二段', 1, 3)).toEqual({
      text: '第一段\n\n第二段',
      pageNumber: 1,
      pageCount: 3,
    });
    expect(buildXhsTypographyPageInput('一句话也可以', 2, 3).text).toBe('一句话也可以');
  });

  test('keeps the selected phrase together according to each official layout', () => {
    const source = '思目前破好后天早上海外滩回来\n好悠米尼哦哦哦';
    const start = source.indexOf('上海外滩');
    const highlight = {
      text: '上海外滩',
      start,
      end: start + '上海外滩'.length,
    };
    const softBreak = '\u2028';

    for (const styleId of ['basic', 'comic', 'minimal'] as const) {
      expect(applyXhsTypographyFocusBreaks(source, highlight, styleId)).toBe(
        `思目前破好后天早${softBreak}上海外滩${softBreak}回来\n好悠米尼哦哦哦`,
      );
    }
    expect(applyXhsTypographyFocusBreaks(source, highlight, 'illustrated')).toBe(
      `思目前破好后天早上海${softBreak}外滩${softBreak}回来\n好悠米尼哦哦哦`,
    );
    expect(applyXhsTypographyFocusBreaks(source, highlight, 'scribble')).toBe(
      `思目前破好${softBreak}后天早上海外滩${softBreak}回来\n好悠米尼哦哦哦`,
    );
  });

  test('keeps explicit paragraphs as visible spacing while focus breaks stay compact', () => {
    const context = {
      measureText: (value: string) => ({ width: Array.from(value).length * 10 }),
    } as CanvasRenderingContext2D;

    expect(wrapXhsTypographyText(context, '第一行\u2028焦点\n第二段', 100, 6)).toEqual([
      '第一行',
      '焦点',
      '',
      '第二段',
    ]);
    expect(wrapXhsTypographyText(context, '第一段\n\n第二段', 100, 6)).toEqual([
      '第一段',
      '',
      '第二段',
    ]);
    expect(wrapXhsTypographyText(context, '前文 \u2028TRAE Work\u2028 后文', 100, 6)).toEqual([
      '前文',
      'TRAE Work',
      '后文',
    ]);
  });

  test('uses the bundled handwriting font for handwriting templates', () => {
    expect(getXhsTypographyTemplate('handwritten').title.font).toBe('hand');
    expect(getXhsTypographyFontFamily('handwritten')).toContain(XHS_HANDWRITING_FONT_FAMILY);
    expect(getXhsTypographyFontFamily('scribble')).toContain(XHS_HANDWRITING_FONT_FAMILY);
    expect(getXhsTypographyFontFamily('basic')).toContain('WeSight Noto Sans SC');
    expect(getXhsTypographyFontFamily('illustrated')).toContain('WeSight Noto Sans SC');
    expect(getXhsTypographyFontFamily('comic')).toContain('WeSight ZCOOL KuaiLe');
    expect(getXhsTypographyFontFamily('minimal')).toContain('WeSight Noto Serif SC');
    expect(getXhsTypographyFontFamily('minimal')).not.toContain(XHS_HANDWRITING_FONT_FAMILY);
  });

  test('uses the official-style marker for automatically selected keywords', () => {
    expect(getXhsTypographyTemplate('basic').accent).toMatchObject({
      kind: 'marker',
      color: '#91ee55',
      shape: 'band',
      scope: 'phrase',
      height: 0.24,
    });
  });

  test('positions marker accents behind the selected phrase for every alignment', () => {
    const leftMarker = calculateXhsTypographyMarkerRect(120, 680, 280, 60, 100, 400, 72, 'left');
    expect(leftMarker.x).toBeCloseTo(177.84);
    expect(leftMarker.y).toBeCloseTo(450.4);
    expect(leftMarker.width).toBeCloseTo(104.32);
    expect(leftMarker.height).toBeCloseTo(20.16);

    const centerMarker = calculateXhsTypographyMarkerRect(120, 680, 280, 60, 100, 400, 72, 'center');
    expect(centerMarker.x).toBeCloseTo(377.84);
    expect(centerMarker.y).toBeCloseTo(450.4);
    expect(centerMarker.width).toBeCloseTo(104.32);
    expect(centerMarker.height).toBeCloseTo(20.16);

    const rightMarker = calculateXhsTypographyMarkerRect(120, 680, 280, 60, 100, 400, 72, 'right');
    expect(rightMarker.x).toBeCloseTo(577.84);
    expect(rightMarker.width).toBeCloseTo(104.32);
  });

  test('selects meaningful Chinese phrases instead of surrounding filler text', () => {
    const projectHighlight = selectXhsTypographyHighlight('TRAE Work开源实战库火了\n太厉害了吧\n666');
    expect(projectHighlight?.text).toBe('开源实战库');

    const placeHighlight = selectXhsTypographyHighlight('思日前破好后天早\n上海外滩\n回来');
    expect(placeHighlight?.text).toBe('上海外滩');
  });

  test('does not add a marker when the copy only contains filler or reactions', () => {
    expect(selectXhsTypographyHighlight('太厉害了吧')).toBeNull();
    expect(selectXhsTypographyHighlight('666')).toBeNull();
    expect(selectXhsTypographyHighlight('哈哈哈')).toBeNull();
  });

  test('splits one selected phrase into marker segments when wrapping crosses it', () => {
    const source = '这是开源实战库教程';
    const start = source.indexOf('开源实战库');

    expect(findXhsTypographyHighlightSegments(
      ['这是开源实', '战库教程'],
      source,
      { text: '开源实战库', start, end: start + '开源实战库'.length },
    )).toEqual([
      { lineIndex: 0, prefix: '这是', text: '开源实' },
      { lineIndex: 1, prefix: '', text: '战库' },
    ]);
  });

  test('uses the explicit source range when the same phrase appears more than once', () => {
    const source = '效率方法与效率方法';
    const start = source.lastIndexOf('效率方法');

    expect(findXhsTypographyHighlightSegments(
      [source],
      source,
      { text: '效率方法', start, end: start + '效率方法'.length },
    )).toEqual([
      { lineIndex: 0, prefix: '效率方法与', text: '效率方法' },
    ]);
  });

  test('keeps emoji, combining marks, and ZWJ sequences as complete graphemes', () => {
    expect(splitXhsTypographyGraphemes('e\u0301👩‍💻中')).toEqual([
      { text: 'e\u0301', start: 0, end: 2 },
      { text: '👩‍💻', start: 2, end: 7 },
      { text: '中', start: 7, end: 8 },
    ]);
  });

  test('maps a selected phrase across normalized consecutive spaces', () => {
    const source = '开源  实战库';
    expect(findXhsTypographyHighlightSegments(
      ['开源 实战库'],
      source,
      { text: source, start: 0, end: source.length },
    )).toEqual([
      { lineIndex: 0, prefix: '', text: '开源 实战库' },
    ]);
  });

  test('does not falsely mark a selected phrase removed by ellipsis truncation', () => {
    const source = '开头一段内容最后重点工具';
    const start = source.indexOf('重点工具');
    expect(findXhsTypographyHighlightSegments(
      ['开头一段内容…'],
      source,
      { text: '重点工具', start, end: start + '重点工具'.length },
    )).toEqual([]);
  });

  test('centers short text blocks vertically inside the template safe area', () => {
    expect(calculateXhsTypographyVerticalOffset(600, 1, 80, 100)).toBe(260);
    expect(calculateXhsTypographyVerticalOffset(600, 3, 80, 100)).toBe(160);
    expect(calculateXhsTypographyVerticalOffset(300, 4, 80, 100)).toBe(0);
  });

  test('exports typography pages locally without checking or running Codex', async () => {
    const refreshCodexStatus = vi.fn();
    const runTurn = vi.fn();
    const importGeneratedImage = vi.fn(async (_draftId: string, artifact: { itemId: string }) => ({
      id: artifact.itemId,
      vaultPath: `WeSight/小红书/${artifact.itemId}.png`,
      mimeType: 'image/png',
    }));
    const service = new XiaohongshuGenerationService({
      runtimeManager: { refreshCodexStatus, runTurn } as never,
      vaultStore: { importGeneratedImage } as never,
      getSettings: () => ({}) as never,
      env: { WESIGHT_HOME: mkdtempSync(path.join(tmpdir(), 'wesight-xhs-test-')) },
    });

    const result = await service.generateImages({
      draftId: 'draft-local-template',
      copy: { title: '测试标题', body: '测试正文', tags: [] },
      pageContents: [
        {
          pageNumber: 1,
          label: '封面',
          text: '第一张的一段图片文字',
          textSource: 'manual',
        },
        {
          pageNumber: 2,
          label: '方法',
          text: '第二张也只有一份图片文字',
          textSource: 'manual',
        },
      ],
      style: { categoryId: 'typography', styleId: 'minimal' },
      customStylePrompt: '',
      signal: new AbortController().signal,
    });

    expect(result).toHaveLength(2);
    expect(importGeneratedImage).toHaveBeenCalledTimes(2);
    expect(vi.mocked(renderXhsTypographyTemplateBlob)).toHaveBeenNthCalledWith(1, 'minimal', {
      text: '第一张的一段图片文字',
      pageNumber: 1,
      pageCount: 2,
    });
    expect(vi.mocked(renderXhsTypographyTemplateBlob)).toHaveBeenNthCalledWith(2, 'minimal', {
      text: '第二张也只有一份图片文字',
      pageNumber: 2,
      pageCount: 2,
    });
    expect(refreshCodexStatus).not.toHaveBeenCalled();
    expect(runTurn).not.toHaveBeenCalled();
  });
});
