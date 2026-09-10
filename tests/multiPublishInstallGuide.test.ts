import {
  CHROME_EXTENSION_DOWNLOAD_URL,
  CHROME_EXTENSIONS_URL,
  CHROME_INSTALL_STEPS,
} from '../src/multiPublish/installGuide';

describe('multi-platform extension install guide', () => {
  test('uses the browser extension release and Chrome management links', () => {
    expect(CHROME_EXTENSION_DOWNLOAD_URL)
      .toBe('https://github.com/freestylefly/wesight-chrome/releases/latest/download/wesight-chrome.zip');
    expect(CHROME_EXTENSIONS_URL).toBe('chrome://extensions/');
  });

  test('explains the complete unpacked-extension installation flow', () => {
    expect(CHROME_INSTALL_STEPS.map(step => step.title)).toEqual([
      '下载浏览器插件',
      '解压安装包',
      '打开扩展管理页',
      '加载插件文件夹',
    ]);
    expect(CHROME_INSTALL_STEPS[3].description).toContain('开发者模式');
    expect(CHROME_INSTALL_STEPS[3].description).toContain('加载已解压的扩展程序');
    expect(CHROME_INSTALL_STEPS[3].description).toContain('拖入');
  });
});
