## AI Usage

<!-- ai-declaration:start -->
[![AI-DECLARATION: pair](https://img.shields.io/badge/䷼%20AI--DECLARATION-pair-ffedd5?labelColor=ffedd5)](https://ai-declaration.md)

**AI declaration** ([v0.1.2](https://ai-declaration.md/en/0.1.2)): `pair`
<!-- ai-declaration:end -->

| Stage | Level | AI involvement | Decision record |
|:--|:--|--:|:--|
| breakdown | pair | 40% | The author identified the retry path and scope; the AI traced the affected requests. |
| design | assist | 20% | The author supplied the three-attempt cap and idempotent-only boundary; the AI filled in the mechanism. |
| testing | pair | 35% | The author required bounded retry and non-idempotent cases; the AI wrote the tests. |
| implementation | pair | 35% | The AI wrote the change; the author required the retry cap and request boundary. |
| review | pair | 40% | The author decided to fix both review comments: adding a three-attempt cap and a non-idempotent request test. The AI implemented the fixes and answered both comments. |
