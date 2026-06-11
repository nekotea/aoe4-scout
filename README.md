# AoE4 Scout

AoE4 Scout 是一个《帝国时代 IV》对局侦察工具，用来快速查看目标玩家最近一局的双方阵容、友军标记和早期战术趋势。

项目使用 **Vue 3 + Vuetify + Vite + Tauri 2** 构建，可以作为浏览器开发应用运行，也可以打包成 Windows 桌面应用。

## 功能

- 通过 aoe4world 搜索玩家。
- 选择目标玩家后，自动拉取其最近一局对局。
- 根据目标玩家和本地友军标记区分友军 / 敌军阵营。
- 收藏常见队友，友军列表保存在本地。
- 开启追踪后，定时刷新目标玩家的最近对局。
- 根据玩家最近同文明已完成对局，绘制前 15 分钟军事价值曲线。
- 显示升时代时间点，辅助判断开局节奏。

## 环境要求

- Node.js 和 npm
- Rust 工具链
- Tauri 2 所需的系统依赖

Windows 桌面打包还需要 WebView2 Runtime，以及可用的 Visual Studio C++ 构建环境。

## 安装依赖

```powershell
npm install
```

## 开发运行

启动浏览器开发服务：

```powershell
npm run dev
```

启动 Tauri 桌面开发模式：

```powershell
npm run tauri:dev
```

浏览器开发模式下，`vite.config.ts` 配置了 `/aoe4world` 本地代理，用来访问没有开放 CORS 的 aoe4world summary 页面。桌面应用中则通过 `@tauri-apps/plugin-http` 发起请求，绕过 WebView 的 CORS 限制。

## 构建

构建前端静态资源：

```powershell
npm run build
```

构建桌面应用安装包：

```powershell
npm run tauri:build
```

当前 Tauri 打包目标是 NSIS，配置位于 `src-tauri/tauri.conf.json`。

## 目录结构

```text
.
├── public/                 静态资源和文明旗帜
├── src/                    Vue 前端源码
│   ├── api/                aoe4world API 封装
│   ├── components/         侦察页、友军页、玩家卡片和战术图表
│   ├── stores/             侦察、友军、战术分析的共享状态
│   ├── types/              aoe4world 响应类型
│   └── utils/              文明、国家和段位辅助函数
├── src-tauri/              Tauri 桌面壳和 Rust 工程
├── index.html              Vite 入口 HTML
├── package.json            npm 脚本和依赖
├── tsconfig.json           TypeScript 配置
└── vite.config.ts          Vite 配置和本地代理
```

## 数据来源

应用读取 aoe4world 的公开数据：

- 玩家搜索：`https://aoe4world.com/api/v0/players/search`
- 玩家最近一局：`https://aoe4world.com/api/v0/players/{profileId}/games/last`
- 玩家最近对局列表：`https://aoe4world.com/api/v0/players/{profileId}/games`
- 对局详情：`https://aoe4world.com/players/{profileId}/games/{gameId}/summary`

## 本地数据

友军列表保存在浏览器 / Tauri 的 localStorage 中：

```text
aoe4scout.allies
```

项目不需要后端数据库。

## Git 忽略策略

仓库只追踪源码、配置、锁文件和应用资源。以下内容不会提交：

- `node_modules/`
- `dist/`
- `release/`
- `targets/`
- `src-tauri/target/`
- `*.tsbuildinfo`
- 本地环境变量文件
- 本地助手或编辑器状态文件

