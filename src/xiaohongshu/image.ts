export interface XhsImageCrop {
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  targetWidth: number;
  targetHeight: number;
}

export function computeXhsPortraitCrop(width: number, height: number): XhsImageCrop {
  return computeXhsImageCrop(width, height, '3:4');
}

export function computeXhsImageCrop(width: number, height: number, ratio: '3:4' | '1:1' | '4:3'): XhsImageCrop {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 3 || height < 4) {
    throw new Error('图片尺寸无效');
  }

  const [rw, rh] = ratio.split(':').map(Number);
  if (width * rh === height * rw) {
    return {
      sourceX: 0,
      sourceY: 0,
      sourceWidth: width,
      sourceHeight: height,
      targetWidth: width,
      targetHeight: height,
    };
  }

  if (width * rh > height * rw) {
    const targetHeight = Math.floor(height / rh) * rh;
    const targetWidth = targetHeight / rh * rw;
    return {
      sourceX: (width - targetWidth) / 2,
      sourceY: (height - targetHeight) / 2,
      sourceWidth: targetWidth,
      sourceHeight: targetHeight,
      targetWidth,
      targetHeight,
    };
  }

  const targetWidth = Math.floor(width / rw) * rw;
  const targetHeight = targetWidth / rw * rh;
  return {
    sourceX: (width - targetWidth) / 2,
    sourceY: (height - targetHeight) / 2,
    sourceWidth: targetWidth,
    sourceHeight: targetHeight,
    targetWidth,
    targetHeight,
  };
}
