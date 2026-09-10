import { describe, expect, it, vi } from 'vitest';
import { buildXhsImagePrompt, XiaohongshuGenerationService } from '../src/xiaohongshu/generationService';
import { computeXhsImageCrop } from '../src/xiaohongshu/image';
import type { XhsGeneratedPage } from '../src/xiaohongshu/types';

const input = {
  draftId: 'test',
  copy: { title: '知识整理', body: '分类与连接笔记', tags: [] },
  pageContents: [{ pageNumber: 3, label: '应用', text: '应用知识', textSource: 'ai' as const }],
  style: { categoryId: 'photography' as const, styleId: 'desktop' },
  customStylePrompt: '自然光，蓝色背景',
  pageCount: 6,
  signal: new AbortController().signal,
};

function fixture() {
  const service = new XiaohongshuGenerationService({
    getSettings: () => ({ configSources: { codex: 'localCli' } }) as never,
    runtimeManager: { refreshCodexStatus: vi.fn(async () => ({ binaryPath: '/codex', imageGeneration: true })) } as never,
    vaultStore: {} as never,
  });
  const generate = vi.spyOn(service as unknown as { generateOneImage: (options: { pageNumber: number; pageCount: number }) => Promise<XhsGeneratedPage> }, 'generateOneImage');
  generate.mockImplementation(async options => ({ pageNumber: options.pageNumber, label: '图片', id: String(options.pageNumber), vaultPath: 'test.png', mimeType: 'image/png' } as XhsGeneratedPage));
  return { service, generate };
}

describe('AI image gallery generation', () => {
  it('regenerates the requested page with its original carousel position', async () => {
    const { service, generate } = fixture();
    const onPage = vi.fn();
    const result = await service.generateImages({ ...input, onPage });
    expect(generate).toHaveBeenCalledOnce();
    expect(generate.mock.calls[0][0]).toMatchObject({ pageNumber: 3, pageCount: 6 });
    expect(result.map(page => page.pageNumber)).toEqual([3]);
    expect(onPage).toHaveBeenCalledWith(result[0]);
  });

  it('reports successful pages before rejecting a partially failed batch', async () => {
    const { service, generate } = fixture();
    generate.mockRejectedValueOnce(new Error('生成失败'));
    const onPage = vi.fn();
    await expect(service.generateImages({ ...input, pageContents: [input.pageContents[0], { ...input.pageContents[0], pageNumber: 4 }], onPage })).rejects.toThrow('生成失败');
    expect(onPage).toHaveBeenCalledOnce();
    expect(onPage.mock.calls[0][0]).toMatchObject({ pageNumber: 4 });
  });

  it('does not generate after cancellation', async () => {
    const { service, generate } = fixture();
    const controller = new AbortController(); controller.abort();
    await expect(service.generateImages({ ...input, signal: controller.signal })).rejects.toThrow('已停止生成');
    expect(generate).not.toHaveBeenCalled();
  });

  it('passes the selected visual direction, source and reference files into the image prompt', () => {
    const prompt = buildXhsImagePrompt({ ...input, pageContent: input.pageContents[0], pageNumber: 3, imageRatio: '1:1', sourceMarkdown: '文章原始内容', referencePaths: ['/tmp/reference-1.png'] });
    expect(prompt).toContain('第 3/6 张');
    expect(prompt).toContain('1:1');
    expect(prompt).toContain('自然光，蓝色背景');
    expect(prompt).toContain('文章原始内容');
    expect(prompt).toContain('/tmp/reference-1.png');
    expect(prompt).not.toContain('统一的字体');
    expect(prompt).not.toContain('暖白、炭黑');
  });

  it.each(['1:1', '4:3', '3:4'] as const)('normalizes generated images to %s', ratio => {
    const crop = computeXhsImageCrop(1536, 1024, ratio);
    const [w, h] = ratio.split(':').map(Number);
    expect(crop.targetWidth * h).toBe(crop.targetHeight * w);
    expect(crop.sourceX).toBeGreaterThanOrEqual(0);
    expect(crop.sourceY).toBeGreaterThanOrEqual(0);
  });
});
