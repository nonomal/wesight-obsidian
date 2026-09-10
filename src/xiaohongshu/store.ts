import type { DataAdapter } from 'obsidian';

import type { XhsDraftRecord } from './types';

const DRAFT_ROOT = '.wesight/xiaohongshu-drafts';

function draftPath(contentHash: string): string {
  const safeHash = contentHash.replace(/[^a-f0-9]/gi, '').slice(0, 128);
  if (!safeHash) throw new Error('小红书草稿标识无效');
  return `${DRAFT_ROOT}/${safeHash}.json`;
}

export class XiaohongshuDraftStore {
  constructor(private readonly adapter: DataAdapter) {}

  async load(contentHash: string): Promise<XhsDraftRecord | null> {
    const filePath = draftPath(contentHash);
    try {
      if (!(await this.adapter.exists(filePath))) return null;
      const value = JSON.parse(await this.adapter.read(filePath)) as XhsDraftRecord;
      return value?.version === 1 && value.contentHash === contentHash ? value : null;
    } catch {
      return null;
    }
  }

  async save(record: XhsDraftRecord): Promise<void> {
    await this.ensureDirectory('.wesight');
    await this.ensureDirectory(DRAFT_ROOT);
    await this.adapter.write(draftPath(record.contentHash), `${JSON.stringify(record, null, 2)}\n`);
  }

  private async ensureDirectory(directory: string): Promise<void> {
    if (!(await this.adapter.exists(directory))) await this.adapter.mkdir(directory);
  }
}
