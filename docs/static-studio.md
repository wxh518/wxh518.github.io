# 静态博客工作台

当前入口：<https://wxh518.github.io/#/admin>。主页与博客仍读取随 GitHub Pages 发布的本地内容；工作台直接通过 GitHub API 提交文章和图片，不需要连接 Cloudflare Worker。

## 首次连接发布权限

1. 在工作台进入「发布与备份」，点击 GitHub 官方令牌页面链接。
2. Resource owner 选择 `wxh518`；Repository access 选择 **Only select repositories**，只选择 `wxh518.github.io`。
3. Repository permissions 中只需要 **Contents: Read and write**。选择合适的有效期后生成 fine-grained personal access token。
4. 将令牌填到工作台的密码框，点击「连接 GitHub」。无需把令牌发送给任何人，不要写入源码或 JSON。

令牌仅在当前标签页的 `sessionStorage` 中暂存，刷新页面仍可使用，关闭标签页、主动断开连接或令牌过期后需要重新连接。不申请额外的 Actions、管理员或其他仓库权限。仓库的分支保护若禁止直接提交，需要另行调整发布方式。

## 写作与图片

1. 「博客写作」→「写文章」，填写标题、摘要、日期和标签。文章地址自动生成，也可改成小写英文、数字和连字符，发布后保持稳定。
2. 正文支持 Markdown，提供写作 / 对照 / 预览模式。工具栏可插入加粗、标题、代码块。
3. 「插入图片」选择本机图片，或把剪贴板中的截图直接粘贴到正文；压缩为最长边 1600px、最多 512KB 的 WebP，正文会自动插入简短的站内图片路径。右侧立即显示图片。
4. 新文章默认为「草稿 · 仅此浏览器」，草稿自动保存在 IndexedDB，可手动点击「保存草稿」。图片随草稿一起保存，刷新后仍可编辑。
5. 准备公开时，把文章状态改为「公开 · 随网站发布」，点击「发布网站」。其他仍为草稿的文章及其专用图片不会上传到公开仓库。
6. 工作台显示提交与部署进度。GitHub Actions 构建成功后，公开主页和博客自动更新，图片从本站加载。

「预览主页」用于检查个人资料和模块布局；文章在正文右侧实时预览。已公开文章改回草稿或删除后，下次发布会从当前网站移除，但过去的公开版本仍存在于 Git 历史中。

## 草稿、备份与多设备

- 草稿仅在当前浏览器、当前站点来源保存，不会自动同步设备。`localhost` 和线上域名的草稿彼此独立；可以导出备份再导入。
- 导出完整备份包含所有文章、未公开草稿和暂存图片，不包含 GitHub 令牌。更换设备或清理浏览器前先导出；导入不会立即公开。
- 「从线上重新载入」读取仓库最新内容，替换当前公开内容；保留与线上文章地址不同的本机新草稿。操作前请导出未发布修改。
- 发布会检查开始写作时的内容版本。其他设备更新过内容时，会拒绝覆盖；先导出备份、载入最新版本，再合并自己的修改。
- 原 Cloudflare 工作台及 D1 数据仍保留，切换 HTTP 模式后可继续使用；当前默认工作台不读取其草稿。旧工作台导出的备份可在新工作台导入，Worker 图片链接需重新选择本机图片后发布。

## 实现边界

`github-content.ts` 只向固定的 GitHub API 仓库地址发送授权头。先生成公开内容和图片文件，再基于最新 Git tree 创建一次提交，最后非强制推进 `master`，触发现有 Pages 工作流。只写 `content/homepage.json`、`content/posts.json` 与 `public/images/uploads/`，不会从编辑内容生成任意写入路径。公开文章与图片在同一次提交中更新；分支并发变化时拒绝覆盖，不强制推送。

草稿图片独立存储在 IndexedDB，Markdown 中使用短路径；发布前按文件内容生成 SHA-256 图片名。仅提取公开文档实际引用的图片，草稿正文、草稿专用图片和授权令牌不会加入提交。公开页面仍通过已有 `ContentService` 本地适配器读取内容，运行时不请求管理服务。

参考：[GitHub 细粒度令牌](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)、[Git trees API](https://docs.github.com/en/rest/git/trees)、[Git refs API](https://docs.github.com/en/rest/git/refs)。
