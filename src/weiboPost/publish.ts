import { createHash } from 'crypto';
import path from 'path';

import type { MultiPublishSnapshot } from '../multiPublish/types';
import { buildWeiboPostText, WEIBO_POST_BODY_LIMIT } from './copy';
import type { WeiboPostCopyDraft, WeiboPostImage } from './types';

const MAX_ASSET_BYTES = 10 * 1024 * 1024;
const MAX_TASK_BYTES = 100 * 1024 * 1024;
export const WEIBO_POST_MAX_IMAGES = 9;

export interface WeiboPostPublishInput {
  source: MultiPublishSnapshot;
  copy: WeiboPostCopyDraft;
  images: WeiboPostImage[];
  readBinary: (vaultPath: string) => Promise<ArrayBuffer>;
}

export function validateWeiboPostPublishInput(
  copy: WeiboPostCopyDraft,
  images: WeiboPostImage[],
): string[] {
  const errors: string[] = [];
  if (!copy.body.trim()) errors.push('请先填写微博正文');
  if (Array.from(copy.body.trim()).length > WEIBO_POST_BODY_LIMIT) {
    errors.push(`微博正文不能超过 ${WEIBO_POST_BODY_LIMIT} 个字符`);
  }
  if (Array.from(buildWeiboPostText(copy.body, copy.topics)).length > WEIBO_POST_BODY_LIMIT) {
    errors.push(`微博正文和话题合计不能超过 ${WEIBO_POST_BODY_LIMIT} 个字符`);
  }
  if (!images.length) errors.push('请至少选择 1 张微博配图');
  if (images.length > WEIBO_POST_MAX_IMAGES) errors.push('微博图文动态最多支持 9 张图片');
  if (new Set(images.map(image => image.id)).size !== images.length) errors.push('微博配图存在重复项');
  if (images.some(image => !image.vaultPath.trim())) errors.push('存在无法读取的微博配图');
  const oversized = images.find(image => typeof image.size === 'number' && image.size > MAX_ASSET_BYTES);
  if (oversized) errors.push(`图片“${oversized.fileName}”超过 10 MB`);
  const knownTotal = images.reduce((total, image) => total + (image.size ?? 0), 0);
  if (knownTotal > MAX_TASK_BYTES) errors.push('微博配图总大小不能超过 100 MB');
  return Array.from(new Set(errors));
}

export async function buildWeiboPostPublishSnapshot(
  input: WeiboPostPublishInput,
): Promise<MultiPublishSnapshot> {
  const validationErrors = validateWeiboPostPublishInput(input.copy, input.images);
  if (validationErrors.length) throw new Error(validationErrors[0]);

  const assets: MultiPublishSnapshot['assets'] = [];
  let totalBytes = 0;
  for (let index = 0; index < input.images.length; index += 1) {
    const image = input.images[index];
    let body: ArrayBuffer;
    try {
      body = await input.readBinary(image.vaultPath);
    } catch {
      throw new Error(`第 ${index + 1} 张微博配图读取失败，请重新选择`);
    }
    if (body.byteLength <= 0) throw new Error(`第 ${index + 1} 张微博配图为空`);
    if (body.byteLength > MAX_ASSET_BYTES) throw new Error(`第 ${index + 1} 张微博配图超过 10 MB`);
    totalBytes += body.byteLength;
    if (totalBytes > MAX_TASK_BYTES) throw new Error('微博配图总大小不能超过 100 MB');
    const sha256 = createHash('sha256').update(Buffer.from(body)).digest('hex');
    const id = createHash('sha256').update(`${index}:${image.vaultPath}:${sha256}`).digest('hex');
    assets.push({
      id,
      fileName: path.posix.basename(image.fileName) || `weibo-${index + 1}.png`,
      mimeType: image.mimeType || 'image/png',
      size: body.byteLength,
      sha256,
      body,
      vaultPath: image.vaultPath,
    });
  }

  const markdown = input.copy.body.trim();
  const topics = input.copy.topics
    .map(topic => topic.replace(/^#+|#+$/g, '').trim())
    .filter(Boolean);
  const title = Array.from(markdown.replace(/\s+/g, ' ').trim()).slice(0, 40).join('') || input.source.title;
  const contentHash = createHash('sha256').update(JSON.stringify({
    sourceHash: input.source.contentHash,
    markdown,
    topics,
    assets: assets.map(asset => ({ id: asset.id, sha256: asset.sha256 })),
  })).digest('hex');

  return {
    sourcePath: input.source.sourcePath,
    contentHash,
    title,
    digest: Array.from(markdown).slice(0, 140).join(''),
    markdown,
    html: `<p>${escapeHtml(markdown).replace(/\n/g, '<br>')}</p>`,
    coverAssetId: assets[0]?.id ?? null,
    tags: topics,
    assets,
    warnings: [],
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
