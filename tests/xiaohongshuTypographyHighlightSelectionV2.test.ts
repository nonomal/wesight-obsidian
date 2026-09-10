import { describe, expect, test } from 'vitest';

import {
  findXhsTypographyHighlightSegments,
  selectXhsTypographyHighlight,
} from '../src/xiaohongshu/typographyHighlight';

describe('xiaohongshu typography semantic highlight selection v2', () => {
  test('prefers a complete high-information noun phrase over uncertain metrics', () => {
    const source = 'Trae Work 贼全开源知识库上线，朋友说大约6 小时已有1.8 万访问！';

    expect(selectXhsTypographyHighlight(source)).toEqual({
      text: '开源知识库',
      start: source.indexOf('开源知识库'),
      end: source.indexOf('开源知识库') + '开源知识库'.length,
    });
  });

  test('keeps the result noun attached to a numeric highlight', () => {
    const source = '这篇文章已经有1.8万访问';

    expect(selectXhsTypographyHighlight(source)).toEqual({
      text: '1.8万访问',
      start: source.indexOf('1.8万访问'),
      end: source.indexOf('1.8万访问') + '1.8万访问'.length,
    });
  });

  test('keeps a complete topic ahead of a plain metric when both are available', () => {
    const source = '开源知识库，已经有1.8万访问';

    expect(selectXhsTypographyHighlight(source)?.text).toBe('开源知识库');
  });

  test('downranks numbers qualified by hearsay or approximation', () => {
    const source = '据说大约1.8万访问，本地知识库上线';

    expect(selectXhsTypographyHighlight(source)?.text).toBe('本地知识库');
  });

  test('removes low-information prefixes and trailing launch actions', () => {
    const source = '贼全开源知识库上线';
    const selected = selectXhsTypographyHighlight(source);

    expect(selected).toEqual({
      text: '开源知识库',
      start: 2,
      end: 7,
    });
    expect(source.slice(selected?.start, selected?.end)).toBe(selected?.text);
  });

  test('keeps a known place entity intact inside an ambiguous continuous sentence', () => {
    const source = '思目前破好后天早上海外滩回来\n好悠米尼哦哦哦';
    const start = source.indexOf('上海外滩');

    expect(selectXhsTypographyHighlight(source)).toEqual({
      text: '上海外滩',
      start,
      end: start + '上海外滩'.length,
    });
  });

  test.each([
    ['周末去了武汉光谷回来', '武汉光谷'],
    ['今天来到杭州西湖', '杭州西湖'],
    ['南京紫金山', '南京紫金山'],
    ['胡乱文本南京紫金山回来', '南京紫金山'],
    ['北京国家大剧院发布通知', '北京国家大剧院'],
  ])('recognizes an unknown location by context and geographic suffix: %s', (source, place) => {
    const start = source.indexOf(place);

    expect(selectXhsTypographyHighlight(source)).toEqual({
      text: place,
      start,
      end: start + place.length,
    });
  });

  test('keeps an unknown quoted proper name complete', () => {
    const source = '“星河计划”今天正式发布';
    const start = source.indexOf('星河计划');

    expect(selectXhsTypographyHighlight(source)).toEqual({
      text: '星河计划',
      start,
      end: start + '星河计划'.length,
    });
  });

  test('keeps a product and its topic together when they are adjacent', () => {
    const source = 'Nova Studio 写作助手正式发布';
    const text = 'Nova Studio 写作助手';

    expect(selectXhsTypographyHighlight(source)).toEqual({
      text,
      start: 0,
      end: text.length,
    });
  });

  test('selects a complete compound topic from a longer sentence', () => {
    const source = '我最近整理了一套面向创作者的本地知识库同步工作流上线';
    const text = '知识库同步工作流';
    const start = source.indexOf(text);

    expect(selectXhsTypographyHighlight(source)).toEqual({
      text,
      start,
      end: start + text.length,
    });
  });

  test('converges an overlong product topic to its complete concise theme', () => {
    const source = 'Nova Studio 写作助手知识库同步工作流正式发布';
    const text = '知识库同步工作流';
    const start = source.indexOf(text);

    expect(selectXhsTypographyHighlight(source)).toEqual({
      text,
      start,
      end: start + text.length,
    });
  });

  test('keeps a complete first-paragraph theme ahead of a later strong metric', () => {
    const source = '本地知识库同步工作流上线\r\n提升到1.8万访问';
    const text = '知识库同步工作流';
    const start = source.indexOf(text);

    expect(selectXhsTypographyHighlight(source)).toEqual({
      text,
      start,
      end: start + text.length,
    });
  });

  test('recognizes an announced unknown proper name conservatively', () => {
    const source = '今天灵犀方舟正式发布\r\n朋友说大约1.8万访问';
    const text = '灵犀方舟';
    const start = source.indexOf(text);

    expect(selectXhsTypographyHighlight(source)).toEqual({
      text,
      start,
      end: start + text.length,
    });
  });

  test('stops a location at the nearest complete landmark suffix', () => {
    const source = '今天去了上海外滩旁的公园回来';
    const text = '上海外滩';
    const start = source.indexOf(text);

    expect(selectXhsTypographyHighlight(source)).toEqual({
      text,
      start,
      end: start + text.length,
    });
  });

  test('keeps source indexes exact after emoji and CRLF before a repeated name', () => {
    const source = '👩‍💻开场\r\n今天灵犀方舟正式发布\r\n灵犀方舟';
    const text = '灵犀方舟';
    const start = source.indexOf(text);
    const selected = selectXhsTypographyHighlight(source);

    expect(selected).toEqual({ text, start, end: start + text.length });
    expect(source.slice(selected?.start, selected?.end)).toBe(text);
  });

  test.each([
    ['日均1.8万次调用已经稳定', '1.8万次调用'],
    ['完成了37%转化率提升', '37%转化率'],
  ])('extends an unfamiliar numeric result without consuming its action: %s', (source, result) => {
    const start = source.indexOf(result);

    expect(selectXhsTypographyHighlight(source)).toEqual({
      text: result,
      start,
      end: start + result.length,
    });
  });

  test.each([
    ['灵犀写作助手正式发布', '灵犀写作助手'],
    ['灵犀引擎刚刚上线了', '灵犀引擎'],
    ['本地知识库上线', '本地知识库'],
    ['这项任务用了3天上线', '3天'],
  ])('stops a highlight before a trailing action: %s', (source, text) => {
    expect(selectXhsTypographyHighlight(source)?.text).toBe(text);
  });

  test.each([
    '开源上线',
    '朋友说大约3小时左右',
    '这个真的很不错',
    '努力成长乐园',
  ])('omits a highlight for low-confidence copy: %s', source => {
    expect(selectXhsTypographyHighlight(source)).toBeNull();
  });

  test.each(['朋友说', '大约', '约', '据说', '可能', '预计'])(
    'does not highlight an unsupported uncertain metric: %s',
    qualifier => {
      expect(selectXhsTypographyHighlight(`${qualifier}1.8万访问`)).toBeNull();
    },
  );

  test('preserves exact source indexes and graphemes across CRLF wrapping', () => {
    const source = '开源👩‍💻\r\n知识库';
    const text = '👩‍💻\r\n知识库';
    const start = source.indexOf(text);
    const highlight = { text, start, end: start + text.length };

    expect(findXhsTypographyHighlightSegments(
      ['开源👩‍💻', '知识库'],
      source,
      highlight,
    )).toEqual([
      { lineIndex: 0, prefix: '开源', text: '👩‍💻' },
      { lineIndex: 1, prefix: '', text: '知识库' },
    ]);
  });
});
