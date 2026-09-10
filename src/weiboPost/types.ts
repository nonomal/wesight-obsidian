export const WEIBO_POST_TONES = ['opinion', 'news', 'casual'] as const;

export type WeiboPostTone = (typeof WEIBO_POST_TONES)[number];

export interface WeiboPostCopyDraft {
  body: string;
  topics: string[];
  tone: WeiboPostTone;
}

export type WeiboPostImageSource = 'article' | 'xiaohongshu' | 'upload';

export interface WeiboPostImage {
  id: string;
  vaultPath: string;
  fileName: string;
  mimeType: string;
  label: string;
  source: WeiboPostImageSource;
  size?: number;
  previewUrl?: string;
}

export interface WeiboPostDraftRecord {
  version: 1;
  sourcePath: string;
  contentHash: string;
  updatedAt: string;
  copy: WeiboPostCopyDraft;
  customPrompt: string;
  images: WeiboPostImage[];
}
