import { describe, expect, it } from 'vitest';

import { computeXhsPortraitCrop } from '../src/xiaohongshu/image';

describe('xiaohongshu image normalization', () => {
  it('keeps an exact 3:4 image unchanged', () => {
    expect(computeXhsPortraitCrop(1086, 1448)).toEqual({
      sourceX: 0,
      sourceY: 0,
      sourceWidth: 1086,
      sourceHeight: 1448,
      targetWidth: 1086,
      targetHeight: 1448,
    });
  });

  it('center crops a 2:3 portrait image to exact 3:4', () => {
    const crop = computeXhsPortraitCrop(1024, 1536);
    expect(crop).toEqual({
      sourceX: 0.5,
      sourceY: 86,
      sourceWidth: 1023,
      sourceHeight: 1364,
      targetWidth: 1023,
      targetHeight: 1364,
    });
    expect(crop.targetWidth * 4).toBe(crop.targetHeight * 3);
  });

  it('center crops a wide image to exact 3:4', () => {
    const crop = computeXhsPortraitCrop(1536, 1024);
    expect(crop).toEqual({
      sourceX: 384,
      sourceY: 0,
      sourceWidth: 768,
      sourceHeight: 1024,
      targetWidth: 768,
      targetHeight: 1024,
    });
  });

  it('rejects invalid dimensions', () => {
    expect(() => computeXhsPortraitCrop(0, 1080)).toThrow('图片尺寸无效');
  });
});
