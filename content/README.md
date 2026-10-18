# 内容配置维护指南

当前公开主页和博客默认读取本目录 JSON，构建时打包到站点，不请求 Cloudflare 内容接口。日常请使用[博客工作台](https://wxh518.github.io/#/admin)写作和配置，首次连接 GitHub 后点击「发布网站」即可自动提交本目录内容与图片，再由 Pages 构建发布，无需手动编辑 JSON。使用方法见[静态工作台指南](../docs/static-studio.md)。本目录仍支持直接编辑，作为开发和数据迁移入口。

新工作台只提交公开文章，草稿和暂存图片保存在浏览器 IndexedDB；不要把含私密草稿的完整备份直接提交到仓库。原 Cloudflare D1 数据和管理模式继续保留，恢复 HTTP 模式时才使用它；其架构见[原云端工作台说明](../docs/content-studio.md)。组件和路由不保存个人资料或文章正文。

| 文件 | 用途 |
| --- | --- |
| `homepage.json` | 个人资料、社交账号、主页板块、作品、技能、书架、文案和统计数据 |
| `posts.json` | 博客文章清单，包括元数据和 Markdown 正文 |
| `schemas/homepage.schema.json` | 主页每个字段的中文说明、必填项、类型和允许值 |
| `schemas/posts.schema.json` | 文章每个字段的中文说明、必填项、类型和允许值 |

## 如何查看中文字段注释

标准 JSON 不支持 `//` 或 `/* */` 注释，所以字段说明集中在 Schema 的 `description` 中，内容文件通过第一行 `$schema` 关联 Schema。VS Code 等支持 JSON Schema 的编辑器可以在悬停字段时显示中文说明，并提供补全、枚举选择和格式报错；也可以直接打开 Schema 阅读说明。

不要把中文注释、说明用的 `_comment` 字段、密码或私密草稿写进内容 JSON。`$schema` 只是编辑器元数据，适配器会去掉它；文章文件的 `schemaVersion` 也不会加入单篇文章或文章列表响应。

## 修改个人资料和作品

在 `homepage.json` 中修改对应字段即可。字段含义、格式和必填项以 Schema 为准：

- `profile`：个人资料；`name` 是主名称，`names` 是首屏轮换文字，`roles[].target` 必须指向 `sections` 中启用的板块。邮箱和社交链接可以留空。
- `sections`：板块顺序和显示开关。关闭某板块时，同时删除或调整指向它的身份标签，防止跳转失效。
- `projects`：分为 `work`、`games`、`essays`、`music`。项目 `id` 在所有分组中唯一且稳定；`tags` 与技能 `tag` 完全一致时会显示关联。可选的 `url`、`image` 没有值时省略。
- `skills`：技能 `tag` 唯一，`level` 是 0 到 10 的整数。
- `books`：书架内容；`category` 自动形成分类，当前界面要求 `title` 唯一。
- `copy`：各板块的展示文案；字符串内使用 `\n` 表示换行。
- `statistics`：`ages` 严格递增，所有 `time[].values` 与年龄一一对应，每个年龄的百分比合计为 100；环形图使用非负数量或权重，总量须大于零。

例如在任一项目数组中加入一项（下面的 `id` 不能与已有项目重复）：

```json
{
  "id": "my-new-project",
  "title": "我的新项目",
  "subtitle": "一句话说明它的用途",
  "description": "介绍项目解决的问题、实现方式和你的贡献。",
  "tags": ["React", "TypeScript"],
  "art": "code",
  "url": "https://github.com/wxh518/example",
  "image": "./images/example.webp"
}
```

本地图片放在 `public/images/`，文件路径与配置对应。若暂时没有图片或项目链接，删除示例中的 `image`、`url` 字段。

数组顺序就是显示顺序；项目、社交账号、板块、书籍、图表分类和技能都遵循这一规则。当前展示所需的视觉配置（颜色、占位插画等）保留在内容配置里，布局、动画和组件代码仍由前端负责。

## 添加博客文章

在 `posts.json` 的 `posts` 数组中增加对象：

```json
{
  "slug": "my-first-note",
  "title": "我的第一篇技术笔记",
  "description": "一句话摘要。",
  "publishedAt": "2026-10-15",
  "tags": ["TypeScript", "学习笔记"],
  "readingMinutes": 3,
  "body": "## 开始\n\n这里是 **Markdown** 正文。\n\n- 第一点\n- 第二点"
}
```

`slug` 是文章的稳定地址，只使用小写英文字母、数字和中间连字符；修改标题时保持它不变。`publishedAt` 使用真实日期 `YYYY-MM-DD`；`readingMinutes` 是正整数。列表按文件中的顺序返回，建议将最新文章放在最前面；`posts: []` 表示暂无文章。

正文和元数据都在 JSON 中，暂不引入独立 Markdown 文件或 CMS。编辑器会自动处理换行转义；直接粘贴多行文本时要确保它仍是合法的 JSON 字符串。文章列表 API 不返回 `body`，详情 API 才返回正文。

## 校验、运行和发布

```sh
npm run validate:content
npm test
npm run build:api
npm run build
```

校验会报告具体文件和字段路径，例如 `content/homepage.json/skills/0/level`。除了字段类型和格式，还会检查重复标识、失效的板块引用、年龄与时间序列对应关系、百分比和图表总量。未知字段也会报错，帮助发现字段名拼写错误。

`npm run dev`、`npm run dev:api`、`npm run build`、`npm run build:api` 和 `npm run deploy:api` 都通过 npm 的 `pre...` 脚本先执行配置校验。直接执行 `vite` 或 `wrangler` 会跳过这些项目脚本，因此日常使用以上 npm 命令。开发期间修改 JSON 后，Vite/Wrangler 会监听依赖变化；提交前再次执行校验和测试。

Cloudflare Workers 使用 D1 中的已发布快照，不会读取本机 `D:` 盘，也不会在每次请求时访问 GitHub 文件。打包时导入的 JSON 仅在数据库尚未初始化或无数据库环境下作为来源；更新种子文件不会覆盖数据库。工作台点击发布后，已有客户端最多保留约 60 秒内容缓存。修改前端组件时通过 Git 推送触发 GitHub Pages 发布。

## 数据访问设计与数据库迁移

当前调用关系：

```text
React 页面 → HTTP 内容适配器 → Hono 路由 → D1 已发布快照 → ContentService
离线预览 ───────────────────────────────────────────────→ JSON 配置适配器
```

`src/services/config-content-service.ts` 是 JSON 适配器，静态导入内容文件，创建只读快照，用文章 `slug` 建立查询索引，并明确选择文章列表允许公开的字段。返回结果是副本，避免调用方修改共享数据。`createConfigContentService` 支持测试注入独立数据，不需要修改磁盘文件。

现有 `src/types/content.ts` 中的 `ContentService` 继续作为数据访问边界：

```ts
interface ContentService {
  getHomepage(signal?: AbortSignal): Promise<HomepageContent>
  getPosts(signal?: AbortSignal): Promise<PostSummary[]>
  getPost(slug: string, signal?: AbortSignal): Promise<Post | null>
}
```

当前 D1 将主页和文章作为一个有修订号的 JSON 文档保存，并区分草稿、已发布快照和发布历史。`worker/database.ts` 把已发布快照转换为相同的 `ContentService`，草稿文章在公开适配器中过滤。以后需要独立管理项目、书籍或文章时，可以拆表或新增其他数据库适配器；`createApp(content)` 仍支持测试注入。

页面和 HTTP 路由继续使用现有数据契约，Schema 约束的是当前 JSON 文件格式，未来不要求数据库表结构与文件完全相同。`schemaVersion` 表示结构版本，编辑名称、数量或正文时保持为 1；出现不兼容结构变化时，需要同步调整类型、Schema、适配器和客户端。

Ajv 在 Node.js 构建阶段生成静态校验代码，浏览器和 Worker 复用静态函数及关联校验，不在请求时动态编译 Schema。管理接口发布前执行完整校验，并单独验证管理员会话。

## 布局与图表展示配置

- `profile.avatarImage`：首屏、内容区和地图共用的头像；省略时显示名字首字。
- `profile.socials[].metrics` / `copy.essays.metrics`：按顺序展示的 `{ value, unit }` 统计项。
- `copy.music.decorations`：音乐区右上、左下的两张背景乐器图片。
- `statistics.time[].labelPosition`：面积图标签的 `{ x, y, scale }`，相对于 500×300 画布；省略时按数据自动定位。
- `statistics.ages` / `time[].values`：年龄和百分比一一对应，同一年龄下各项合计 100；`-1` 可作为出生前的过渡点。
- `statistics.movies` / `statistics.music`：雷达图分类，至少三项，数量按最大分类归一化，不要求合计 100。
- `statistics.space`：地图路径、无障碍说明、头像左上角的百分比坐标 `{ x, y }` 和位置文字，不请求真实地理位置。
- `statistics.descriptions`：四个统计模块的介绍文案。

当前地图、头像、封面和统计数值为参考布局的演示内容；替换时一并更新 `mapAlt` 和位置文字。所有新字段的限制和中文含义仍以 `schemas/homepage.schema.json` 为准。未来接口或数据库适配器返回相同字段即可继续使用这些组件。
