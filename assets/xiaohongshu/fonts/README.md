# Xiaohongshu Typography Fonts

These fonts are embedded as WOFF2 data URLs so Xiaohongshu image rendering is
deterministic and remains local. The source snapshot is Google Fonts commit
`5e35378e6bda803962ee6fd257e444a7d459660d`.

| Asset | Runtime family | Template use | Bundled SHA-256 |
| --- | --- | --- | --- |
| `NotoSansSC-GB2312.woff2` | `WeSight Noto Sans SC` | Basic, Illustrated | `4095babdf2347031f645b5ac90d608dd48547f391b309b2ed3831e0bf706147f` |
| `NotoSerifSC-GB2312.woff2` | `WeSight Noto Serif SC` | Minimal | `b50386d2dafe46781a2e6c0b78179e62abe703e7bbc5166cf947ed02e75e72f1` |
| `ZCOOLKuaiLe-Regular.woff2` | `WeSight ZCOOL KuaiLe` | Comic | `647383ba8fd27e976e217ebd6382dd17f4fe593a054bd42513b8322fbbf92c58` |
| `MaShanZheng-Regular.woff2` | `WeSight Ma Shan Zheng` | Scribble | `aff4ae66aa9c80e456c3e7bbf569ff52b5540d102577eb1af869b84766712dfc` |

## Source And Coverage

- `NotoSansSC-GB2312.woff2` comes from `NotoSansSC[wght].ttf` (source
  SHA-256 `a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da`).
- `NotoSerifSC-GB2312.woff2` comes from `NotoSerifSC[wght].ttf` (source
  SHA-256 `050080d9255a86808f2945bffac582b31ef32bc36411ce29563b4961670c66f9`).
- Both Noto files were subset with FontTools 4.64.0 and Brotli 1.2.0. They
  contain 8,003 Unicode mappings and retain their complete variable weight
  axes. The requested set covers GB2312, ASCII, Latin-1, common Unicode and CJK
  punctuation, arrows, enclosed alphanumerics, and full-width forms.
- `ZCOOLKuaiLe-Regular.woff2` comes from the complete
  `ZCOOLKuaiLe-Regular.ttf` (source SHA-256
  `812a6fc1fe54b6d73a419245c32dfeba8aa33104d5be90d1cf6af082007cb71d`).
  WOFF2 re-encoding retains all 7,053 Unicode mappings.
- The existing Ma Shan Zheng asset was retained. Its family, version 2.003,
  7,015 Unicode mappings, and required sample glyphs match the pinned upstream
  `MaShanZheng-Regular.ttf` (source SHA-256
  `6d2546bb189c732a8ca29af9e22457b152387d158aa459e4ac2ce1e51788b7fb`).

All four assets cover the comparison phrase `后天早上海外滩` and the common UI
sample `文章标题正文标签小红书官方文字排版高亮关键词 AI WeSight`. Characters
outside a bundled font's repertoire use the renderer's system-font fallback.

The corresponding SIL Open Font License 1.1 texts are in `LICENSES/`, and the
redistribution notices are in `THIRD_PARTY_NOTICES.md`.
