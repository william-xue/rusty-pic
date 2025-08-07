// 基础测试：写入一条记忆并召回验证
// 说明：该测试使用 Node 环境下的文件系统 .kiro/memory，运行前建议确保测试对你的实际数据无影响。
// 可使用 `pnpm test` 或 `npm test` 运行（依赖你的项目测试命令配置）。
import { describe, it, expect, beforeAll } from 'vitest';
import { initMemoryAgent } from '../lib/memory.agent';
import { readAllMemory } from '../lib/memory.fs';

describe('Memory Bank basic', () => {
  const sessionId = 'test-session';
  const agent = initMemoryAgent({
    project: 'rusty-pic',
    defaultSessionId: sessionId,
    maxInject: 5,
  });

  beforeAll(() => {
    // 先写入两条记忆（global + session）
    agent.remember({
      scope: 'global',
      title: '全局偏好',
      tags: ['preference', 'lang'],
      content: '用户偏好：简体中文输出；风格精炼。',
    });

    agent.remember({
      scope: 'session',
      sessionId,
      title: '测试上下文',
      tags: ['runtime', 'test'],
      content: '当前为单元测试上下文，session=test-session。',
    });
  });

  it('should write and recall memory items', () => {
    const recalled = agent.recall({
      query: '中文输出与测试上下文',
      filter: { scope: ['global', 'session'], sessionId, tagsAny: ['lang', 'test'], limit: 5 },
    });

    expect(recalled.length).toBeGreaterThan(0);
    const titles = recalled.map((r) => r.item.title);
    expect(titles.join(' ')).toMatch(/全局偏好|测试上下文/);
  });

  it('should list all memory items from storage', () => {
    const all = readAllMemory();
    // 至少包含我们刚写入的两条
    expect(all.length).toBeGreaterThanOrEqual(2);
  });
});