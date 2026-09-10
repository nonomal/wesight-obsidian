export const JIKE_POST_TONES = ['opinion', 'experience', 'casual'] as const;

export type JikePostTone = (typeof JIKE_POST_TONES)[number];

export interface JikePostCopyDraft {
  body: string;
  topics: string[];
  tone: JikePostTone;
  circle: string;
}

export type JikePostImageSource = 'article' | 'xiaohongshu' | 'upload';

export interface JikePostImage {
  id: string;
  vaultPath: string;
  fileName: string;
  mimeType: string;
  label: string;
  source: JikePostImageSource;
  size?: number;
  previewUrl?: string;
}

export interface JikePostDraftRecord {
  version: 1;
  sourcePath: string;
  contentHash: string;
  updatedAt: string;
  copy: JikePostCopyDraft;
  customPrompt: string;
  images: JikePostImage[];
}
