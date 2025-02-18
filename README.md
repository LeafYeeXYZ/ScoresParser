# 北师大学业成绩解析分析器

本工具可以用来一键获取入学以来的学业成绩, 并自动计算各学期和总体的加权平均成绩等信息. 使用 `TypeScript` 编写, 通过[`deno`](https://deno.com) 运行 (如果未来有需要, 我也可以把它编译成可执行文件, 以供直接下载使用).

脚本成功运行后, 将产生 3 个文件: `raw.html` (成绩页面的原始 HTML, 已将编码调整为 `UTF-8`, 修复了老旧的教务系统的编码问题), `scores.json` (成绩数据), `stat.json` (统计数据).

[![JSR Version](https://jsr.io/badges/@leaf/bnu-parser)](https://jsr.io/@leaf/bnu-parser)
[![JSR Scope](https://jsr.io/badges/@leaf)](https://jsr.io/@leaf)
[![JSR Score](https://jsr.io/badges/@leaf/bnu-parser/score)](https://jsr.io/@leaf/bnu-parser/score)

## 使用方法

```typescript
// main.ts
import parser from 'jsr:@leaf/bnu-parser'

await parser({
  username: '学号',
  password: '密码',
})
```

```bash
deno run -A npm:puppeteer browsers install chrome
deno run -A main.ts
```

> 详见[文档](https://jsr.io/@leaf/bnu-parser/doc).
