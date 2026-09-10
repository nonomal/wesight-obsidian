import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

import { describe, expect, test, vi } from 'vitest';

import type { MultiPublishSnapshot } from '../src/multiPublish/types';
import { XiaohongshuGenerationService } from '../src/xiaohongshu/generationService';
import type { XhsPageContent } from '../src/xiaohongshu/types';

const ARTICLE: MultiPublishSnapshot = {
  sourcePath: '文章.md',
  contentHash: 'page-content-test',
  title: '内容工作流升级',
  digest: '',
  markdown: '# 问题\n\n信息很分散。\n\n# 方法\n\n把流程拆成三步。',
  html: '',
  coverAssetId: null,
  tags: ['效率'],
  assets: [],
  warnings: [],
};

function createService(runTurn: ReturnType<typeof vi.fn>): XiaohongshuGenerationService {
  return new XiaohongshuGenerationService({
    runtimeManager: { runTurn } as never,
    vaultStore: {} as never,
    getSettings: () => ({
      defaultAgentId: 'codex',
      configSources: { codex: 'localCli' },
      providerProfileByAgent: { codex: '' },
      localModelByAgent: { codex: '' },
    }) as never,
    env: { TMPDIR: mkdtempSync(path.join(tmpdir(), 'wesight-xhs-content-test-')) },
  });
}

describe('xiaohongshu page-content generation', () => {
  test('generates the exact requested page set through the current text engine', async () => {
    const runTurn = vi.fn(async (_input: unknown, onEvent: (event: unknown) => void) => {
      onEvent({
        type: 'text',
        content: JSON.stringify({
          pages: [
            { pageNumber: 1, label: '封面', text: '先解决信息分散，把问题说清楚。' },
            { pageNumber: 2, label: '方法', text: '流程拆成三步，每一步都有明确输入。' },
            { pageNumber: 3, label: '结尾', text: '现在开始行动，从最小流程开始。' },
          ],
        }),
      });
    });
    const service = createService(runTurn);

    const pages = await service.generatePageContents(
      ARTICLE,
      { title: '内容工作流升级', body: '正文', tags: ['效率'] },
      3,
      new AbortController().signal,
    );

    expect(pages).toHaveLength(3);
    expect(pages[1]).toMatchObject({ pageNumber: 2, textSource: 'ai' });
    expect(runTurn).toHaveBeenCalledWith(expect.objectContaining({
      textOnly: true,
      accessMode: 'read-only',
      logPolicy: 'metadata-only',
    }), expect.any(Function));
  });

  test('regenerates one page without replacing the page number', async () => {
    const runTurn = vi.fn(async (_input: unknown, onEvent: (event: unknown) => void) => {
      onEvent({
        type: 'text',
        content: '{"pageNumber":2,"label":"新方法","text":"第二页新的图片文字"}',
      });
    });
    const service = createService(runTurn);
    const current: XhsPageContent = {
      pageNumber: 2,
      label: '方法',
      text: '旧图片文字',
      textSource: 'manual',
    };

    await expect(service.regeneratePageContent(
      ARTICLE,
      { title: '内容工作流升级', body: '正文', tags: ['效率'] },
      current,
      3,
      new AbortController().signal,
    )).resolves.toMatchObject({
      pageNumber: 2,
      text: '第二页新的图片文字',
      textSource: 'ai',
    });
  });
});
