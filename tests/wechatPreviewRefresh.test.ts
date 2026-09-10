import {
  resolveWeChatPreviewRefreshControlState,
  resolveWeChatPreviewSourcePath,
  WeChatPreviewLoadingCoordinator,
  WeChatPreviewRequestCoordinator,
} from '../src/ui/wechatPreviewRefresh';

describe('WeChat preview refresh control', () => {
  test('exposes an enabled refresh action while idle', () => {
    expect(resolveWeChatPreviewRefreshControlState(false, false)).toEqual({
      icon: 'refresh-cw',
      label: '刷新左侧当前文件预览',
      disabled: false,
      loading: false,
    });
  });

  test('shows a disabled loading state while refreshing', () => {
    expect(resolveWeChatPreviewRefreshControlState(true, false)).toEqual({
      icon: 'loader-circle',
      label: '正在刷新左侧当前文件预览',
      disabled: true,
      loading: true,
    });
  });

  test('disables refresh while another preview operation is running', () => {
    expect(resolveWeChatPreviewRefreshControlState(false, true).disabled).toBe(true);
  });

  test('refreshes the active Markdown file instead of the stale preview file', () => {
    expect(resolveWeChatPreviewSourcePath(
      'articles/b.md',
      'articles/b.md',
      'articles/a.md',
      'articles/a.md',
    )).toBe('articles/b.md');
  });

  test('uses the most recently active file after focus moves to the preview', () => {
    expect(resolveWeChatPreviewSourcePath(
      null,
      'articles/b.md',
      'articles/b.md',
      'articles/a.md',
    )).toBe('articles/b.md');
  });

  test('falls back to the tracked editor file when Obsidian has no active file', () => {
    expect(resolveWeChatPreviewSourcePath(
      null,
      null,
      'articles/b.md',
      'articles/a.md',
    )).toBe('articles/b.md');
  });

  test('commits only the latest request during rapid A to B to C switching', () => {
    const coordinator = new WeChatPreviewRequestCoordinator();
    const requestA = coordinator.begin('articles/a.md');
    const requestB = coordinator.begin('articles/b.md');
    const requestC = coordinator.begin('articles/c.md');

    expect(coordinator.isCurrent(requestA)).toBe(false);
    expect(coordinator.isCurrent(requestB)).toBe(false);
    expect(coordinator.isCurrent(requestC)).toBe(true);
  });

  test('does not let an older completion clear the latest pending file', () => {
    const coordinator = new WeChatPreviewRequestCoordinator();
    const requestA = coordinator.begin('articles/a.md');
    const requestB = coordinator.begin('articles/b.md');

    coordinator.finish(requestA);

    expect(coordinator.isPending('articles/b.md')).toBe(true);
    expect(coordinator.isCurrent(requestB)).toBe(true);
  });

  test('lets an interrupted full reload settle its loading state after a content refresh starts', () => {
    const requests = new WeChatPreviewRequestCoordinator();
    const loading = new WeChatPreviewLoadingCoordinator();
    const fullReload = requests.begin('articles/a.md');
    loading.begin(fullReload);

    const contentRefresh = requests.begin('articles/a.md');

    expect(requests.isCurrent(fullReload)).toBe(false);
    expect(requests.isCurrent(contentRefresh)).toBe(true);
    expect(loading.finish(fullReload)).toBe(true);
  });

  test('keeps loading owned by the newest full reload', () => {
    const requests = new WeChatPreviewRequestCoordinator();
    const loading = new WeChatPreviewLoadingCoordinator();
    const firstReload = requests.begin('articles/a.md');
    loading.begin(firstReload);
    const latestReload = requests.begin('articles/b.md');
    loading.begin(latestReload);

    expect(loading.finish(firstReload)).toBe(false);
    expect(loading.finish(latestReload)).toBe(true);
  });
});
