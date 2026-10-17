# 初着 · First Move

为国际象棋新手准备的中文网页游戏。无需注册，课程、练习、对弈和棋力分析均在浏览器中运行。

## 本地运行

需要 Node.js 24 或更新版本及 npm。

在 Mac 上，可直接双击项目文件夹中的 `启动初着.command`，它会打开浏览器。保持终端窗口开启即可游玩，关闭窗口则停止服务。当前工作区已经安装好依赖。

也可以在终端运行：

```sh
npm ci
npm run prepare:assets
npm run dev
```

打开终端显示的地址（通常为 http://127.0.0.1:5173）。第一次安装需要联网；游玩期间不调用外部棋力服务。12 个棋子 SVG 和 60 道题已包含在源码内，正常运行无需重新下载题库。

## 构建与部署

```sh
npm test
npm run build
npm run preview
```

### Cloudflare Workers（已创建 Workers 项目时）

仓库自带 `wrangler.jsonc`，将 `dist/` 作为纯静态资源部署；不需要 Cloudflare Vite 插件或服务端入口。Worker 名称为 `chess`，与当前 Cloudflare 项目保持一致。页面采用 hash 路由，未找到的资源正常返回 404。

在 Cloudflare 项目 **Settings → Build** 的 Git 构建设置中填写：

| 项目 | 值 |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | 仓库根目录（留空或 `/`） |
| Node.js | 24 或更新版本；可设置 `NODE_VERSION=24.17.0` |

必须先构建再部署。Workers Builds 的构建命令与部署命令分开配置；不要只填 `npx wrangler deploy` 并期待它替 Vite 构建网页。Wrangler 已固定版本，避免每次部署临时安装不同版本或触发自动迁移。

本地只验证、不上传：`npm run deploy:check`。实际部署：`npm run deploy`（需要自己的 Cloudflare 登录和权限）。若构建设置中有预览命令，保留 Cloudflare 默认值。

### Cloudflare Pages（另行创建 Pages 项目时）

连接同一 GitHub 仓库，构建命令填 `npm run build`，输出目录填 `dist`，生产分支选 `main`，Node.js 使用 24 或更新版本。Pages 不需要填写 `wrangler deploy` 部署命令。

将 `dist/` 整个目录上传至静态网站托管服务。支持子路径部署，保留 engine/、pieces/、licenses/ 及 source.zip。服务器应把 `.wasm` 作为 `application/wasm`、`.js` 作为 JavaScript 提供。使用单线程 Stockfish，无需 COOP/COEP 响应头。不能通过双击 index.html 的 file:// 地址运行。

构建使用纯 JavaScript 生成本版本源码下载包，不依赖系统 `zip` 命令，页面“关于与开源”提供下载入口。公开发布时应保留该入口、许可声明和对应的引擎源码链接。

## 功能

- 12 节短课，含动态路线示范、可随时操作的同屏练习与即时反馈；特殊规则包括四种升变、吃过路兵及双侧易位。
- 六类各 10 道 Lichess CC0 战术题，按参考难度排列，逐层提示、错误重试、关键变化回放与错题复习。
- 三档电脑对手、选边、悔棋、主动提示、可关闭的明显失误提醒与 PGN 导出。入门档使用低技能、浅搜索，强弱不对应真实等级分，也不保证模仿人类初学者。
- 版本化本地进度、对局恢复、JSON 导入导出；导入须确认替换。错题保留在复习列表，重做答对不自动删除。

战术练习接受参考路线及任何立即将死的走法。其他走法会按同一局面、同一评分视角分别限定参考走法和用户走法进行引擎核验：两次分析均达到深度 16，且用户走法评价不低于参考走法 50 厘兵，或同样能强制将死时，接受并采用实际分支。后续提示、对手应手和回放随分支更新；分析不足、后续变化不完整或引擎失败时不记错题，可重试。合法但明显损失战术收益的走法仍不算解题成功。

局面评价从玩家视角比较。两次分析都至少达到深度 10，且评价下降至少 200 厘兵，或新增明确被迫将死变化时，暂停并提示重试。另外直接遍历合法走法验证对手的一步将死威胁，不依赖引擎深度。其他分析浅时不判定失误；电脑思考、主动求助和失误分析使用同一任务管理器，离开页面、重开、悔棋时取消旧任务。提示说明局面中可验证的移动、吃子及将军，不生成自由问答解释。

学习局面允许子力不足的演示继续练习。完整实战则使用 chess.js 的结束判定，包括三次重复和五十回合规则的自动和棋处理，适合休闲学习，不模拟正式比赛中的申诉流程。

## 进度与隐私

进度保存在当前浏览器的 localStorage，键名为 `first-move.progress.v1`。清除浏览器数据会丢失进度。请通过“进度与设置”导出备份；在另一设备导入即可手动迁移。无账号、无遥测、无远程 AI 请求。首次访问必须联网加载网页；首版不提供离线安装保证。

AI 问答、自动云同步、真人联网对战均不包含在首版。

## 内容维护

- `src/content/lessons.ts`：课程说明、示范步骤与练习。
- `src/content/puzzles-source.json`：选取的原始 CC0 题目。
- `src/content/puzzles.json`：带中文提示及验证过的变化的题目。
- `node scripts/build-content.mjs`：从原始题目生成内容并验证合法走法。
- `python3 scripts/select-puzzles.py`：可选，联网流式筛选官方题库，需要 curl、Python 3、zstd。常规构建不用执行。

## 验证

```sh
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
```

自动化浏览器用例涵盖桌面 Chromium、WebKit 与模拟 Android/iPhone 的触屏视口。模拟浏览器不等于真实手机测试；上线前仍建议用自己的 Android Chrome、iPhone Safari 做实机验收。

## 许可与致谢

项目 GPL-3.0-only。感谢 Chessground、chess.js、Stockfish.js、Lichess 题库、Colin M. L. Burnett 棋子和 Lucide 图标。各组件和素材许可见 `public/THIRD_PARTY_NOTICES.txt`，完整许可文本见 `public/licenses/`。Stockfish 对应源码和构建说明见 `public/engine/SOURCE.txt`。
