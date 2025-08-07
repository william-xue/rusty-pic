// Memory Bank 最小调用示例（非侵入式，不改变现有逻辑）
import { initMemoryAgent } from './lib/memory.agent';

// 仅在浏览器运行时初始化（避免构建时的 Node 环境误用）
if (typeof window !== 'undefined') {
  // 你可以将 sessionId 绑定到路由/会话ID，这里示例固定为 'app'
  const memory = initMemoryAgent({
    project: 'rusty-pic',
    defaultSessionId: 'app',
    maxInject: 5,
  });

  // 写入一条全局偏好（只会写入一次也没关系，后续可以去重优化）
  memory.remember({
    scope: 'global',
    title: '用户偏好',
    tags: ['preference', 'lang'],
    content: '用户偏好：回答使用简体中文，输出尽量简洁。',
  });

  // 写入一条会话记忆
  memory.remember({
    scope: 'session',
    sessionId: 'app',
    title: '运行环境',
    tags: ['runtime'],
    content: '项目 rusty-pic 正在浏览器中初始化，默认端口 5173。',
  });

  // 在需要拼接 Prompt 或上下文时调用 recall
  const recalled = memory.recall({
    query: '语言偏好与运行环境',
    filter: { scope: ['global', 'session'], sessionId: 'app', tagsAny: ['lang', 'runtime'], limit: 3 },
  });

  // 你可以将 recalled 注入到你的系统提示或 UI 中
  // 这里仅打印以示例（生产可移除）
  // eslint-disable-next-line no-console
  console.debug('[MemoryBank recalled]', recalled);
}
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from 'sonner';
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <Toaster />
  </StrictMode>
);
