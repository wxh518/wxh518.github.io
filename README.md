# Orbit — 个人主页

参考 [qzq.at](https://www.qzq.at/) 的布局与交互重新实现。前端使用 React、TypeScript、Vite、Tailwind CSS 和 Motion，后端使用 Cloudflare Workers、TypeScript 和 Hono。个人资料、项目介绍、文章和书籍为占位内容；部分公开图片和统计示例用于布局对照，后续可在 JSON 配置中替换。

站点地址：[wxh518.github.io](https://wxh518.github.io/)。博客入口：[文章列表](https://wxh518.github.io/#/blog)。

后端地址：[内容 API](https://wxh518-homepage-api.orbit-homepage.workers.dev/)，[健康检查](https://wxh518-homepage-api.orbit-homepage.workers.dev/api/health)。

## GitHub Pages 发布

仓库 `wxh518/wxh518.github.io` 使用 `.github/workflows/deploy-pages.yml` 自动发布前端。向 `master` 推送后，GitHub Actions 使用 Node.js 22 安装锁定依赖，执行接口测试、Worker 打包检查、前后端 TypeScript 检查和前端生产构建，再把 `dist/` 发布到 GitHub Pages。也可以在 Actions 中手动运行该工作流。

后端通过本机 Wrangler 发布到 Cloudflare。首次使用运行 `npx wrangler login` 并在浏览器授权；发布目标由 `wrangler.jsonc` 指定。修改接口或配置数据后，先发布后端，再推送源码：

```sh
npm test
npm run deploy:api
npm run build
git add .
git commit -m "Update homepage content"
git push origin master
```

仓库 Settings → Pages → Source 应为 **GitHub Actions**。`.env.production` 保存公开的 Worker API 地址，构建时写入前端；修改它后需要重新构建。当前 GitHub 工作流只自动发布前端，**不会自动更新 Worker**，因此修改 `content/` 中的数据后也要执行 `npm run deploy:api`。纯界面修改只需推送。

不需要提交 `dist/`、`worker-dist/` 或 `.wrangler/`，也不要将登录凭据写入仓库。GitHub Actions 不需要 Cloudflare Token；以后如需自动发布后端，可另行配置有 Workers 发布权限的 CI 凭据。

旧 Hexo 站点的文章、归档和依赖资源保存在 `public/2023`、`public/2024`、`public/2025`、`public/archives`、`public/tags`、`public/css`、`public/js` 和 `public/img`，构建时原样复制，原链接保持可访问。旧首页另存为 `/legacy/`。这些是旧站静态产物，后续如需改写为新博客文章，应单独迁移到内容配置或接口。

## 本地运行

```sh
npm install
npm run dev:api
```

在第二个终端启动前端：

```sh
npm run dev
```

打开 http://127.0.0.1:5173/ 。前端请求 `/api`，Vite 将请求代理到本地 Worker `http://127.0.0.1:8787`，开发时也会实际经过 HTTP 接口。Wrangler 本地模拟器不需要 Cloudflare 登录。端口固定为 5173 和 8787；如需更改，同时更新 Vite 代理或 CORS 配置。

```sh
npm run typecheck
npm run validate:content
npm test
npm run build:api
npm run build
npm run preview
```

前端构建产物在 `dist/`，Worker 打包检查产物在 `worker-dist/`。开发环境使用 Node.js 22.12+。生产构建需要有效的 HTTPS API 地址，缺少配置会直接报错，以免把相对 `/api` 地址发布到 GitHub Pages。

如果只想离线看界面，可创建不提交的 `.env.development.local`，写入 `VITE_CONTENT_SOURCE=local`，然后重启前端。线上构建使用 HTTP 模式，不会把配置内容作为失败回退静默展示。

## 修改内容

| 文件 | 用途 |
| --- | --- |
| `content/homepage.json` | 个人资料、社交账号、项目、技能、书架、统计数据、介绍文案与板块配置 |
| `content/posts.json` | 博客文章元数据与 Markdown 正文，包含结构版本和 posts 数组 |
| `content/schemas/` | 每个字段的中文说明、必填项、类型和格式校验规则 |
| `content/README.md` | 配置示例、字段维护方式、发布流程与数据库迁移设计 |
| `scripts/validate-content.ts` | 构建前的 JSON 读取和校验入口 |
| `scripts/content-validation.ts` | JSON Schema 校验及重复标识、引用和图表约束检查 |
| `src/types/content.ts` | 所有内容类型和 `ContentService` 接口契约 |
| `worker/index.ts` | Hono HTTP 路由、跨域、缓存和错误响应 |
| `wrangler.jsonc` | Worker 名称、本地端口和允许的前端来源 |
| `src/services/config-content-service.ts` | JSON 数据适配器、只读快照和文章索引；后端和可选的离线预览共用 |
| `src/services/http-content-service.ts` | 前端 HTTP 适配器、15 秒超时、取消和响应检查 |
| `src/services/content-service.ts` | 根据构建环境选择数据适配器 |
| `tests/` | 路由、跨域、错误分支及真实前后端契约测试 |
| `src/hooks/useContent.ts` | 请求生命周期、取消、加载状态、错误与重试 |
| `src/App.tsx` | 页面路由、公共布局和主页板块注册表 |
| `src/components/` | 独立的展示与交互组件 |
| `src/pages/Blog.tsx` | 博客列表、搜索、标签筛选与文章阅读页，按需加载 |
| `src/Artwork.tsx` | 本地 SVG 占位封面 |
| `src/styles.css` | 主题、布局、响应式规则与 CSS 动画 |
| `src/styles/homepage.css` | 参照站点校准的页边距、名片、错叠卡片、拼贴布局和响应式规则 |

### 个人信息与项目

内容维护详见 [content/README.md](content/README.md)。所有业务内容使用标准 JSON；字段的中文注释放在配套 JSON Schema 的 `description` 中，支持 Schema 的编辑器可显示悬停说明和补全。开发启动、构建和部署脚本会自动执行 `npm run validate:content`，拒绝未知字段、不合法数据和失效引用。

`profile` 包含名称、轮换名字、身份列表、所在地、联系邮箱与社交链接。社交链接和邮箱默认为空，因此不会导向虚构的账户；点击会打开预览详情。

项目支持标题、简介、详情、技术标签、可选 `url` 和可选 `image`。`image` 未配置时使用 `art` 对应的内置插画。建议把自己的图片放在 `public/images/`，配置为 `./images/example.webp` 或完整的 HTTPS 图片地址。配置文件需要保持可序列化的数据，不直接导入前端图片或 React 组件，以便同时由 Worker 使用。

`copy` 集中保存个人介绍、内容创作、音乐、设备和阅读文案。`isDemo` 控制页面级演示标记；确认真实资料后再关闭它。界面上的少量说明性占位提示也应在正式发布前检查。

### 板块扩展

`sections` 数组顺序就是主页板块顺序：

```json
{ "id": "music", "label": "Music", "enabled": true, "inNavigation": true }
```

`enabled: false` 隐藏板块；`inNavigation` 控制是否加入顶部菜单。关闭板块时，需要调整 `profile.roles[].target`，避免链接指向隐藏板块。增加一种新板块时：扩展 `SectionId`、相应内容类型和 Schema，新增展示组件，在 `App.tsx` 的 `sectionComponents` 中注册，再加入配置数组。

目前保留具名板块类型，而没有引入通用页面编辑器或复杂的插件机制。

## 已接入的 HTTP API

默认使用 HTTP 接口，配置内容由 Worker 返回。生产环境地址配置在 `.env.production`，本地默认使用代理路径 `/api`：

```dotenv
VITE_CONTENT_SOURCE=http
VITE_CONTENT_API_URL=https://wxh518-homepage-api.orbit-homepage.workers.dev/api
```

修改环境变量后重启 Vite。适配器请求以下接口，响应直接返回 JSON 数据，不使用 `{ data: ... }` 包装：

| 方法与地址 | 返回契约 |
| --- | --- |
| `GET /health` | `{ status: 'ok', schemaVersion: 1, source: 'config' }`，用于验证接口在线 |
| `GET /homepage` | `HomepageContent`，包含 `schemaVersion: 1` |
| `GET /posts` | `PostSummary[]`，不包含正文 |
| `GET /posts/:slug` | `Post`，包含 Markdown `body`；文章不存在时返回 404 |

上表路径均位于 `/api` 下。文章列表不返回 Markdown 正文，打开详情时再单独请求。接口字段映射与数据存储集中在适配器，页面组件不直接调用 `fetch`。请求支持 AbortSignal 取消和 15 秒超时；服务错误会显示重试入口，404 文章显示独立空状态。前端检查主页的关键顶层结构及文章字段；未来接入不受控的数据源时，应扩展为完整的运行时 schema 校验。

Worker 只提供公开的只读内容接口，拒绝写入方法；正常内容响应允许浏览器缓存 60 秒，错误和健康检查不缓存。CORS 允许 `https://wxh518.github.io` 及配置的本地开发来源；CORS 是浏览器跨域规则，不是身份认证。后续若增加管理或写入接口，需要单独实现认证和权限校验。

`VITE_*` 环境变量会进入公开的浏览器代码，不用于存放秘密。当前 `content/*.json` 仍是唯一内容来源：文件通过静态导入打包进 Worker，修改配置后重新部署 Worker 即可更新内容，现阶段没有数据库，也没有在线修改内容的后台。未来数据库适配器实现 `ContentService`，通过 `createApp(content)` 注入即可；无需改动页面或现有 HTTP 响应结构。

## 博客与静态托管

- `/#/blog`：列表、关键词搜索和标签筛选。
- `/#/blog/:slug`：Markdown 阅读页，可直接访问和刷新。
- 使用 HashRouter，使静态主机上的文章刷新不依赖服务器回退规则。
- 后续若需要适合搜索引擎的 `/blog/slug/` 链接和每篇文章独立的分享元数据，应引入文章静态生成 / 预渲染，再切换路由方式。
- Vite 使用相对资源路径 `base: './'`，支持 GitHub Pages；发布工作流只上传构建产物。

## 可体验的交互

首屏名字轮换、CSS 图标轨道、鼠标立体倾斜、双向社交卡片循环、数字增长、滚动入场与视差、技能/项目关联连线、作品详情弹窗、内容标签筛选、音乐波形、面积图分类高亮及雷达图详情、书架分类与立体书封、手机菜单、博客搜索与文章页。

Time 悬停按活动色块高亮：白色描边由 0 过渡到 5 个 SVG 单位，时长 500ms，使用 Cubic InOut 缓动；移出后恢复。图中不显示年龄提示框或竖线。键盘方向键也可切换分类，高亮状态通过无障碍状态文本播报；系统减少动态效果时直接切换描边。

顶部暂停按钮控制持续动画，尊重系统的“减少动态效果”设置。详情弹窗支持 Escape，书架分类支持左右方向键，手机上可点击查看桌面悬停内容。

首页按参考站的 1024 / 1280 / 1536px 断点分别使用 64 / 128 / 176px 页边距；桌面名片为 412×458px。手机使用独立的名片尺寸和单列布局。轨道图标保存在 `public/images/orbit/`；参考站公开的头像、地图、作品和乐器演示素材保存在 `public/images/reference/`，来源记录见其中的 `sources.json`。这些是布局对照素材，不代表站点所有者的个人经历或作品；正式使用时替换为自己的图片。个人资料继续使用占位内容。

演示静态图片已按网页展示尺寸生成 WebP，透明背景保留，GIF 动画保留原格式；参考素材总体积由约 16.3MB 降至 2.9MB。衍生文件映射见 `public/images/reference/web-assets.json`，本机原图备份在被 Git 忽略的 `.deployment-repo/reference-originals/`。

Time 使用 500×300 坐标系的平滑堆叠面积图，年龄按实际间距映射，标签位置、颜色和百分比均由 JSON 配置。Movie / Album 为五层网格的雷达图，使用闭合 Cardinal 曲线并按容器宽度重算几何；Space 使用地图图片、百分比定位的头像及脉冲动画。图形组件和样式位于 `src/components/statistics/`，通用几何函数位于 `src/lib/chart-geometry.ts`，不依赖第三方图表库。

## 已完成验证

前后端 TypeScript 检查、JSON 配置校验、23 项配置 / 接口 / 客户端 / 图形几何测试、Worker 打包检查；桌面 / 390px 手机预览；作品弹窗、书架切换、手机菜单、动画暂停、文章搜索、Markdown 代码块和文章深链接刷新。
