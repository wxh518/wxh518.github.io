# Orbit — 个人主页

参考 [qzq.at](https://www.qzq.at/) 的布局与交互重新实现。技术栈为 React、TypeScript、Vite、Tailwind CSS 和 Motion。当前资料、数字、项目、文章和书籍都是演示内容；插画为本地 SVG 占位图。

站点地址：[wxh518.github.io](https://wxh518.github.io/)。博客入口：[文章列表](https://wxh518.github.io/#/blog)。

## GitHub Pages 发布

仓库 `wxh518/wxh518.github.io` 使用 `.github/workflows/deploy-pages.yml` 自动发布。向 `master` 推送后，GitHub Actions 使用 Node.js 22 安装锁定依赖、执行 TypeScript 检查和生产构建，再把 `dist/` 发布到 GitHub Pages。也可以在 Actions 中手动运行该工作流。

```sh
npm run build
git add .
git commit -m "Update homepage content"
git push origin master
```

仓库 Settings → Pages → Source 应为 **GitHub Actions**。不需要提交 `dist/`，也不需要将凭据写入仓库。发布状态可在仓库 Actions 中查看。

旧 Hexo 站点的文章、归档和依赖资源保存在 `public/2023`、`public/2024`、`public/2025`、`public/archives`、`public/tags`、`public/css`、`public/js` 和 `public/img`，构建时原样复制，原链接保持可访问。旧首页另存为 `/legacy/`。这些是旧站静态产物，后续如需改写为新博客文章，应单独迁移到内容配置或接口。

## 本地运行

```sh
npm install
npm run dev
```

打开 http://127.0.0.1:5173/ 。端口固定为 5173；若端口被占用，先关闭旧的开发服务，或使用 `npm run dev -- --port 5174`。

```sh
npm run typecheck
npm run build
npm run preview
```

构建产物在 `dist/`。开发环境需要 Node.js 20.19+ 或 22.12+。

## 修改内容

| 文件 | 用途 |
| --- | --- |
| `src/data/homepage.ts` | 个人资料、社交账号、项目、技能、书架、统计数据、介绍文案与板块配置 |
| `src/data/posts.ts` | 博客文章元数据与 Markdown 正文 |
| `src/types/content.ts` | 所有内容类型和 `ContentService` 接口契约 |
| `src/services/content-service.ts` | 本地配置 / HTTP 请求适配器 |
| `src/hooks/useContent.ts` | 请求生命周期、取消、加载状态、错误与重试 |
| `src/App.tsx` | 页面路由、公共布局和主页板块注册表 |
| `src/components/` | 独立的展示与交互组件 |
| `src/pages/Blog.tsx` | 博客列表、搜索、标签筛选与文章阅读页，按需加载 |
| `src/Artwork.tsx` | 本地 SVG 占位封面 |
| `src/styles.css` | 主题、布局、响应式规则与 CSS 动画 |

### 个人信息与项目

`profile` 包含名称、轮换名字、身份列表、所在地、联系邮箱与社交链接。社交链接和邮箱默认为空，因此不会导向虚构的账户；点击会打开预览详情。

项目支持标题、简介、详情、技术标签、可选 `url` 和可选 `image`。`image` 未配置时使用 `art` 对应的内置插画。建议把自己的图片放在 `public/images/`，配置为 `./images/example.webp`，或在配置模块中导入 `src/assets/` 下的文件。

`copy` 集中保存个人介绍、内容创作、音乐、设备和阅读文案。`isDemo` 控制页面级演示标记；确认真实资料后再关闭它。界面上的少量说明性占位提示也应在正式发布前检查。

### 板块扩展

`sections` 数组顺序就是主页板块顺序：

```ts
{ id: 'music', label: 'Music', enabled: true, inNavigation: true }
```

`enabled: false` 隐藏板块；`inNavigation` 控制是否加入顶部菜单。增加一种新板块时：扩展 `SectionId` 和相应内容类型，新增展示组件，在 `App.tsx` 的 `sectionComponents` 中注册，再加入配置数组。

目前保留具名板块类型，而没有引入通用页面编辑器或复杂的插件机制。

## 后续接入 HTTP API

默认完全使用本地配置，不请求外部内容接口。复制 `.env.example` 为 `.env.local` 后可切换：

```dotenv
VITE_CONTENT_SOURCE=http
VITE_CONTENT_API_URL=https://your-api.example.com/api
```

修改环境变量后重启 Vite。适配器请求以下接口，响应直接返回 JSON 数据，不使用 `{ data: ... }` 包装：

| 方法与地址 | 返回契约 |
| --- | --- |
| `GET /homepage` | `HomepageContent`，包含 `schemaVersion: 1` |
| `GET /posts` | `PostSummary[]`，不包含正文 |
| `GET /posts/:slug` | `Post`，包含 Markdown `body`；文章不存在时返回 404 |

接口字段映射、认证和缓存应加入适配器，页面组件不需要直接调用 `fetch`。请求支持 AbortSignal 取消；服务错误会显示重试入口；404 文章显示独立空状态。当前 HTTP 适配器只有顶层格式检查，真实 API 接入时应按后端约定补充字段级运行时校验。

跨域接口需要服务端允许网站来源。`VITE_*` 环境变量会进入公开的浏览器代码，不用于存放秘密。

## 博客与静态托管

- `/#/blog`：列表、关键词搜索和标签筛选。
- `/#/blog/:slug`：Markdown 阅读页，可直接访问和刷新。
- 使用 HashRouter，使静态主机上的文章刷新不依赖服务器回退规则。
- 后续若需要适合搜索引擎的 `/blog/slug/` 链接和每篇文章独立的分享元数据，应引入文章静态生成 / 预渲染，再切换路由方式。
- Vite 使用相对资源路径 `base: './'`，支持 GitHub Pages；发布工作流只上传构建产物。

## 可体验的交互

首屏名字轮换、CSS 图标轨道、鼠标立体倾斜、双向社交卡片循环、数字增长、滚动入场与视差、技能/项目关联连线、作品详情弹窗、内容标签筛选、音乐波形、统计切换、书架分类与立体书封、手机菜单、博客搜索与文章页。

顶部暂停按钮控制持续动画，尊重系统的“减少动态效果”设置。详情弹窗支持 Escape，书架分类支持左右方向键，手机上可点击查看桌面悬停内容。

## 已完成验证

TypeScript 检查与生产构建；桌面 / 390px 手机预览；作品弹窗、书架切换、手机菜单、动画暂停、文章搜索、Markdown 代码块、文章深链接刷新。当前 HTTP 数据源是预留适配器，尚未对接真实后端。
