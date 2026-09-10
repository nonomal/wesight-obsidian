import { describe, expect, test, vi } from 'vitest';

import {
  calculateXhsTypographyBrushPoints,
  calculateXhsTypographyMaskTarget,
  drawXhsTypographyAccent,
  drawXhsTypographyAccentText,
  drawXhsTypographyTextLine,
  getXhsTypographyTemplate,
  type XhsTypographyAccentSegmentMetrics,
} from '../src/xiaohongshu/typographyTemplates';
import { findXhsTypographyHighlightSegments } from '../src/xiaohongshu/typographyHighlight';

function createContext(): {
  context: CanvasRenderingContext2D;
  calls: {
    beginPath: ReturnType<typeof vi.fn>;
    ellipse: ReturnType<typeof vi.fn>;
    fill: ReturnType<typeof vi.fn>;
    fillText: ReturnType<typeof vi.fn>;
    paintedText: Array<{ text: string; color: string; x: number; y: number }>;
    stroke: ReturnType<typeof vi.fn>;
  };
} {
  const calls = {
    beginPath: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    paintedText: [] as Array<{ text: string; color: string; x: number; y: number }>,
    stroke: vi.fn(),
  };
  const context = {
    beginPath: calls.beginPath,
    closePath: vi.fn(),
    ellipse: calls.ellipse,
    fill: calls.fill,
    fillStyle: '',
    fillText: calls.fillText,
    globalAlpha: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    lineTo: vi.fn(),
    lineWidth: 1,
    measureText: vi.fn((value: string) => ({ width: Array.from(value).length * 20 }) as TextMetrics),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    stroke: calls.stroke,
    strokeStyle: '',
  } as unknown as CanvasRenderingContext2D;
  calls.fillText.mockImplementation((text: string, x: number, y: number) => {
    calls.paintedText.push({ text, color: context.fillStyle as string, x, y });
  });
  return { context, calls };
}

function segment(
  overrides: Partial<XhsTypographyAccentSegmentMetrics> = {},
): XhsTypographyAccentSegmentMetrics {
  return {
    lineIndex: 0,
    lineText: '思日前破好后天早上海外滩',
    lineLeft: 100,
    lineTop: 200,
    lineWidth: 400,
    phraseX: 300,
    phraseWidth: 80,
    phraseText: '上海外滩',
    ...overrides,
    phrasePrefix: overrides.phrasePrefix ?? '思日前破好后天早',
  };
}

describe('Xiaohongshu typography accent renderer v2', () => {
  test('keeps the legacy masking fallback immutable for templates without clean backgrounds', () => {
    const template = getXhsTypographyTemplate('handwritten');
    const declaredTarget = { ...template.masks[0].target };
    const textRect = { ...template.title.rect };

    const target = calculateXhsTypographyMaskTarget(declaredTarget, textRect);

    expect(target.x).toBeCloseTo(0.05);
    expect(target.x + target.width).toBeCloseTo(0.95);
    expect(target.y).toBeCloseTo(0.14);
    expect(target.y + target.height).toBeCloseTo(
      textRect.y + textRect.height + 0.025,
    );
    expect(declaredTarget).toEqual(template.masks[0].target);
    expect(textRect).toEqual(template.title.rect);
  });

  test('uses clean text-free backgrounds for the five official highlight templates', () => {
    for (const styleId of ['basic', 'comic', 'illustrated', 'minimal', 'scribble']) {
      const template = getXhsTypographyTemplate(styleId);
      expect(template.backgroundImage).toBeTruthy();
      expect(template.masks).toEqual([]);
    }
  });

  test('maps the five official templates to independent accent models', () => {
    expect(getXhsTypographyTemplate('basic').accent).toMatchObject({
      kind: 'marker',
      color: '#91ee55',
      shape: 'band',
      scope: 'phrase',
      height: 0.24,
    });
    expect(getXhsTypographyTemplate('illustrated').accent).toMatchObject({
      kind: 'underline',
      shape: 'hand-drawn',
      scope: 'phrase',
    });
    expect(getXhsTypographyTemplate('comic').accent).toMatchObject({
      kind: 'marker',
      shape: 'block',
      scope: 'phrase',
      height: 0.96,
      bleed: 0.14,
    });
    expect(getXhsTypographyTemplate('minimal').accent).toMatchObject({
      kind: 'circle',
      shape: 'glyphs',
      scope: 'grapheme',
      height: 1.16,
      bleed: 0.10,
    });
    expect(getXhsTypographyTemplate('scribble').accent).toMatchObject({
      kind: 'marker',
      shape: 'brush',
      scope: 'line',
      height: 1.16,
      bleed: 0.34,
      textColor: '#09b934',
    });
  });

  test('keeps hand-painted brush geometry stable for preview and export', () => {
    const target = { x: 120, y: 240, width: 320, height: 96 };
    const first = calculateXhsTypographyBrushPoints(target, 'same-page-and-phrase', 0.08, 40);
    const second = calculateXhsTypographyBrushPoints(target, 'same-page-and-phrase', 0.08, 40);
    const changed = calculateXhsTypographyBrushPoints(target, 'another-phrase', 0.08, 40);

    expect(first).toEqual(second);
    expect(changed).not.toEqual(first);
    expect(first).toHaveLength(16);
    expect(first.every(point => point.x >= target.x && point.x <= target.x + target.width)).toBe(true);
    expect(first.every(point => point.y >= target.y - 4 && point.y <= target.y + target.height + 4)).toBe(true);
  });

  test('draws the official background forms behind one unified text block', () => {
    const basic = createContext();
    drawXhsTypographyAccent(basic.context, getXhsTypographyTemplate('basic').accent, [segment()], 80);
    expect(basic.calls.fill).toHaveBeenCalledTimes(1);
    expect(basic.calls.ellipse).not.toHaveBeenCalled();

    const comic = createContext();
    drawXhsTypographyAccent(comic.context, getXhsTypographyTemplate('comic').accent, [
      segment({ lineIndex: 0, phraseText: '上海', phraseWidth: 40 }),
      segment({ lineIndex: 1, lineText: '外滩回来', lineTop: 304, phraseX: 100, phraseText: '外滩', phraseWidth: 40, phrasePrefix: '' }),
    ], 80);
    expect(comic.calls.fill).toHaveBeenCalledTimes(4);

    const illustrated = createContext();
    drawXhsTypographyAccent(illustrated.context, getXhsTypographyTemplate('illustrated').accent, [
      segment({ lineIndex: 0, phraseText: '上海', phraseWidth: 40 }),
      segment({ lineIndex: 1, lineText: '外滩回来', lineTop: 304, phraseX: 100, phraseText: '外滩', phraseWidth: 40, phrasePrefix: '' }),
    ], 80);
    expect(illustrated.calls.fill).toHaveBeenCalledTimes(4);

    const minimal = createContext();
    drawXhsTypographyAccent(minimal.context, getXhsTypographyTemplate('minimal').accent, [segment()], 80);
    expect(minimal.calls.ellipse).toHaveBeenCalledTimes(4);
    expect(minimal.calls.fill).toHaveBeenCalledTimes(1);

    const scribble = createContext();
    drawXhsTypographyAccent(scribble.context, getXhsTypographyTemplate('scribble').accent, [
      segment({ phraseText: '上海', phraseWidth: 40 }),
      segment({ phraseX: 340, phraseText: '外滩', phraseWidth: 40 }),
    ], 80);
    expect(scribble.calls.fill).toHaveBeenCalledTimes(1);
    expect(scribble.calls.beginPath).toHaveBeenCalledOnce();
    expect(scribble.calls.ellipse).not.toHaveBeenCalled();
  });

  test('fills all minimal grapheme circles as one path without dark overlaps', () => {
    const { context, calls } = createContext();

    drawXhsTypographyAccent(
      context,
      getXhsTypographyTemplate('minimal').accent,
      [segment({ phraseText: '上海外滩', phraseWidth: 80 })],
      80,
    );

    expect(calls.beginPath).toHaveBeenCalledOnce();
    expect(calls.ellipse).toHaveBeenCalledTimes(4);
    expect(calls.fill).toHaveBeenCalledOnce();
  });

  test('draws one same-line comic phrase as one continuous composite block', () => {
    const { context, calls } = createContext();

    drawXhsTypographyAccent(
      context,
      getXhsTypographyTemplate('comic').accent,
      [segment({ phraseX: 220, phraseWidth: 160, phraseText: '上海外滩' })],
      80,
    );

    expect(calls.fill).toHaveBeenCalledTimes(2);
    expect(calls.ellipse).not.toHaveBeenCalled();
    expect(calls.stroke).not.toHaveBeenCalled();
  });

  test('uses the whole visual line for scribble paint and only the phrase for green text', () => {
    const { context, calls } = createContext();
    const accent = getXhsTypographyTemplate('scribble').accent;
    const selected = segment({
      lineText: '后天早上海外滩',
      lineLeft: 100,
      lineWidth: 360,
      phraseX: 220,
      phraseWidth: 80,
      phraseText: '上海外滩',
      phrasePrefix: '后天早',
    });

    drawXhsTypographyAccent(context, accent, [selected], 80);
    expect(calls.beginPath).toHaveBeenCalledOnce();
    expect(calls.ellipse).not.toHaveBeenCalled();
    expect(calls.fill).toHaveBeenCalledOnce();

    drawXhsTypographyAccentText(context, accent, [selected]);
    expect(calls.fillText).toHaveBeenCalledOnce();
    expect(calls.fillText).toHaveBeenCalledWith('上海外滩', 220, 200);
  });

  test('draws scribble context, keyword, and suffix once with crisp colors', () => {
    const { context, calls } = createContext();
    const accent = getXhsTypographyTemplate('scribble').accent;
    const selected = segment({
      lineText: '后天早上海外滩回来',
      lineLeft: 100,
      phraseX: 160,
      phraseWidth: 80,
      phraseText: '上海外滩',
      phrasePrefix: '后天早',
    });

    drawXhsTypographyTextLine(
      context,
      selected.lineText,
      300,
      selected.lineTop,
      '#161616',
      accent,
      selected,
    );

    expect(calls.paintedText).toEqual([
      { text: '后天早', color: '#161616', x: 100, y: 200 },
      { text: '上海外滩', color: '#09b934', x: 160, y: 200 },
      { text: '回来', color: '#161616', x: 240, y: 200 },
    ]);
  });

  test('keeps one semantic highlight range when its rendering crosses a line', () => {
    const source = '这是上海外滩回来';
    const highlight = {
      text: '上海外滩',
      start: source.indexOf('上海外滩'),
      end: source.indexOf('上海外滩') + '上海外滩'.length,
    };

    const segments = findXhsTypographyHighlightSegments(
      ['这是上海', '外滩回来'],
      source,
      highlight,
    );

    expect(segments).toEqual([
      { lineIndex: 0, prefix: '这是', text: '上海' },
      { lineIndex: 1, prefix: '', text: '外滩' },
    ]);
    expect(segments.map(item => item.text).join('')).toBe(highlight.text);
  });

  test('continues to dispatch every existing accent kind', () => {
    const { context, calls } = createContext();
    const item = segment();

    drawXhsTypographyAccent(context, getXhsTypographyTemplate('framed').accent, [item], 80);
    drawXhsTypographyAccent(context, getXhsTypographyTemplate('doodle').accent, [item], 80);
    drawXhsTypographyAccent(context, getXhsTypographyTemplate('handwritten').accent, [item], 80);
    drawXhsTypographyAccent(context, getXhsTypographyTemplate('soft').accent, [item], 80);
    drawXhsTypographyAccent(context, getXhsTypographyTemplate('greeting-card').accent, [item], 80);

    expect(calls.stroke).toHaveBeenCalledTimes(5);
    expect(calls.ellipse).toHaveBeenCalledTimes(1);
  });

  test('repaints only the selected scribble phrase with the configured keyword color', () => {
    const { context, calls } = createContext();
    const accent = getXhsTypographyTemplate('scribble').accent;
    const selected = segment({
      lineText: '后天早上海外滩',
      phraseX: 220,
      phraseText: '上海外滩',
      phrasePrefix: '后天早',
    });

    drawXhsTypographyAccentText(context, accent, [selected]);

    expect(context.fillStyle).toBe('#09b934');
    expect(calls.fillText).toHaveBeenCalledOnce();
    expect(calls.fillText).toHaveBeenCalledWith('上海外滩', 220, 200);

    const basic = createContext();
    drawXhsTypographyAccentText(
      basic.context,
      getXhsTypographyTemplate('basic').accent,
      [selected],
    );
    expect(basic.calls.fillText).not.toHaveBeenCalled();
  });
});
