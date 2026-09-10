export interface WeChatPreviewRefreshControlState {
  icon: 'loader-circle' | 'refresh-cw';
  label: string;
  disabled: boolean;
  loading: boolean;
}

export interface WeChatPreviewRequest {
  id: number;
  sourcePath: string | null;
}

export class WeChatPreviewRequestCoordinator {
  private requestId = 0;
  private pendingSourcePath: string | null = null;

  begin(sourcePath: string | null): WeChatPreviewRequest {
    this.pendingSourcePath = sourcePath;
    return { id: ++this.requestId, sourcePath };
  }

  isCurrent(request: WeChatPreviewRequest): boolean {
    return request.id === this.requestId;
  }

  isPending(sourcePath: string): boolean {
    return this.pendingSourcePath === sourcePath;
  }

  finish(request: WeChatPreviewRequest): void {
    if (!this.isCurrent(request)) return;
    this.pendingSourcePath = null;
  }

  invalidate(): void {
    this.requestId += 1;
    this.pendingSourcePath = null;
  }
}

export class WeChatPreviewLoadingCoordinator {
  private ownerRequestId: number | null = null;

  begin(request: WeChatPreviewRequest): void {
    this.ownerRequestId = request.id;
  }

  finish(request: WeChatPreviewRequest): boolean {
    if (this.ownerRequestId !== request.id) return false;
    this.ownerRequestId = null;
    return true;
  }

  invalidate(): void {
    this.ownerRequestId = null;
  }
}

export function resolveWeChatPreviewSourcePath(
  activeMarkdownPath: string | null,
  recentFilePath: string | null,
  lastActiveMarkdownPath: string | null,
  currentPreviewPath: string | null,
): string | null {
  return activeMarkdownPath
    ?? recentFilePath
    ?? lastActiveMarkdownPath
    ?? currentPreviewPath;
}

export function resolveWeChatPreviewRefreshControlState(
  refreshing: boolean,
  blocked: boolean,
): WeChatPreviewRefreshControlState {
  return {
    icon: refreshing ? 'loader-circle' : 'refresh-cw',
    label: refreshing ? '正在刷新左侧当前文件预览' : '刷新左侧当前文件预览',
    disabled: refreshing || blocked,
    loading: refreshing,
  };
}
