# AoE4 Scout

AoE4 Scout 是一个《帝国时代 IV》对局侦察工具，用来快速查看目标玩家最近一局的双方阵容、友军标记和早期战术趋势。

## 功能

- 通过 aoe4world 搜索玩家。
- 选择目标玩家后，自动拉取其最近一局对局。
- 根据目标玩家和本地友军标记区分友军 / 敌军阵营。
- 显示双方玩家的单排/组排最高分。
- 根据玩家最近同文明已完成对局，绘制前 15 分钟军事价值曲线。
- 显示升时代时间点，辅助判断开局节奏。
- 分析对手是否车队、分析对手与你的历史对局的胜负比。

## 环境要求

- Node.js 和 npm

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
