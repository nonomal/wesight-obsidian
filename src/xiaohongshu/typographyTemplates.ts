import basicReference from '../../assets/xiaohongshu/typography/references/basic.jpg';
import basicBackground from '../../assets/xiaohongshu/typography/backgrounds/basic-clean.png';
import bookExcerptReference from '../../assets/xiaohongshu/typography/references/book-excerpt.jpg';
import comicBackground from '../../assets/xiaohongshu/typography/backgrounds/comic-clean.png';
import comicReference from '../../assets/xiaohongshu/typography/references/comic.jpg';
import diffuseReference from '../../assets/xiaohongshu/typography/references/diffuse.jpg';
import doodleReference from '../../assets/xiaohongshu/typography/references/doodle.jpg';
import framedReference from '../../assets/xiaohongshu/typography/references/framed.jpg';
import freshReference from '../../assets/xiaohongshu/typography/references/fresh.jpg';
import geometricReference from '../../assets/xiaohongshu/typography/references/geometric.jpg';
import greetingCardReference from '../../assets/xiaohongshu/typography/references/greeting-card.jpg';
import handwrittenReference from '../../assets/xiaohongshu/typography/references/handwritten.png';
import illustratedBackground from '../../assets/xiaohongshu/typography/backgrounds/illustrated-clean.png';
import illustratedReference from '../../assets/xiaohongshu/typography/references/illustrated.jpg';
import journalReference from '../../assets/xiaohongshu/typography/references/journal.jpg';
import lightShadowCleanReference from '../../assets/xiaohongshu/typography/references/light-shadow-clean.png';
import lightShadowReference from '../../assets/xiaohongshu/typography/references/light-shadow.jpg';
import memoReference from '../../assets/xiaohongshu/typography/references/memo.jpg';
import minimalBackground from '../../assets/xiaohongshu/typography/backgrounds/minimal-clean.png';
import minimalReference from '../../assets/xiaohongshu/typography/references/minimal.jpg';
import notesReference from '../../assets/xiaohongshu/typography/references/notes.jpg';
import printReference from '../../assets/xiaohongshu/typography/references/print.jpg';
import scribbleBackground from '../../assets/xiaohongshu/typography/backgrounds/scribble-clean.png';
import scribbleReference from '../../assets/xiaohongshu/typography/references/scribble.jpg';
import softReference from '../../assets/xiaohongshu/typography/references/soft.jpg';
import stickyNoteReference from '../../assets/xiaohongshu/typography/references/sticky-note.jpg';
import techReference from '../../assets/xiaohongshu/typography/references/tech.jpg';
import maShanZhengFont from '../../assets/xiaohongshu/fonts/MaShanZheng-Regular.woff2';
import notoSansScFont from '../../assets/xiaohongshu/fonts/NotoSansSC-GB2312.woff2';
import notoSerifScFont from '../../assets/xiaohongshu/fonts/NotoSerifSC-GB2312.woff2';
import zcoolKuaiLeFont from '../../assets/xiaohongshu/fonts/ZCOOLKuaiLe-Regular.woff2';

import { toXhsPlainText } from './copy';
import {
  findXhsTypographyHighlightSegments,
  selectXhsTypographyHighlight,
  splitXhsTypographyGraphemes,
  type XhsTypographyHighlightRange,
} from './typographyHighlight';

export const XHS_TYPOGRAPHY_TEMPLATE_IDS = [
  'basic',
  'comic',
  'illustrated',
  'minimal',
  'scribble',
  'sticky-note',
  'geometric',
  'framed',
  'handwritten',
  'diffuse',
  'doodle',
  'memo',
  'fresh',
  'book-excerpt',
  'tech',
  'light-shadow',
  'journal',
  'print',
  'notes',
  'soft',
  'greeting-card',
] as const;

export type XhsTypographyTemplateId = (typeof XHS_TYPOGRAPHY_TEMPLATE_IDS)[number];

type TypographyFontKind =
  | 'sans'
  | 'serif'
  | 'hand'
  | 'mono'
  | 'noto-sans-sc'
  | 'zcool-kuaile'
  | 'noto-serif-sc'
  | 'ma-shan-zheng';
type TypographyAlignment = 'left' | 'center' | 'right';
type TypographyMaskMode = 'stretch' | 'pattern';
type TypographyAccentScope = 'phrase' | 'grapheme' | 'line';
export type XhsTypographyHighlightWrapMode =
  | 'natural'
  | 'isolate'
  | 'break-after'
  | 'balanced'
  | 'lead-context';

interface XhsTypographyAccentGeometry {
  scope?: TypographyAccentScope;
  /** Height in em units relative to the rendered font size. */
  height?: number;
  /** Top offset in em units relative to the visual line top. */
  offset?: number;
  /** Horizontal extension in em units relative to the rendered font size. */
  bleed?: number;
  /** Corner radius in em units relative to the rendered font size. */
  radius?: number;
  /** Deterministic edge variation, expressed as a fraction of the accent height. */
  roughness?: number;
  opacity?: number;
  textColor?: string;
}

export type XhsTypographyAccent =
  | { kind: 'none'; color: string }
  | ({ kind: 'marker'; color: string; shape?: 'band' | 'block' | 'brush' } & XhsTypographyAccentGeometry)
  | ({ kind: 'underline'; color: string; shape?: 'line' | 'hand-drawn' } & XhsTypographyAccentGeometry)
  | ({ kind: 'double-underline'; color: string } & XhsTypographyAccentGeometry)
  | ({ kind: 'circle'; color: string; shape?: 'outline' | 'glyphs' } & XhsTypographyAccentGeometry)
  | ({ kind: 'wave'; color: string } & XhsTypographyAccentGeometry);

export interface XhsTypographyPoint {
  x: number;
  y: number;
}

export interface XhsTypographyRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface XhsTypographyMask {
  target: XhsTypographyRect;
  source: XhsTypographyRect;
  mode?: TypographyMaskMode;
}

interface XhsTypographyTextSlot {
  rect: XhsTypographyRect;
  font: TypographyFontKind;
  fontSize: number;
  minFontSize: number;
  weight: number;
  color: string;
  lineHeight: number;
  maxLines: number;
  align?: TypographyAlignment;
}

export interface XhsTypographyUnifiedLayout {
  rect: XhsTypographyRect;
  fontSize: number;
  minFontSize: number;
  lineHeight: number;
  maxLines: number;
  highlightWrap: XhsTypographyHighlightWrapMode;
  align?: TypographyAlignment;
}

export interface XhsTypographyTemplate {
  id: XhsTypographyTemplateId;
  label: string;
  description: string;
  referenceImage: string;
  backgroundImage?: string;
  masks: XhsTypographyMask[];
  title: XhsTypographyTextSlot;
  body: XhsTypographyTextSlot;
  unified?: XhsTypographyUnifiedLayout;
  accent: XhsTypographyAccent;
}

export interface XhsTypographyPageInput {
  text: string;
  pageNumber: number;
  pageCount: number;
}

const rect = (x: number, y: number, width: number, height: number): XhsTypographyRect => ({
  x,
  y,
  width,
  height,
});

const mask = (
  target: XhsTypographyRect,
  source: XhsTypographyRect,
  mode: TypographyMaskMode = 'stretch',
): XhsTypographyMask => ({ target, source, mode });

const slot = (
  value: Omit<XhsTypographyTextSlot, 'align'> & { align?: TypographyAlignment },
): XhsTypographyTextSlot => value;

const FOCUS_LINE_BREAK = '\u2028';

export const XHS_TYPOGRAPHY_TEMPLATES: XhsTypographyTemplate[] = [
  {
    id: 'basic',
    label: '基础',
    description: '淡紫底色、大引号与绿色荧光强调',
    referenceImage: basicReference,
    backgroundImage: basicBackground,
    masks: [],
    title: slot({ rect: rect(0.12, 0.285, 0.68, 0.23), font: 'noto-sans-sc', fontSize: 72, minFontSize: 48, weight: 700, color: '#3f3a49', lineHeight: 1.24, maxLines: 3 }),
    body: slot({ rect: rect(0.12, 0.615, 0.68, 0.08), font: 'noto-sans-sc', fontSize: 54, minFontSize: 34, weight: 600, color: '#3f3a49', lineHeight: 1.35, maxLines: 2 }),
    unified: { rect: rect(0.125, 0.30, 0.75, 0.39), fontSize: 66, minFontSize: 42, lineHeight: 1.31, maxLines: 5, highlightWrap: 'isolate' },
    accent: {
      kind: 'marker',
      color: '#91ee55',
      shape: 'band',
      scope: 'phrase',
      height: 0.24,
      offset: 0.72,
      bleed: 0.035,
      radius: 0.035,
      opacity: 0.88,
    },
  },
  {
    id: 'comic',
    label: '美漫',
    description: '淡粉漫画排版与底部人物插画',
    referenceImage: comicReference,
    backgroundImage: comicBackground,
    masks: [],
    title: slot({ rect: rect(0.105, 0.115, 0.77, 0.245), font: 'zcool-kuaile', fontSize: 68, minFontSize: 44, weight: 400, color: '#171717', lineHeight: 1.22, maxLines: 3 }),
    body: slot({ rect: rect(0.105, 0.455, 0.70, 0.085), font: 'zcool-kuaile', fontSize: 48, minFontSize: 32, weight: 400, color: '#171717', lineHeight: 1.32, maxLines: 2 }),
    unified: { rect: rect(0.116, 0.13, 0.76, 0.40), fontSize: 68, minFontSize: 42, lineHeight: 1.32, maxLines: 5, highlightWrap: 'isolate' },
    accent: {
      kind: 'marker',
      color: '#ff9698',
      shape: 'block',
      scope: 'phrase',
      height: 0.96,
      offset: 0.04,
      bleed: 0.14,
      radius: 0.14,
      roughness: 0.08,
      opacity: 0.80,
    },
  },
  {
    id: 'illustrated',
    label: '插图',
    description: '圆点纸张与人物插图',
    referenceImage: illustratedReference,
    backgroundImage: illustratedBackground,
    masks: [],
    title: slot({ rect: rect(0.10, 0.115, 0.79, 0.225), font: 'noto-sans-sc', fontSize: 66, minFontSize: 42, weight: 700, color: '#202020', lineHeight: 1.25, maxLines: 3 }),
    body: slot({ rect: rect(0.10, 0.410, 0.75, 0.085), font: 'noto-sans-sc', fontSize: 44, minFontSize: 30, weight: 600, color: '#242424', lineHeight: 1.35, maxLines: 2 }),
    unified: { rect: rect(0.105, 0.13, 0.80, 0.38), fontSize: 66, minFontSize: 42, lineHeight: 1.27, maxLines: 5, highlightWrap: 'balanced' },
    accent: {
      kind: 'underline',
      color: '#6edc42',
      shape: 'hand-drawn',
      scope: 'phrase',
      height: 0.46,
      offset: 0.58,
      bleed: 0.04,
      roughness: 0.10,
      opacity: 0.90,
    },
  },
  {
    id: 'minimal',
    label: '简约',
    description: '方格纸、衬线文字与克制强调',
    referenceImage: minimalReference,
    backgroundImage: minimalBackground,
    masks: [],
    title: slot({ rect: rect(0.10, 0.265, 0.78, 0.28), font: 'noto-serif-sc', fontSize: 64, minFontSize: 40, weight: 600, color: '#171717', lineHeight: 1.3, maxLines: 3 }),
    body: slot({ rect: rect(0.10, 0.640, 0.78, 0.09), font: 'noto-serif-sc', fontSize: 46, minFontSize: 30, weight: 600, color: '#171717', lineHeight: 1.35, maxLines: 2 }),
    unified: { rect: rect(0.107, 0.28, 0.78, 0.47), fontSize: 79, minFontSize: 46, lineHeight: 1.30, maxLines: 5, highlightWrap: 'isolate' },
    accent: {
      kind: 'circle',
      color: '#8cf2fa',
      shape: 'glyphs',
      scope: 'grapheme',
      height: 1.16,
      offset: -0.03,
      bleed: 0.10,
      roughness: 0.025,
      opacity: 0.72,
    },
  },
  {
    id: 'scribble',
    label: '涂写',
    description: '居中手写字与蓝色粗笔刷',
    referenceImage: scribbleReference,
    backgroundImage: scribbleBackground,
    masks: [],
    title: slot({ rect: rect(0.12, 0.255, 0.76, 0.285), font: 'ma-shan-zheng', fontSize: 68, minFontSize: 42, weight: 700, color: '#161616', lineHeight: 1.28, maxLines: 3, align: 'center' }),
    body: slot({ rect: rect(0.12, 0.655, 0.76, 0.095), font: 'ma-shan-zheng', fontSize: 50, minFontSize: 32, weight: 700, color: '#161616', lineHeight: 1.34, maxLines: 2, align: 'center' }),
    unified: { rect: rect(0.11, 0.27, 0.78, 0.50), fontSize: 92, minFontSize: 50, lineHeight: 1.20, maxLines: 5, highlightWrap: 'lead-context', align: 'center' },
    accent: {
      kind: 'marker',
      color: '#c7f2f6',
      shape: 'brush',
      scope: 'line',
      height: 1.16,
      offset: 0.02,
      bleed: 0.34,
      radius: 0.50,
      roughness: 0.07,
      opacity: 0.64,
      textColor: '#09b934',
    },
  },
  {
    id: 'sticky-note',
    label: '便签',
    description: '黄色 Sticky Notes 与横线纸张',
    referenceImage: stickyNoteReference,
    masks: [
      mask(rect(0.08, 0.18, 0.84, 0.31), rect(0.70, 0.72, 0.16, 0.10), 'pattern'),
      mask(rect(0.08, 0.49, 0.84, 0.21), rect(0.70, 0.72, 0.16, 0.10), 'pattern'),
    ],
    title: slot({ rect: rect(0.11, 0.305, 0.74, 0.28), font: 'hand', fontSize: 64, minFontSize: 40, weight: 600, color: '#181818', lineHeight: 1.38, maxLines: 3 }),
    body: slot({ rect: rect(0.11, 0.700, 0.70, 0.09), font: 'hand', fontSize: 46, minFontSize: 30, weight: 500, color: '#373737', lineHeight: 1.45, maxLines: 2 }),
    accent: { kind: 'marker', color: '#b6ed61' },
  },
  {
    id: 'geometric',
    label: '几何',
    description: '紫色底、荧光引号与高对比色块',
    referenceImage: geometricReference,
    masks: [
      mask(rect(0.04, 0.20, 0.92, 0.34), rect(0.14, 0.08, 0.18, 0.10)),
      mask(rect(0.04, 0.53, 0.92, 0.20), rect(0.14, 0.08, 0.18, 0.10)),
    ],
    title: slot({ rect: rect(0.10, 0.315, 0.78, 0.30), font: 'sans', fontSize: 72, minFontSize: 46, weight: 800, color: '#ffffff', lineHeight: 1.22, maxLines: 3 }),
    body: slot({ rect: rect(0.10, 0.735, 0.79, 0.095), font: 'sans', fontSize: 50, minFontSize: 32, weight: 700, color: '#ffffff', lineHeight: 1.34, maxLines: 2 }),
    accent: { kind: 'marker', color: '#d9ff1e' },
  },
  {
    id: 'framed',
    label: '边框',
    description: '橙色外框与多层白色卡纸',
    referenceImage: framedReference,
    masks: [
      mask(rect(0.09, 0.26, 0.82, 0.29), rect(0.68, 0.72, 0.18, 0.10)),
      mask(rect(0.09, 0.53, 0.82, 0.19), rect(0.68, 0.72, 0.18, 0.10)),
    ],
    title: slot({ rect: rect(0.146, 0.381, 0.624, 0.217), font: 'sans', fontSize: 64, minFontSize: 40, weight: 800, color: '#111111', lineHeight: 1.28, maxLines: 3 }),
    body: slot({ rect: rect(0.146, 0.706, 0.546, 0.054), font: 'sans', fontSize: 45, minFontSize: 30, weight: 600, color: '#161616', lineHeight: 1.35, maxLines: 2 }),
    accent: { kind: 'underline', color: '#20c9c7' },
  },
  {
    id: 'handwritten',
    label: '手写',
    description: '浅绿格纹、红色圈线与花朵涂鸦',
    referenceImage: handwrittenReference,
    masks: [
      mask(rect(0.05, 0.14, 0.90, 0.37), rect(0.68, 0.08, 0.18, 0.11), 'pattern'),
      mask(rect(0.05, 0.50, 0.90, 0.21), rect(0.68, 0.08, 0.18, 0.11), 'pattern'),
    ],
    title: slot({ rect: rect(0.133, 0.232, 0.774, 0.304), font: 'hand', fontSize: 66, minFontSize: 40, weight: 500, color: '#7b3b22', lineHeight: 1.34, maxLines: 3 }),
    body: slot({ rect: rect(0.130, 0.688, 0.780, 0.076), font: 'hand', fontSize: 48, minFontSize: 30, weight: 500, color: '#7b3b22', lineHeight: 1.42, maxLines: 2 }),
    accent: { kind: 'circle', color: '#e75a55' },
  },
  {
    id: 'diffuse',
    label: '弥散',
    description: '白紫弥散背景与底部贴纸',
    referenceImage: diffuseReference,
    masks: [
      mask(rect(0.06, 0.14, 0.88, 0.31), rect(0.65, 0.62, 0.22, 0.12)),
      mask(rect(0.06, 0.45, 0.88, 0.20), rect(0.65, 0.62, 0.22, 0.12)),
    ],
    title: slot({ rect: rect(0.093, 0.181, 0.822, 0.226), font: 'sans', fontSize: 66, minFontSize: 42, weight: 650, color: '#454054', lineHeight: 1.3, maxLines: 3, align: 'center' }),
    body: slot({ rect: rect(0.215, 0.524, 0.576, 0.056), font: 'sans', fontSize: 44, minFontSize: 28, weight: 550, color: '#4c4658', lineHeight: 1.38, maxLines: 2, align: 'center' }),
    accent: { kind: 'underline', color: '#b9df5c' },
  },
  {
    id: 'doodle',
    label: '涂鸦',
    description: '粉色箭头、线条与建筑贴纸',
    referenceImage: doodleReference,
    masks: [
      mask(rect(0.06, 0.13, 0.88, 0.33), rect(0.66, 0.68, 0.20, 0.11)),
      mask(rect(0.06, 0.46, 0.88, 0.20), rect(0.66, 0.68, 0.20, 0.11)),
    ],
    title: slot({ rect: rect(0.126, 0.208, 0.667, 0.233), font: 'sans', fontSize: 66, minFontSize: 40, weight: 700, color: '#161616', lineHeight: 1.28, maxLines: 3 }),
    body: slot({ rect: rect(0.128, 0.557, 0.583, 0.058), font: 'sans', fontSize: 46, minFontSize: 30, weight: 650, color: '#161616', lineHeight: 1.36, maxLines: 2 }),
    accent: { kind: 'double-underline', color: '#ef848d' },
  },
  {
    id: 'memo',
    label: '备忘',
    description: 'iOS Notes 结构与黄色选中标记',
    referenceImage: memoReference,
    masks: [
      mask(rect(0.06, 0.17, 0.88, 0.31), rect(0.68, 0.70, 0.18, 0.10), 'pattern'),
      mask(rect(0.06, 0.47, 0.88, 0.18), rect(0.68, 0.70, 0.18, 0.10), 'pattern'),
    ],
    title: slot({ rect: rect(0.085, 0.265, 0.711, 0.211), font: 'sans', fontSize: 60, minFontSize: 38, weight: 500, color: '#171717', lineHeight: 1.3, maxLines: 3 }),
    body: slot({ rect: rect(0.087, 0.588, 0.494, 0.05), font: 'sans', fontSize: 42, minFontSize: 28, weight: 450, color: '#191919', lineHeight: 1.38, maxLines: 2 }),
    accent: { kind: 'marker', color: '#f3df6b' },
  },
  {
    id: 'fresh',
    label: '清新',
    description: '浅蓝格纹、深蓝文字与奶茶贴纸',
    referenceImage: freshReference,
    masks: [
      mask(rect(0.06, 0.18, 0.88, 0.34), rect(0.08, 0.06, 0.17, 0.10), 'pattern'),
      mask(rect(0.06, 0.51, 0.88, 0.20), rect(0.08, 0.06, 0.17, 0.10), 'pattern'),
    ],
    title: slot({ rect: rect(0.109, 0.236, 0.767, 0.272), font: 'sans', fontSize: 66, minFontSize: 42, weight: 700, color: '#214a7b', lineHeight: 1.28, maxLines: 3 }),
    body: slot({ rect: rect(0.111, 0.646, 0.670, 0.067), font: 'sans', fontSize: 46, minFontSize: 30, weight: 650, color: '#214a7b', lineHeight: 1.36, maxLines: 2 }),
    accent: { kind: 'underline', color: '#ea8a59' },
  },
  {
    id: 'book-excerpt',
    label: '书摘',
    description: '纸张纹理、绿色文字与日期',
    referenceImage: bookExcerptReference,
    masks: [
      mask(rect(0.05, 0.16, 0.90, 0.35), rect(0.65, 0.12, 0.18, 0.11), 'pattern'),
      mask(rect(0.05, 0.50, 0.90, 0.21), rect(0.65, 0.12, 0.18, 0.11), 'pattern'),
    ],
    title: slot({ rect: rect(0.167, 0.326, 0.674, 0.257), font: 'serif', fontSize: 62, minFontSize: 38, weight: 600, color: '#2c7b22', lineHeight: 1.34, maxLines: 3 }),
    body: slot({ rect: rect(0.167, 0.715, 0.663, 0.064), font: 'serif', fontSize: 45, minFontSize: 29, weight: 550, color: '#2c7b22', lineHeight: 1.4, maxLines: 2 }),
    accent: { kind: 'underline', color: '#5fb65c' },
  },
  {
    id: 'tech',
    label: '科技',
    description: '深色网格、像素文字与蓝绿装饰',
    referenceImage: techReference,
    masks: [
      mask(rect(0.05, 0.16, 0.90, 0.35), rect(0.65, 0.70, 0.22, 0.10), 'pattern'),
      mask(rect(0.05, 0.50, 0.90, 0.23), rect(0.65, 0.70, 0.22, 0.10), 'pattern'),
    ],
    title: slot({ rect: rect(0.086, 0.228, 0.760, 0.270), font: 'mono', fontSize: 62, minFontSize: 38, weight: 600, color: '#eef1ff', lineHeight: 1.28, maxLines: 3 }),
    body: slot({ rect: rect(0.086, 0.600, 0.700, 0.095), font: 'mono', fontSize: 44, minFontSize: 28, weight: 500, color: '#eef1ff', lineHeight: 1.38, maxLines: 2 }),
    accent: { kind: 'underline', color: '#4e79ff' },
  },
  {
    id: 'light-shadow',
    label: '光影',
    description: '灰白纸张光影与宋体排版',
    referenceImage: lightShadowReference,
    backgroundImage: lightShadowCleanReference,
    masks: [],
    title: slot({ rect: rect(0.142, 0.225, 0.720, 0.305), font: 'serif', fontSize: 64, minFontSize: 40, weight: 500, color: '#181818', lineHeight: 1.32, maxLines: 3 }),
    body: slot({ rect: rect(0.142, 0.655, 0.700, 0.100), font: 'serif', fontSize: 44, minFontSize: 28, weight: 450, color: '#181818', lineHeight: 1.4, maxLines: 2 }),
    accent: { kind: 'underline', color: '#a34b3f' },
  },
  {
    id: 'journal',
    label: '手帐',
    description: '撕纸、胶带与蓝色横线纸',
    referenceImage: journalReference,
    masks: [
      mask(rect(0.08, 0.18, 0.84, 0.32), rect(0.44, 0.53, 0.18, 0.09), 'pattern'),
      mask(rect(0.08, 0.49, 0.84, 0.21), rect(0.44, 0.53, 0.18, 0.09), 'pattern'),
    ],
    title: slot({ rect: rect(0.102, 0.274, 0.710, 0.275), font: 'sans', fontSize: 64, minFontSize: 40, weight: 700, color: '#171717', lineHeight: 1.28, maxLines: 3 }),
    body: slot({ rect: rect(0.102, 0.670, 0.700, 0.105), font: 'sans', fontSize: 44, minFontSize: 28, weight: 600, color: '#171717', lineHeight: 1.36, maxLines: 2 }),
    accent: { kind: 'marker', color: '#f0d844' },
  },
  {
    id: 'print',
    label: '印刷',
    description: '米黄纸张、拼贴纸块与邮戳',
    referenceImage: printReference,
    masks: [
      mask(rect(0.10, 0.24, 0.80, 0.31), rect(0.66, 0.70, 0.19, 0.10)),
      mask(rect(0.10, 0.53, 0.80, 0.19), rect(0.66, 0.70, 0.19, 0.10)),
    ],
    title: slot({ rect: rect(0.162, 0.335, 0.600, 0.220), font: 'serif', fontSize: 62, minFontSize: 38, weight: 700, color: '#171717', lineHeight: 1.3, maxLines: 3 }),
    body: slot({ rect: rect(0.162, 0.635, 0.600, 0.105), font: 'serif', fontSize: 44, minFontSize: 28, weight: 600, color: '#171717', lineHeight: 1.38, maxLines: 2 }),
    accent: { kind: 'underline', color: '#e3c823' },
  },
  {
    id: 'notes',
    label: '札记',
    description: '浅绿色水彩纸张与绿色印刷文字',
    referenceImage: notesReference,
    masks: [
      mask(rect(0.05, 0.20, 0.90, 0.31), rect(0.65, 0.70, 0.22, 0.11)),
      mask(rect(0.05, 0.51, 0.90, 0.20), rect(0.65, 0.70, 0.22, 0.11)),
    ],
    title: slot({ rect: rect(0.050, 0.292, 0.860, 0.245), font: 'serif', fontSize: 62, minFontSize: 38, weight: 550, color: '#4f8f19', lineHeight: 1.32, maxLines: 3 }),
    body: slot({ rect: rect(0.050, 0.628, 0.700, 0.105), font: 'serif', fontSize: 44, minFontSize: 28, weight: 500, color: '#4f8f19', lineHeight: 1.4, maxLines: 2 }),
    accent: { kind: 'underline', color: '#6c9f31' },
  },
  {
    id: 'soft',
    label: '柔和',
    description: '米白底、酒红文字与蓝色波浪线',
    referenceImage: softReference,
    masks: [
      mask(rect(0.06, 0.20, 0.88, 0.32), rect(0.68, 0.12, 0.20, 0.10)),
      mask(rect(0.06, 0.51, 0.88, 0.21), rect(0.68, 0.12, 0.20, 0.10)),
    ],
    title: slot({ rect: rect(0.108, 0.252, 0.790, 0.285), font: 'serif', fontSize: 64, minFontSize: 40, weight: 600, color: '#8f241d', lineHeight: 1.3, maxLines: 3 }),
    body: slot({ rect: rect(0.108, 0.645, 0.720, 0.105), font: 'serif', fontSize: 46, minFontSize: 30, weight: 550, color: '#8f241d', lineHeight: 1.38, maxLines: 2 }),
    accent: { kind: 'wave', color: '#4f78e7' },
  },
  {
    id: 'greeting-card',
    label: '贺卡',
    description: '浅黄色纸张、祝福语与饮料杯插画',
    referenceImage: greetingCardReference,
    masks: [
      mask(rect(0.07, 0.13, 0.86, 0.37), rect(0.66, 0.52, 0.20, 0.10), 'pattern'),
      mask(rect(0.07, 0.48, 0.86, 0.19), rect(0.66, 0.52, 0.20, 0.10), 'pattern'),
    ],
    title: slot({ rect: rect(0.123, 0.135, 0.630, 0.285), font: 'serif', fontSize: 66, minFontSize: 40, weight: 600, color: '#4f1e16', lineHeight: 1.32, maxLines: 3 }),
    body: slot({ rect: rect(0.123, 0.535, 0.620, 0.105), font: 'serif', fontSize: 46, minFontSize: 30, weight: 550, color: '#4f1e16', lineHeight: 1.38, maxLines: 2 }),
    accent: { kind: 'none', color: '#e7b6a8' },
  },
];

const TEMPLATE_BY_ID = new Map<XhsTypographyTemplateId, XhsTypographyTemplate>(
  XHS_TYPOGRAPHY_TEMPLATES.map(template => [template.id, template]),
);

const IMAGE_CACHE = new Map<string, Promise<HTMLImageElement>>();
const FONT_LOAD_CACHE = new Map<string, Promise<void>>();

export const XHS_HANDWRITING_FONT_FAMILY = 'WeSight Ma Shan Zheng';
const XHS_NOTO_SANS_SC_FONT_FAMILY = 'WeSight Noto Sans SC';
const XHS_ZCOOL_KUAILE_FONT_FAMILY = 'WeSight ZCOOL KuaiLe';
const XHS_NOTO_SERIF_SC_FONT_FAMILY = 'WeSight Noto Serif SC';

const FONT_FAMILIES: Record<TypographyFontKind, string> = {
  sans: '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
  serif: '"Songti SC", "STSong", "Noto Serif CJK SC", serif',
  hand: `"${XHS_HANDWRITING_FONT_FAMILY}", "HanziPen SC", "Xingkai SC", "STXingkai", "Kaiti SC", "STKaiti", "KaiTi", cursive`,
  mono: '"SFMono-Regular", Menlo, Consolas, monospace',
  'noto-sans-sc': `"${XHS_NOTO_SANS_SC_FONT_FAMILY}", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`,
  'zcool-kuaile': `"${XHS_ZCOOL_KUAILE_FONT_FAMILY}", "ZCOOL KuaiLe", "PingFang SC", "Microsoft YaHei", sans-serif`,
  'noto-serif-sc': `"${XHS_NOTO_SERIF_SC_FONT_FAMILY}", "Noto Serif SC", "Songti SC", "STSong", serif`,
  'ma-shan-zheng': `"${XHS_HANDWRITING_FONT_FAMILY}", "Ma Shan Zheng", "HanziPen SC", "Xingkai SC", "STXingkai", cursive`,
};

const BUNDLED_FONTS: Partial<Record<TypographyFontKind, {
  family: string;
  source: string;
  declaredWeight: string;
  loadWeight: number;
}>> = {
  hand: {
    family: XHS_HANDWRITING_FONT_FAMILY,
    source: maShanZhengFont,
    declaredWeight: '400',
    loadWeight: 400,
  },
  'ma-shan-zheng': {
    family: XHS_HANDWRITING_FONT_FAMILY,
    source: maShanZhengFont,
    declaredWeight: '400',
    loadWeight: 400,
  },
  'noto-sans-sc': {
    family: XHS_NOTO_SANS_SC_FONT_FAMILY,
    source: notoSansScFont,
    declaredWeight: '100 900',
    loadWeight: 700,
  },
  'zcool-kuaile': {
    family: XHS_ZCOOL_KUAILE_FONT_FAMILY,
    source: zcoolKuaiLeFont,
    declaredWeight: '400',
    loadWeight: 400,
  },
  'noto-serif-sc': {
    family: XHS_NOTO_SERIF_SC_FONT_FAMILY,
    source: notoSerifScFont,
    declaredWeight: '200 900',
    loadWeight: 600,
  },
};

export function getXhsTypographyTemplate(styleId: string): XhsTypographyTemplate {
  return TEMPLATE_BY_ID.get(styleId as XhsTypographyTemplateId) ?? XHS_TYPOGRAPHY_TEMPLATES[0];
}

export function isXhsTypographyTemplate(styleId: string): styleId is XhsTypographyTemplateId {
  return TEMPLATE_BY_ID.has(styleId as XhsTypographyTemplateId);
}

export function getXhsTypographyFontFamily(styleId: string): string {
  return FONT_FAMILIES[getXhsTypographyTemplate(styleId).title.font];
}

export function applyXhsTypographyFocusBreaks(
  value: string,
  highlight: XhsTypographyHighlightRange | null,
  styleIdOrMode: string,
): string {
  if (
    !highlight
    || highlight.start < 0
    || highlight.end <= highlight.start
    || highlight.end > value.length
    || value.slice(highlight.start, highlight.end) !== highlight.text
  ) return value;

  const mode = isHighlightWrapMode(styleIdOrMode)
    ? styleIdOrMode
    : TEMPLATE_BY_ID.get(styleIdOrMode as XhsTypographyTemplateId)?.unified?.highlightWrap
      ?? 'natural';
  if (mode === 'natural') return value;

  const paragraphStart = findParagraphStart(value, highlight.start);
  const paragraphEnd = findParagraphEnd(value, highlight.end);
  const insertions: number[] = [];

  if (mode === 'isolate') {
    if (value.slice(paragraphStart, highlight.start).trim()) {
      insertions.push(highlight.start);
    }
  } else if (mode === 'balanced') {
    const splitIndex = findBalancedHighlightSplitIndex(highlight);
    if (splitIndex !== null) insertions.push(splitIndex);
  } else if (mode === 'lead-context') {
    const contextStart = findLeadingContextStart(
      value,
      paragraphStart,
      highlight.start,
      3,
    );
    if (value.slice(paragraphStart, contextStart).trim()) {
      insertions.push(contextStart);
    }
  }

  if (value.slice(highlight.end, paragraphEnd).trim()) {
    insertions.push(highlight.end);
  }

  return insertSoftBreaks(value, insertions);
}

function findBalancedHighlightSplitIndex(
  highlight: XhsTypographyHighlightRange,
): number | null {
  const graphemes = splitXhsTypographyGraphemes(highlight.text);
  if (
    graphemes.length < 4
    || graphemes.length > 8
    || graphemes.some(grapheme => !/^\p{Script=Han}$/u.test(grapheme.text))
  ) return null;
  const splitAt = Math.floor(graphemes.length / 2);
  return highlight.start + graphemes[splitAt].start;
}

function isHighlightWrapMode(value: string): value is XhsTypographyHighlightWrapMode {
  return value === 'natural'
    || value === 'isolate'
    || value === 'break-after'
    || value === 'balanced'
    || value === 'lead-context';
}

function findParagraphStart(value: string, index: number): number {
  return Math.max(
    value.lastIndexOf('\n', index - 1),
    value.lastIndexOf(FOCUS_LINE_BREAK, index - 1),
  ) + 1;
}

function findParagraphEnd(value: string, index: number): number {
  const hardBreak = value.indexOf('\n', index);
  const focusBreak = value.indexOf(FOCUS_LINE_BREAK, index);
  const candidates = [hardBreak, focusBreak].filter(position => position >= 0);
  return candidates.length ? Math.min(...candidates) : value.length;
}

function findLeadingContextStart(
  value: string,
  paragraphStart: number,
  highlightStart: number,
  graphemeCount: number,
): number {
  const prefix = value.slice(paragraphStart, highlightStart);
  const visible = splitXhsTypographyGraphemes(prefix)
    .filter(grapheme => !/^\s+$/u.test(grapheme.text));
  const first = visible[Math.max(0, visible.length - graphemeCount)];
  return first ? paragraphStart + first.start : highlightStart;
}

function insertSoftBreaks(value: string, indexes: number[]): string {
  return Array.from(new Set(indexes))
    .filter(index => (
      index > 0
      && index < value.length
      && value[index - 1] !== FOCUS_LINE_BREAK
      && value[index - 1] !== '\n'
      && value[index] !== FOCUS_LINE_BREAK
      && value[index] !== '\n'
    ))
    .sort((left, right) => right - left)
    .reduce(
      (output, index) => `${output.slice(0, index)}${FOCUS_LINE_BREAK}${output.slice(index)}`,
      value,
    );
}

async function ensureTypographyFont(font: TypographyFontKind, sample: string): Promise<void> {
  const definition = BUNDLED_FONTS[font];
  if (
    !definition
    || typeof document === 'undefined'
    || typeof FontFace === 'undefined'
    || !document.fonts
  ) return;

  let fontLoad = FONT_LOAD_CACHE.get(definition.family);
  if (!fontLoad) {
    fontLoad = (async () => {
      const fontFace = new FontFace(
        definition.family,
        `url("${definition.source}") format("woff2")`,
        { style: 'normal', weight: definition.declaredWeight },
      );
      const loadedFont = await fontFace.load();
      const fontSet = document.fonts as FontFaceSet & { add(font: FontFace): FontFaceSet };
      fontSet.add(loadedFont);
      await fontSet.load(
        `${definition.loadWeight} 64px "${definition.family}"`,
        Array.from(sample).slice(0, 32).join(''),
      );
    })().catch(() => undefined);
    FONT_LOAD_CACHE.set(definition.family, fontLoad);
  }

  await fontLoad;
}

export function buildXhsTypographyPageInput(
  text: string,
  pageNumber: number,
  pageCount: number,
): XhsTypographyPageInput {
  const cleanText = toXhsPlainText(text)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return {
    text: cleanText || '图片文字会在这里按照所选样式排版。',
    pageNumber,
    pageCount,
  };
}

export async function renderXhsTypographyTemplate(
  canvas: HTMLCanvasElement,
  styleId: string,
  input: XhsTypographyPageInput,
): Promise<void> {
  const template = getXhsTypographyTemplate(styleId);
  const textSlot = createUnifiedTextSlot(template);
  const [image] = await Promise.all([
    loadImage(template.backgroundImage ?? template.referenceImage),
    ensureTypographyFont(textSlot.font, input.text),
  ]);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前环境无法创建文字排版画布');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const textSlots = [template.title, template.body];
  template.masks.forEach((item, index) => {
    const textSlot = textSlots[index];
    drawMask(context, image, canvas, {
      ...item,
      target: calculateXhsTypographyMaskTarget(item.target, textSlot?.rect),
    });
  });

  const normalizedText = normalizeTypographyText(input.text);
  const highlight = selectXhsTypographyHighlight(normalizedText);
  const textLayout = layoutText(
    context,
    normalizedText,
    textSlot,
    canvas,
    highlight,
    template.unified?.highlightWrap ?? 'natural',
  );
  drawTextLayout(
    context,
    textSlot,
    textLayout,
    canvas,
    template.accent,
    normalizedText,
    highlight,
  );
}

function createUnifiedTextSlot(template: XhsTypographyTemplate): XhsTypographyTextSlot {
  if (template.unified) {
    return {
      rect: { ...template.unified.rect },
      font: template.title.font,
      fontSize: template.unified.fontSize,
      minFontSize: template.unified.minFontSize,
      weight: template.title.weight,
      color: template.title.color,
      lineHeight: template.unified.lineHeight,
      maxLines: template.unified.maxLines,
      align: template.unified.align ?? template.title.align,
    };
  }

  const left = Math.min(template.title.rect.x, template.body.rect.x);
  const top = Math.min(template.title.rect.y, template.body.rect.y);
  const right = Math.max(
    template.title.rect.x + template.title.rect.width,
    template.body.rect.x + template.body.rect.width,
  );
  const bottom = Math.max(
    template.title.rect.y + template.title.rect.height,
    template.body.rect.y + template.body.rect.height,
  );
  const baseSize = Math.max(template.body.fontSize, Math.min(template.title.fontSize, 58));
  return {
    rect: rect(left, top, right - left, bottom - top),
    font: template.title.font,
    fontSize: baseSize,
    minFontSize: Math.min(template.title.minFontSize, template.body.minFontSize),
    weight: template.title.weight,
    color: template.title.color,
    lineHeight: Math.max(1.28, Math.min(1.55, template.title.lineHeight)),
    maxLines: 6,
    align: template.title.align,
  };
}

export async function renderXhsTypographyTemplateBlob(
  styleId: string,
  input: XhsTypographyPageInput,
  width = 1080,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.round(width * 4 / 3);
  await renderXhsTypographyTemplate(canvas, styleId, input);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('文字排版图片导出失败'));
    }, 'image/png');
  });
}

interface TextLayout {
  lines: string[];
  fontSize: number;
  lineHeight: number;
}

function loadImage(source: string): Promise<HTMLImageElement> {
  const cached = IMAGE_CACHE.get(source);
  if (cached) return cached;
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('文字排版模板资源加载失败'));
    image.src = source;
  });
  IMAGE_CACHE.set(source, promise);
  return promise;
}

function drawMask(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  item: XhsTypographyMask,
): void {
  const sourceX = item.source.x * image.naturalWidth;
  const sourceY = item.source.y * image.naturalHeight;
  const sourceWidth = item.source.width * image.naturalWidth;
  const sourceHeight = item.source.height * image.naturalHeight;
  const targetX = item.target.x * canvas.width;
  const targetY = item.target.y * canvas.height;
  const targetWidth = item.target.width * canvas.width;
  const targetHeight = item.target.height * canvas.height;

  const buffer = document.createElement('canvas');
  buffer.width = Math.max(1, Math.round(targetWidth));
  buffer.height = Math.max(1, Math.round(targetHeight));
  const bufferContext = buffer.getContext('2d');
  if (!bufferContext) return;
  const blur = Math.max(2, Math.round(canvas.width * 0.004));
  const bleed = blur * 2;
  bufferContext.filter = `blur(${blur}px)`;
  bufferContext.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    -bleed,
    -bleed,
    buffer.width + bleed * 2,
    buffer.height + bleed * 2,
  );
  bufferContext.filter = 'none';
  context.drawImage(buffer, targetX, targetY, targetWidth, targetHeight);

  if (item.mode !== 'pattern') return;

  const tile = document.createElement('canvas');
  tile.width = Math.max(8, Math.round(item.source.width * canvas.width));
  tile.height = Math.max(8, Math.round(item.source.height * canvas.height));
  const tileContext = tile.getContext('2d');
  if (!tileContext) return;
  tileContext.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    tile.width,
    tile.height,
  );
  const pattern = context.createPattern(tile, 'repeat');
  if (!pattern) return;
  context.save();
  context.translate(targetX, targetY);
  context.globalAlpha = 0.08;
  context.fillStyle = pattern;
  context.fillRect(0, 0, targetWidth, targetHeight);
  context.restore();
}

function paddedRect(value: XhsTypographyRect, padding: number): XhsTypographyRect {
  const x = Math.max(0, value.x - padding);
  const y = Math.max(0, value.y - padding);
  return rect(
    x,
    y,
    Math.min(1 - x, value.width + padding * 2),
    Math.min(1 - y, value.height + padding * 2),
  );
}

export function calculateXhsTypographyMaskTarget(
  declaredTarget: XhsTypographyRect,
  textRect?: XhsTypographyRect,
  padding = 0.025,
): XhsTypographyRect {
  if (!textRect) return { ...declaredTarget };
  const textTarget = paddedRect(textRect, padding);
  const x = Math.min(declaredTarget.x, textTarget.x);
  const y = Math.min(declaredTarget.y, textTarget.y);
  const right = Math.max(
    declaredTarget.x + declaredTarget.width,
    textTarget.x + textTarget.width,
  );
  const bottom = Math.max(
    declaredTarget.y + declaredTarget.height,
    textTarget.y + textTarget.height,
  );
  return rect(x, y, right - x, bottom - y);
}

function layoutText(
  context: CanvasRenderingContext2D,
  value: string,
  definition: XhsTypographyTextSlot,
  canvas: HTMLCanvasElement,
  highlight: XhsTypographyHighlightRange | null,
  highlightWrap: XhsTypographyHighlightWrapMode,
): TextLayout {
  const scale = canvas.width / 1080;
  const maxWidth = definition.rect.width * canvas.width;
  const maxHeight = definition.rect.height * canvas.height;
  const opticalScale = 1.35;
  let fontSize = definition.fontSize * scale * opticalScale;
  const minFontSize = definition.minFontSize * scale * opticalScale;
  let lines: string[] = [];
  let lineHeight = fontSize * definition.lineHeight;
  const layoutValue = applyXhsTypographyFocusBreaks(value, highlight, highlightWrap);
  const fontStep = Math.max(1, 2 * scale);

  while (true) {
    context.font = `${definition.weight} ${fontSize}px ${FONT_FAMILIES[definition.font]}`;
    lines = wrapXhsTypographyText(context, layoutValue, maxWidth, definition.maxLines);
    lineHeight = fontSize * definition.lineHeight;
    const fitsTextRegion = lines.length <= definition.maxLines
      && calculateTypographyTextHeight(lines.length, fontSize, lineHeight) <= maxHeight;
    const preservesFocus = isXhsTypographyFocusLayoutValid(
      lines,
      value,
      highlight,
      highlightWrap,
    );
    if ((fitsTextRegion && preservesFocus) || fontSize <= minFontSize) break;
    fontSize = Math.max(minFontSize, fontSize - fontStep);
  }

  context.font = `${definition.weight} ${fontSize}px ${FONT_FAMILIES[definition.font]}`;
  lines = wrapXhsTypographyText(context, layoutValue, maxWidth, definition.maxLines);
  if (lines.length > definition.maxLines) lines = lines.slice(0, definition.maxLines);
  if (lines.length === definition.maxLines && valueForLines(lines).length < layoutValue.replace(/\s+/g, '').length) {
    lines[lines.length - 1] = fitEllipsis(context, lines[lines.length - 1], maxWidth);
  }
  return {
    lines,
    fontSize,
    lineHeight,
  };
}

function isXhsTypographyFocusLayoutValid(
  lines: string[],
  sourceText: string,
  highlight: XhsTypographyHighlightRange | null,
  mode: XhsTypographyHighlightWrapMode,
): boolean {
  if (!highlight || mode === 'natural') return true;
  const segments = findXhsTypographyHighlightSegments(lines, sourceText, highlight);
  if (!segments.length || segments.map(segment => segment.text).join('') !== highlight.text) {
    return false;
  }

  const lastSegment = segments[segments.length - 1];
  const lastLine = lines[lastSegment.lineIndex];
  if (lastLine === undefined) return false;
  const endsFocusLine = lastLine.trimEnd()
    === `${lastSegment.prefix}${lastSegment.text}`.trimEnd();
  if (!endsFocusLine) return false;

  if (mode === 'isolate') {
    return segments.length === 1
      && !segments[0].prefix.trim()
      && segments[0].text === highlight.text;
  }

  if (mode === 'balanced') {
    const highlightGraphemes = splitXhsTypographyGraphemes(highlight.text);
    const canBalance = highlightGraphemes.length >= 4
      && highlightGraphemes.length <= 8
      && highlightGraphemes.every(grapheme => /^\p{Script=Han}$/u.test(grapheme.text));
    if (!canBalance) return segments.length === 1;
    const expectedFirst = Math.floor(highlightGraphemes.length / 2);
    return segments.length === 2
      && splitXhsTypographyGraphemes(segments[0].text).length === expectedFirst
      && splitXhsTypographyGraphemes(segments[1].text).length
        === highlightGraphemes.length - expectedFirst;
  }

  if (mode === 'lead-context') {
    if (segments.length !== 1) return false;
    const paragraphStart = findParagraphStart(sourceText, highlight.start);
    const availableContext = splitXhsTypographyGraphemes(
      sourceText.slice(paragraphStart, highlight.start),
    ).filter(grapheme => !/^\s+$/u.test(grapheme.text));
    return splitXhsTypographyGraphemes(segments[0].prefix)
      .filter(grapheme => !/^\s+$/u.test(grapheme.text)).length
      === Math.min(3, availableContext.length);
  }

  return true;
}

function calculateTypographyTextHeight(
  lineCount: number,
  fontSize: number,
  lineHeight: number,
): number {
  if (lineCount <= 0) return 0;
  return fontSize + Math.max(0, lineCount - 1) * lineHeight;
}

export function wrapXhsTypographyText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const normalized = normalizeTypographyText(value);
  if (!normalized) return [''];

  const lines: string[] = [];
  const parts = normalized.split(new RegExp(`(${FOCUS_LINE_BREAK}|\\n+)`, 'u'));
  const lineLimit = Math.max(1, maxLines);

  for (const part of parts) {
    if (!part) continue;
    if (part === FOCUS_LINE_BREAK) continue;
    if (/^\n+$/u.test(part)) {
      if (lines.length && lines[lines.length - 1] !== '') lines.push('');
      if (lines.length > lineLimit) return lines;
      continue;
    }

    const content = part.trim();
    if (!content) continue;
    let current = '';
    for (const { text: character } of splitXhsTypographyGraphemes(content)) {
      const candidate = current + character;
      if (current && context.measureText(candidate).width > maxWidth) {
        lines.push(current.trimEnd());
        current = character.trimStart();
        if (lines.length > lineLimit) return lines;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current.trimEnd());
    if (lines.length > lineLimit) return lines;
  }
  return lines.length ? lines : [''];
}

function fitEllipsis(context: CanvasRenderingContext2D, value: string, maxWidth: number): string {
  let output = value.replace(/…+$/u, '');
  while (output && context.measureText(`${output}…`).width > maxWidth) {
    output = splitXhsTypographyGraphemes(output).slice(0, -1).map(item => item.text).join('');
  }
  return `${output}…`;
}

function normalizeTypographyText(value: string): string {
  return value.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
}

function valueForLines(lines: string[]): string {
  return lines.join('').replace(/\s+/g, '');
}

export interface XhsTypographyAccentSegmentMetrics {
  lineIndex: number;
  lineText: string;
  lineLeft: number;
  lineTop: number;
  lineWidth: number;
  phraseX: number;
  phraseWidth: number;
  phraseText: string;
  phrasePrefix: string;
}

function drawTextLayout(
  context: CanvasRenderingContext2D,
  definition: XhsTypographyTextSlot,
  layout: TextLayout,
  canvas: HTMLCanvasElement,
  accent: XhsTypographyAccent,
  sourceText: string,
  highlight: XhsTypographyHighlightRange | null,
): void {
  const x = definition.rect.x * canvas.width;
  const y = definition.rect.y * canvas.height;
  const width = definition.rect.width * canvas.width;
  const height = definition.rect.height * canvas.height;
  const align = definition.align ?? 'left';
  const verticalOffset = calculateXhsTypographyVerticalOffset(
    height,
    layout.lines.length,
    layout.fontSize,
    layout.lineHeight,
  );
  context.save();
  context.font = `${definition.weight} ${layout.fontSize}px ${FONT_FAMILIES[definition.font]}`;
  context.textBaseline = 'top';
  context.textAlign = align;
  const drawX = align === 'center' ? x + width / 2 : align === 'right' ? x + width : x;

  const accentSegments = highlight
    ? measureTypographyAccentSegments(
      context,
      layout,
      sourceText,
      highlight,
      x,
      width,
      y + verticalOffset,
      align,
    )
    : [];
  drawXhsTypographyAccent(context, accent, accentSegments, layout.fontSize);

  layout.lines.forEach((line, index) => {
    drawXhsTypographyTextLine(
      context,
      line,
      drawX,
      y + verticalOffset + index * layout.lineHeight,
      definition.color,
      accent,
      accentSegments.find(segment => segment.lineIndex === index),
    );
  });
  context.restore();
}

export function drawXhsTypographyTextLine(
  context: CanvasRenderingContext2D,
  lineText: string,
  drawX: number,
  lineTop: number,
  defaultColor: string,
  accent: XhsTypographyAccent,
  segment?: XhsTypographyAccentSegmentMetrics,
): void {
  if (
    accent.kind === 'none'
    || !accent.textColor
    || !segment
    || segment.lineText !== lineText
  ) {
    context.fillStyle = defaultColor;
    context.fillText(lineText, drawX, lineTop);
    return;
  }

  const suffix = lineText.slice(segment.phrasePrefix.length + segment.phraseText.length);
  context.save();
  context.textAlign = 'left';
  context.fillStyle = defaultColor;
  if (segment.phrasePrefix) {
    context.fillText(segment.phrasePrefix, segment.lineLeft, lineTop);
  }
  context.fillStyle = accent.textColor;
  context.fillText(segment.phraseText, segment.phraseX, lineTop);
  if (suffix) {
    context.fillStyle = defaultColor;
    context.fillText(suffix, segment.phraseX + segment.phraseWidth, lineTop);
  }
  context.restore();
}

function measureTypographyAccentSegments(
  context: CanvasRenderingContext2D,
  layout: TextLayout,
  sourceText: string,
  highlight: XhsTypographyHighlightRange,
  slotX: number,
  slotWidth: number,
  firstLineTop: number,
  align: TypographyAlignment,
): XhsTypographyAccentSegmentMetrics[] {
  return findXhsTypographyHighlightSegments(layout.lines, sourceText, highlight).flatMap(segment => {
    const lineText = layout.lines[segment.lineIndex];
    if (lineText === undefined) return [];
    const lineWidth = context.measureText(lineText).width;
    const prefixWidth = context.measureText(segment.prefix).width;
    const phraseWidth = context.measureText(`${segment.prefix}${segment.text}`).width - prefixWidth;
    if (!Number.isFinite(phraseWidth) || phraseWidth <= 0) return [];
    const lineLeft = calculateXhsTypographyLineLeft(slotX, slotWidth, lineWidth, align);
    return [{
      lineIndex: segment.lineIndex,
      lineText,
      lineLeft,
      lineTop: firstLineTop + segment.lineIndex * layout.lineHeight,
      lineWidth,
      phraseX: lineLeft + prefixWidth,
      phraseWidth,
      phraseText: segment.text,
      phrasePrefix: segment.prefix,
    }];
  });
}

export function drawXhsTypographyAccent(
  context: CanvasRenderingContext2D,
  accent: XhsTypographyAccent,
  segments: XhsTypographyAccentSegmentMetrics[],
  fontSize: number,
): void {
  if (!segments.length || accent.kind === 'none') return;

  switch (accent.kind) {
    case 'marker':
      drawMarkerAccent(context, accent, segments, fontSize);
      return;
    case 'underline':
      drawUnderlineAccent(context, accent, segments, fontSize);
      return;
    case 'double-underline':
      drawDoubleUnderlineAccent(context, accent, segments, fontSize);
      return;
    case 'circle':
      drawCircleAccent(context, accent, segments, fontSize);
      return;
    case 'wave':
      drawWaveAccent(context, accent, segments, fontSize);
  }
}

function drawMarkerAccent(
  context: CanvasRenderingContext2D,
  accent: Extract<XhsTypographyAccent, { kind: 'marker' }>,
  segments: XhsTypographyAccentSegmentMetrics[],
  fontSize: number,
): void {
  const shape = accent.shape ?? 'band';
  const scope = accent.scope ?? 'phrase';
  const targets = scope === 'line' ? uniqueAccentLines(segments) : segments;

  targets.forEach(segment => {
    const targetX = scope === 'line' ? segment.lineLeft : segment.phraseX;
    const targetWidth = scope === 'line' ? segment.lineWidth : segment.phraseWidth;
    const height = (accent.height ?? (shape === 'block' ? 1 : shape === 'brush' ? 1.30 : 0.28)) * fontSize;
    const offset = (accent.offset ?? (shape === 'block' ? 0.02 : shape === 'brush' ? -0.08 : 0.70)) * fontSize;
    const bleed = (accent.bleed ?? (shape === 'block' ? 0.28 : shape === 'brush' ? 0.40 : 0.03)) * fontSize;
    const accentRect = rect(
      targetX - bleed,
      segment.lineTop + offset,
      targetWidth + bleed * 2,
      height,
    );
    const seed = accentSeed(accent.kind, shape, segment);

    if (shape === 'brush') {
      fillDeterministicLineBrush(
        context,
        accentRect,
        accent.color,
        accent.opacity ?? 0.72,
        accent.roughness ?? 0.10,
        seed,
      );
      return;
    }

    if (shape === 'block') {
      fillDeterministicBrush(
        context,
        accentRect,
        accent.color,
        accent.opacity ?? 0.80,
        (accent.radius ?? 0.18) * fontSize,
        accent.roughness ?? 0.08,
        seed,
      );
      return;
    }

    fillRoundedAccent(
      context,
      accentRect,
      accent.color,
      accent.opacity ?? 0.86,
      (accent.radius ?? 0.045) * fontSize,
    );
  });
}

function drawUnderlineAccent(
  context: CanvasRenderingContext2D,
  accent: Extract<XhsTypographyAccent, { kind: 'underline' }>,
  segments: XhsTypographyAccentSegmentMetrics[],
  fontSize: number,
): void {
  const handDrawn = accent.shape === 'hand-drawn';
  const height = (accent.height ?? (handDrawn ? 0.42 : 0.10)) * fontSize;
  const offset = (accent.offset ?? (handDrawn ? 0.56 : 0.86)) * fontSize;
  const bleed = (accent.bleed ?? (handDrawn ? 0.04 : 0.025)) * fontSize;

  segments.forEach(segment => {
    const startX = segment.phraseX - bleed;
    const endX = segment.phraseX + segment.phraseWidth + bleed;
    const seed = accentSeed(accent.kind, accent.shape ?? 'line', segment);
    if (handDrawn) {
      fillDeterministicBrush(
        context,
        rect(startX, segment.lineTop + offset, endX - startX, height),
        accent.color,
        accent.opacity ?? 0.88,
        height / 2,
        accent.roughness ?? 0.05,
        seed,
      );
      return;
    }
    strokeHandLine(
      context,
      startX,
      endX,
      segment.lineTop + offset + height / 2,
      height,
      accent.color,
      accent.opacity ?? 0.90,
      seed,
      accent.roughness ?? 0.035,
    );
  });
}

function drawDoubleUnderlineAccent(
  context: CanvasRenderingContext2D,
  accent: Extract<XhsTypographyAccent, { kind: 'double-underline' }>,
  segments: XhsTypographyAccentSegmentMetrics[],
  fontSize: number,
): void {
  const height = (accent.height ?? 0.065) * fontSize;
  const offset = (accent.offset ?? 0.83) * fontSize;
  const bleed = (accent.bleed ?? 0.035) * fontSize;
  segments.forEach(segment => {
    const startX = segment.phraseX - bleed;
    const endX = segment.phraseX + segment.phraseWidth + bleed;
    const seed = accentSeed(accent.kind, 'first', segment);
    strokeHandLine(
      context,
      startX,
      endX,
      segment.lineTop + offset,
      height,
      accent.color,
      accent.opacity ?? 0.92,
      seed,
      accent.roughness ?? 0.04,
    );
    strokeHandLine(
      context,
      startX + fontSize * 0.02,
      endX - fontSize * 0.01,
      segment.lineTop + offset + fontSize * 0.15,
      height * 0.85,
      accent.color,
      (accent.opacity ?? 0.92) * 0.78,
      accentSeed(accent.kind, 'second', segment),
      accent.roughness ?? 0.04,
    );
  });
}

function drawCircleAccent(
  context: CanvasRenderingContext2D,
  accent: Extract<XhsTypographyAccent, { kind: 'circle' }>,
  segments: XhsTypographyAccentSegmentMetrics[],
  fontSize: number,
): void {
  if (accent.shape === 'glyphs' || accent.scope === 'grapheme') {
    drawGraphemeCircles(context, accent, segments, fontSize);
    return;
  }

  const height = (accent.height ?? 1.04) * fontSize;
  const offset = (accent.offset ?? -0.02) * fontSize;
  const bleed = (accent.bleed ?? 0.10) * fontSize;
  context.save();
  context.strokeStyle = accent.color;
  context.lineWidth = Math.max(2, fontSize * 0.055);
  context.globalAlpha *= accent.opacity ?? 0.88;
  segments.forEach(segment => {
    context.beginPath();
    context.ellipse(
      segment.phraseX + segment.phraseWidth / 2,
      segment.lineTop + offset + height / 2,
      segment.phraseWidth / 2 + bleed,
      height / 2,
      stableNoise(accentSeed(accent.kind, 'tilt', segment), 0) * 0.025 - 0.0125,
      0,
      Math.PI * 2,
    );
    context.stroke();
  });
  context.restore();
}

function drawGraphemeCircles(
  context: CanvasRenderingContext2D,
  accent: Extract<XhsTypographyAccent, { kind: 'circle' }>,
  segments: XhsTypographyAccentSegmentMetrics[],
  fontSize: number,
): void {
  const height = (accent.height ?? 1.12) * fontSize;
  const offset = (accent.offset ?? -0.03) * fontSize;
  const bleed = (accent.bleed ?? 0.08) * fontSize;
  const roughness = accent.roughness ?? 0.025;
  context.save();
  context.fillStyle = accent.color;
  context.globalAlpha *= accent.opacity ?? 0.76;
  context.beginPath();
  segments.forEach(segment => {
    let consumed = '';
    splitXhsTypographyGraphemes(segment.phraseText).forEach((grapheme, index) => {
      const previousWidth = context.measureText(consumed).width;
      consumed += grapheme.text;
      const nextWidth = context.measureText(consumed).width;
      const glyphWidth = Math.max(fontSize * 0.24, nextWidth - previousWidth);
      const seed = accentSeed(accent.kind, `${index}:${grapheme.text}`, segment);
      const scaleJitter = 1 + (stableNoise(seed, 0) - 0.5) * roughness * 2;
      const yJitter = (stableNoise(seed, 1) - 0.5) * height * roughness;
      context.ellipse(
        segment.phraseX + previousWidth + glyphWidth / 2
          + (stableNoise(seed, 3) - 0.5) * fontSize * roughness * 0.75,
        segment.lineTop + offset + height / 2 + yJitter,
        Math.max(height / 2, glyphWidth / 2 + bleed) * scaleJitter,
        height / 2 * (1 + (stableNoise(seed, 2) - 0.5) * roughness),
        (stableNoise(seed, 4) - 0.5) * roughness,
        0,
        Math.PI * 2,
      );
    });
  });
  context.fill();
  context.restore();
}

function drawWaveAccent(
  context: CanvasRenderingContext2D,
  accent: Extract<XhsTypographyAccent, { kind: 'wave' }>,
  segments: XhsTypographyAccentSegmentMetrics[],
  fontSize: number,
): void {
  const offset = (accent.offset ?? 0.93) * fontSize;
  const bleed = (accent.bleed ?? 0.02) * fontSize;
  const amplitude = (accent.height ?? 0.075) * fontSize;
  const wavelength = fontSize * 0.34;
  context.save();
  context.strokeStyle = accent.color;
  context.lineWidth = Math.max(2, fontSize * 0.045);
  context.lineCap = 'round';
  context.globalAlpha *= accent.opacity ?? 0.90;
  segments.forEach(segment => {
    const startX = segment.phraseX - bleed;
    const endX = segment.phraseX + segment.phraseWidth + bleed;
    context.beginPath();
    context.moveTo(startX, segment.lineTop + offset);
    for (let x = startX; x < endX; x += wavelength / 2) {
      const nextX = Math.min(endX, x + wavelength / 2);
      const controlX = (x + nextX) / 2;
      const direction = Math.round((x - startX) / (wavelength / 2)) % 2 === 0 ? 1 : -1;
      context.quadraticCurveTo(
        controlX,
        segment.lineTop + offset + amplitude * direction,
        nextX,
        segment.lineTop + offset,
      );
    }
    context.stroke();
  });
  context.restore();
}

export function drawXhsTypographyAccentText(
  context: CanvasRenderingContext2D,
  accent: XhsTypographyAccent,
  segments: XhsTypographyAccentSegmentMetrics[],
): void {
  if (accent.kind === 'none' || !accent.textColor) return;
  context.save();
  context.textAlign = 'left';
  context.fillStyle = accent.textColor;
  segments.forEach(segment => {
    context.fillText(segment.phraseText, segment.phraseX, segment.lineTop);
  });
  context.restore();
}

function uniqueAccentLines(
  segments: XhsTypographyAccentSegmentMetrics[],
): XhsTypographyAccentSegmentMetrics[] {
  const seen = new Set<number>();
  return segments.filter(segment => {
    if (seen.has(segment.lineIndex)) return false;
    seen.add(segment.lineIndex);
    return true;
  });
}

function fillRoundedAccent(
  context: CanvasRenderingContext2D,
  value: XhsTypographyRect,
  color: string,
  opacity: number,
  radius: number,
): void {
  context.save();
  context.fillStyle = color;
  context.globalAlpha *= opacity;
  roundedRectPath(context, value, radius);
  context.fill();
  context.restore();
}

function fillDeterministicBrush(
  context: CanvasRenderingContext2D,
  value: XhsTypographyRect,
  color: string,
  opacity: number,
  radius: number,
  roughness: number,
  seed: string,
): void {
  context.save();
  const baseAlpha = context.globalAlpha;
  context.fillStyle = color;
  context.globalAlpha = baseAlpha * opacity * 0.42;
  roundedRectPath(context, value, radius);
  context.fill();

  context.globalAlpha = baseAlpha * opacity * 0.72;
  drawSmoothClosedPath(context, calculateXhsTypographyBrushPoints(value, seed, roughness, radius));
  context.fill();
  context.restore();
}

function fillDeterministicLineBrush(
  context: CanvasRenderingContext2D,
  value: XhsTypographyRect,
  color: string,
  opacity: number,
  roughness: number,
  seed: string,
): void {
  context.save();
  context.fillStyle = color;
  context.globalAlpha *= opacity;
  drawSmoothClosedPath(
    context,
    calculateXhsTypographyBrushPoints(value, seed, roughness, value.height * 0.48),
  );
  context.fill();
  context.restore();
}

function strokeHandLine(
  context: CanvasRenderingContext2D,
  startX: number,
  endX: number,
  y: number,
  lineWidth: number,
  color: string,
  opacity: number,
  seed: string,
  roughness: number,
): void {
  const distance = Math.max(0, endX - startX);
  const controlY = y + (stableNoise(seed, 0) - 0.5) * lineWidth * roughness * 8;
  context.save();
  context.strokeStyle = color;
  context.lineWidth = Math.max(1, lineWidth);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.globalAlpha *= opacity;
  context.beginPath();
  context.moveTo(startX, y);
  context.quadraticCurveTo(startX + distance * 0.48, controlY, endX, y + (stableNoise(seed, 1) - 0.5) * lineWidth * roughness * 4);
  context.stroke();
  context.restore();
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  value: XhsTypographyRect,
  radius: number,
): void {
  const safeRadius = Math.max(0, Math.min(radius, value.width / 2, value.height / 2));
  const right = value.x + value.width;
  const bottom = value.y + value.height;
  context.beginPath();
  context.moveTo(value.x + safeRadius, value.y);
  context.lineTo(right - safeRadius, value.y);
  context.quadraticCurveTo(right, value.y, right, value.y + safeRadius);
  context.lineTo(right, bottom - safeRadius);
  context.quadraticCurveTo(right, bottom, right - safeRadius, bottom);
  context.lineTo(value.x + safeRadius, bottom);
  context.quadraticCurveTo(value.x, bottom, value.x, bottom - safeRadius);
  context.lineTo(value.x, value.y + safeRadius);
  context.quadraticCurveTo(value.x, value.y, value.x + safeRadius, value.y);
  context.closePath();
}

function drawSmoothClosedPath(
  context: CanvasRenderingContext2D,
  points: XhsTypographyPoint[],
): void {
  if (points.length < 3) return;
  const first = points[0];
  const second = points[1];
  context.beginPath();
  context.moveTo((first.x + second.x) / 2, (first.y + second.y) / 2);
  for (let index = 1; index <= points.length; index += 1) {
    const current = points[index % points.length];
    const next = points[(index + 1) % points.length];
    context.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
  }
  context.closePath();
}

export function calculateXhsTypographyBrushPoints(
  value: XhsTypographyRect,
  seed: string,
  roughness = 0.06,
  radius = value.height / 2,
): XhsTypographyPoint[] {
  const safeRoughness = Math.max(0, Math.min(0.25, roughness));
  const inset = Math.max(0, Math.min(radius, value.width / 2, value.height / 2));
  const sampleCount = 6;
  const top: XhsTypographyPoint[] = [];
  const bottom: XhsTypographyPoint[] = [];
  const availableWidth = Math.max(0, value.width - inset * 2);
  for (let index = 0; index <= sampleCount; index += 1) {
    const x = value.x + inset + availableWidth * index / sampleCount;
    const topJitter = (stableNoise(seed, index) - 0.5) * value.height * safeRoughness;
    const bottomJitter = (stableNoise(seed, index + sampleCount + 1) - 0.5) * value.height * safeRoughness;
    top.push({ x, y: value.y + topJitter });
    bottom.unshift({ x, y: value.y + value.height + bottomJitter });
  }
  return [
    { x: value.x, y: value.y + value.height / 2 },
    ...top,
    { x: value.x + value.width, y: value.y + value.height / 2 },
    ...bottom,
  ];
}

function accentSeed(
  kind: string,
  variant: string,
  segment: XhsTypographyAccentSegmentMetrics,
): string {
  return `${kind}:${variant}:${segment.lineIndex}:${segment.lineText}:${segment.phraseText}`;
}

function stableNoise(seed: string, salt: number): number {
  let value = 2166136261;
  const source = `${seed}:${salt}`;
  for (let index = 0; index < source.length; index += 1) {
    value ^= source.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  value += value << 13;
  value ^= value >>> 7;
  value += value << 3;
  value ^= value >>> 17;
  value += value << 5;
  return (value >>> 0) / 4294967295;
}

function calculateXhsTypographyLineLeft(
  slotX: number,
  slotWidth: number,
  lineWidth: number,
  align: TypographyAlignment,
): number {
  return align === 'center'
    ? slotX + (slotWidth - lineWidth) / 2
    : align === 'right'
      ? slotX + slotWidth - lineWidth
      : slotX;
}

export function calculateXhsTypographyMarkerRect(
  slotX: number,
  slotWidth: number,
  lineWidth: number,
  prefixWidth: number,
  highlightWidth: number,
  lineTop: number,
  fontSize: number,
  align: TypographyAlignment = 'left',
): XhsTypographyRect {
  const textX = calculateXhsTypographyLineLeft(slotX, slotWidth, lineWidth, align);
  const horizontalBleed = fontSize * 0.03;
  return {
    x: textX + prefixWidth - horizontalBleed,
    y: lineTop + fontSize * 0.70,
    width: highlightWidth + horizontalBleed * 2,
    height: fontSize * 0.28,
  };
}

export function calculateXhsTypographyVerticalOffset(
  slotHeight: number,
  lineCount: number,
  fontSize: number,
  lineHeight: number,
): number {
  const textHeight = calculateTypographyTextHeight(lineCount, fontSize, lineHeight);
  if (textHeight <= 0) return 0;
  return Math.max(0, (slotHeight - textHeight) / 2);
}
