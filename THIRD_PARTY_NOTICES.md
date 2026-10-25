# 第三方代码与素材

## mexicat/pdoom-video（MIT License）

`src/engine/util.ts` 的大部分缓动 / 噪声 / 关键帧工具，以及 `src/engine/fx.tsx` 中的火花头部与迸溅粒子，移植自 [mexicat/pdoom-video](https://github.com/mexicat/pdoom-video)。

```
MIT License

Copyright (c) 2026 Giacomo Magnanini

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 字体（SIL Open Font License 1.1）

`public/fonts/` 下的字体按 OFL 1.1 随工程分发，许可证全文见 `public/fonts/licenses/`。

| 文件 | 字体 | 说明 |
| --- | --- | --- |
| `NotoSansSC-*.woff2` | 思源黑体（Noto Sans SC） | 裁剪到 GB2312 常用字 |
| `NotoSerifSC-*.woff2` | 思源宋体（Noto Serif SC） | 裁剪到 GB2312 常用字 |
| `Archivo-Variable.woff2` | Archivo | 可变字重 / 字宽 |
| `ibm-plex-mono-*.woff2` | IBM Plex Mono | 拉丁子集 |
| `cormorant-garamond-*.woff2` | Cormorant Garamond | 拉丁子集 |

`public/tex/` 下的颗粒贴图由脚本生成，无第三方版权。
