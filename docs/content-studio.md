# 可视化内容工作台

本文描述保留的 Cloudflare HTTP 管理模式。当前默认 `#/admin` 已改为直接发布 GitHub 的静态博客工作台，请按[新工作台使用指南](static-studio.md)操作；下方入口、云端密码和 D1 保存流程仅在选择 HTTP 数据源后适用。

入口：[wxh518.github.io/#/admin](https://wxh518.github.io/#/admin)。当前为单站点、单管理员模式。

**当前默认模式的区别**：公开站点读取本地 JSON，新博客工作台直接提交 GitHub 并触发静态部署。原 Cloudflare 管理数据、草稿和发布历史继续保留；以下“一键发布到 D1、60 秒接口缓存”的描述适用于恢复 HTTP 数据源后的模式。

## 日常使用

1. 用本机 `.deployment-repo/admin-access.txt` 中的初始密码登录，在「备份与安全」设置自己的密码。修改后初始密码失效。
2. 在「个人资料」填写名字、轮换名称、介绍、头像和社交链接；可以直接上传图片。头像未设置时显示姓名首字。
3. 编辑作品、技能、书单与各模块文案。列表支持新增、删除和上下移动。关闭模块会移除指向该模块的身份标签，避免跳转失效。
4. **保存草稿**把当前编辑区写入云端，不改变公开主页；浏览器也每隔约 600ms 写入本机恢复缓存。更换设备时使用已保存的云端草稿。
5. **预览**打开独立的主页草稿窗口，在工作台继续修改时预览随之更新。文章正文在博客编辑区实时预览。
6. **发布到主页**校验并原子更新全站公开快照。主页接口最多缓存 60 秒，稍后刷新即可看到新内容。

新建文章默认「草稿（不公开）」，即使发布全站配置，它也不会进入公开列表或详情接口。文章准备好后，改为「公开文章」，再发布全站配置。旧文章未配置 `status` 时视为公开。

如果暂时保留示例内容，请保留「显示示例数据提示」。全部换成真实内容后再关闭。书单、图表和足迹并非必填个人经历，可以在「模块与导航」中暂时隐藏。

## 备份与恢复

- 导出 JSON 包含当前编辑区里的完整主页、文章及文章可见性；可能包含未发布草稿，请自己保管。
- 导入完整工作台备份只替换编辑区，不会立即公开。导入前可先导出当前内容。
- 最近 20 次发布保存在 D1。载入历史版本同样只替换编辑区，检查后再发布。
- 多个标签页同时编辑时，用修订号阻止静默覆盖。遇到 409 冲突，先导出本地内容，再重新载入云端草稿。
- 本机恢复缓存与预览数据均只保存在当前浏览器，不会发送到公开接口。公共电脑上使用完后，退出登录并清除网站数据。

图片会在浏览器缩放到最长边 1600 像素并压缩为 WebP，单张最多 512 KB，当前保存在 D1 的独立媒体表。仅支持 PNG、JPEG、WebP；不接受 SVG 或可执行文件。已上传图片通过不可变公开 URL 读取，**不要上传私密图片**。JSON 备份记录图片链接，不包含图片二进制；如需迁移整个站点，应同时导出 D1。将来图片量增加时可以替换为 R2，不改变内容字段。

## 数据边界

```text
管理页（React 中文表单）
  ├─ 保存草稿 → Hono 管理接口 → D1 draft
  └─ 发布 → 同一套 Schema + 关联校验 → D1 published + 发布历史

公开主页 / 博客（当前） → ContentService → content/*.json（随站点构建）
公开主页 / 博客（可选 HTTP 模式） → ContentService → Hono 只读接口 → D1 published
首次初始化 → content/*.json
```

JSON 当前是静态主页的内容来源，同时保留后端初始化种子的作用。修改 JSON 并重新部署 Pages 会更新静态主页；重新部署 Worker **不会覆盖已保存的 D1 内容**。云端内容仍通过工作台维护；首次初始化只执行 `INSERT OR IGNORE`，不使用清表或覆盖操作。

`ContentService` 接口维持不变；后续可以拆分为 profiles/projects/posts 等表。目前整个站点作为一个文档保存，以便原子发布和恢复，避免一半新、一半旧的数据状态。

## 管理接口与鉴权

| 接口 | 用途 |
| --- | --- |
| `POST /api/admin/login` | 密码登录，返回 8 小时会话令牌 |
| `GET /api/admin/content` | 读取完整草稿与修订信息 |
| `PUT /api/admin/content` | 按修订号保存草稿或发布 |
| `GET /api/admin/history` | 发布历史摘要 |
| `GET /api/admin/history/:revision` | 读取历史快照 |
| `POST /api/admin/media` | 上传压缩图片 |
| `PUT /api/admin/password` | 验证当前密码并设置新密码 |
| `POST /api/admin/logout` | 撤销当前会话 |

除登录外，管理接口都要求 `Authorization: Bearer ...`。客户端令牌只在 `sessionStorage` 和内存中保存，不写入 URL、配置文件或公开产物。服务端只保存会话令牌的 SHA-256 摘要，退出或修改密码后撤销相应会话。密码使用带随机盐的 PBKDF2-SHA256（100,000 次）；登录及改密尝试每个 IP 每 15 分钟最多 5 次。管理响应不缓存，跨域仅允许配置的 Pages 与本地来源，公开 GET 接口仍保持只读。

完整字段格式来自现有 JSON Schema。`npm run generate:validators` 在构建阶段生成静态校验函数，浏览器和 Worker 复用它们及跨字段校验；Worker 中不动态编译 Schema。

## 本地开发与部署

```sh
npm ci
npm run db:migrate
npm run setup:admin
npm run dev:api
# 第二个终端
npm run dev
```

`.dev.vars` 存本机密码摘要，`.deployment-repo/admin-access.txt` 存初始密码，两者都被 Git 忽略。`setup:admin` 重复运行会复用同一个本机初始密码；如果数据库里已修改管理密码，它不会覆盖数据库中的密码。

新环境需要有 D1 写权限的 Cloudflare 授权。绑定在 `wrangler.jsonc`，数据库名为 `wxh518-homepage-content`。上线数据库迁移和 Worker：

```sh
npm run db:migrate:remote
npm run setup:admin -- --remote
npm test
npm run build:api
npm run deploy:api
npm run build
# 提交并推送 master，GitHub Actions 自动发布 Pages
```

`setup:admin -- --remote` 上传密码摘要到 Worker Secret，不会把明文密码发到终端或源码中。GitHub Actions 只构建并发布前端，不持有数据库或管理密码。

若忘记修改后的密码，可通过有 Cloudflare 权限的本机运维恢复：先导出 D1 备份，更新 `ADMIN_PASSWORD_HASH`，删除 `admin_auth` 中的密码覆盖记录并撤销 `admin_sessions`。仅改 Worker Secret 不会覆盖已修改的数据库密码。
