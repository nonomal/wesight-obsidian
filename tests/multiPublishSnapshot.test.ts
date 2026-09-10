vi.mock('obsidian', () => ({ TFile: class TFile {} }));

vi.mock('../src/wechat/snapshot', () => ({ buildWeChatSnapshot: vi.fn() }));

import { TFile, type App } from 'obsidian';

import { buildMultiPublishSnapshot } from '../src/multiPublish/snapshot';
import { buildWeChatSnapshot } from '../src/wechat/snapshot';

describe('multi-platform snapshot', () => {
  test('reuses local assets and reads publishing metadata', async () => {
    const body = new Uint8Array([1, 2, 3]).buffer;
    vi.mocked(buildWeChatSnapshot).mockResolvedValue({
      sourcePath: '文章/测试.md',
      title: '测试文章',
      author: '',
      digest: '摘要',
      contentSourceUrl: '',
      markdown: '![图](wesight-wechat-asset://hash)',
      contentHash: 'content-hash',
      themeSourceHash: 'theme-hash',
      assets: [{
        token: 'wesight-wechat-asset://hash',
        source: '附件/图.png',
        fileName: '图.png',
        mimeType: 'image/png',
        contentHash: 'a'.repeat(64),
        body,
        previewUrl: 'app://vault/附件/图.png',
      }],
      warnings: [],
      thumbMediaId: '',
      coverAssetToken: 'wesight-wechat-asset://hash',
      rendererVersion: 'canghe-style-wechat-v2',
    });
    const app = {
      metadataCache: {
        getFileCache: vi.fn().mockReturnValue({ frontmatter: { tags: ['AI', '#效率'], original: true } }),
      },
    } as unknown as App;
    const file = new TFile();
    file.path = '文章/测试.md';
    const snapshot = await buildMultiPublishSnapshot(app, file);

    expect(snapshot.markdown).toContain(`wesight-asset://${'a'.repeat(64)}`);
    expect(snapshot.coverAssetId).toBe('a'.repeat(64));
    expect(snapshot.tags).toEqual(['AI', '效率']);
    expect(snapshot.original).toBe(true);
    expect(snapshot.assets[0]).toMatchObject({
      size: 3,
      sha256: 'a'.repeat(64),
      previewUrl: 'app://vault/附件/图.png',
    });
  });

  test('keeps a downloaded remote image preview even without a Vault path', async () => {
    const body = new Uint8Array([137, 80, 78, 71]).buffer;
    vi.mocked(buildWeChatSnapshot).mockResolvedValue({
      sourcePath: '文章/远程图片.md',
      title: '远程图片',
      author: '',
      digest: '',
      contentSourceUrl: '',
      markdown: '![图](wesight-wechat-asset://remote)',
      contentHash: 'remote-content-hash',
      themeSourceHash: 'remote-theme-hash',
      assets: [{
        token: 'wesight-wechat-asset://remote',
        source: 'https://cdn.example.com/remote.png',
        fileName: 'remote.png',
        mimeType: 'image/png',
        contentHash: 'c'.repeat(64),
        body,
        previewUrl: 'https://cdn.example.com/remote.png',
      }],
      warnings: [],
      thumbMediaId: '',
      coverAssetToken: null,
      rendererVersion: 'canghe-style-wechat-v2',
    });
    const app = {
      metadataCache: { getFileCache: vi.fn().mockReturnValue(undefined) },
    } as unknown as App;
    const file = new TFile();
    file.path = '文章/远程图片.md';

    const result = await buildMultiPublishSnapshot(app, file);

    expect(result.assets[0]).toMatchObject({
      vaultPath: undefined,
      previewUrl: 'https://cdn.example.com/remote.png',
      body,
    });
  });
});
