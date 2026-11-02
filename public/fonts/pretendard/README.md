# Pretendard Variable v1.3.9

Unmodified official Korean variable WOFF2, self-hosted for the FunJeju interface.

- Project/author: [Pretendard / Kil Hyung-jin (orioncactus)](https://github.com/orioncactus/pretendard/tree/v1.3.9)
- Font source: https://raw.githubusercontent.com/orioncactus/pretendard/v1.3.9/packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2
- Official CSS declaring the family and weight range: https://raw.githubusercontent.com/orioncactus/pretendard/v1.3.9/dist/web/variable/pretendardvariable.css
- License source: https://raw.githubusercontent.com/orioncactus/pretendard/v1.3.9/LICENSE
- License: SIL Open Font License 1.1, copyright 2021 Kil Hyung-jin; Reserved Font Name Pretendard. Original full license is shipped unchanged in `LICENSE.txt`.
- Retrieved: 2026-11-01 via HTTPS from the official release tag; no modification, recompression, or subsetting.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| PretendardVariable-v1.3.9.woff2 | 2057688 | `9599f12fd42fc0bce1cd50b47a0c022e108d7aa64dd0d1bb0ed44f3282d900b4` |
| LICENSE.txt | 4418 | `d31ddd9f2bed32fd7e302a205cf2380ba0de6529152d239ef99cfb6f261bfc04` |

The official CSS family is **Pretendard Variable**, weight range **45–920**. `app/globals.css` registers exactly this family and puts it first in `--font-sans`. The previous CDN stylesheet declared this variable family while the application requested `Pretendard`, causing fallback. The external font stylesheet is removed; the root layout preloads the same-origin WOFF2 with an anonymous font request. `font-display: swap` and system fallbacks keep text visible if loading is slow or fails.

This single complete file costs approximately 1.96 MiB once per browser cache rather than many dynamic subset files. No new package, service, credential, or runtime CDN request is needed. Local browser QA decoded the same-origin face for Korean text successfully. An independent fontTools review using Node's built-in Brotli decoder confirmed family Pretendard Variable, version 1.309, 14,757 glyphs, and the Korean/Latin UI sample coverage. Binary signature/length/hash, CSS/preload agreement, lint and TypeScript also pass; no decoder dependency was installed.
