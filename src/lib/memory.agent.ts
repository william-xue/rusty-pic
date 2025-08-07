/**
 * 轻量本地版 Memory Bank - Agent 对外 API
 * 暴露 remember/recall/init，便于在应用入口集成
 */

import {
  MemoryItem,
  RecallQuery,
  RecallResult,
  MemoryScope,
  ensureMemoryItem,
} from './memory.schema';
import {
  simpleSearch,
  upsertGlobalNote,
  upsertSessionNote,
  readAllMemory,
  writeMemoryItem,
} from './memory.fs';

export interface MemoryAgentOptions {
  project?: string;
  defaultScope?: MemoryScope; // 默认 'session'
  defaultSessionId?: string;  // 当 scope=session 且未传入时使用
  maxInject?: number;         // recall 注入上限（默认 5）
}

export class MemoryAgent {
  private project?: string;
  private defaultScope: MemoryScope;
  private defaultSessionId?: string;
  private maxInject: number;

  constructor(opts?: MemoryAgentOptions) {
    this.project = opts?.project;
    this.defaultScope = opts?.defaultScope ?? 'session';
    this.defaultSessionId = opts?.defaultSessionId;
    this.maxInject = Math.max(1, opts?.maxInject ?? 5);
  }

  remember(input: {
    content: string;
    scope?: MemoryScope;
    sessionId?: string;
    tags?: string[];
    title?: string;
  }): MemoryItem {
    const scope = input.scope ?? this.defaultScope;
    const sessionId = scope === 'session' ? (input.sessionId ?? this.defaultSessionId ?? 'default') : undefined;

    if (scope === 'global') {
      return upsertGlobalNote(input.content, input.tags, input.title, this.project);
    } else {
      return upsertSessionNote(sessionId!, input.content, input.tags, input.title, this.project);
    }
  }

  recall(query: Omit<RecallQuery, 'filter'> & {
    filter?: RecallQuery['filter'];
  }): RecallResult[] {
    // 补齐默认过滤（例如项目字段）
    const baseFilter = {
      ...query.filter,
      project: query.filter?.project ?? this.project,
      limit: Math.min(this.maxInject, query.filter?.limit ?? this.maxInject),
    };
    return simpleSearch({
      query: query.query,
      filter: baseFilter,
    });
  }

  getAll(): MemoryItem[] {
    return readAllMemory();
  }

  // 低层直接 upsert
  upsertRaw(partial: Partial<MemoryItem> & Pick<MemoryItem, 'content'>): MemoryItem {
    const withProject = { ...partial, project: partial.project ?? this.project };
    return writeMemoryItem(withProject);
  }
}

export function initMemoryAgent(opts?: MemoryAgentOptions): MemoryAgent {
  return new MemoryAgent(opts);
}

// 最小使用示例：在应用内需要时调用
export function exampleUsage() {
  const agent = initMemoryAgent({ project: 'rusty-pic', defaultSessionId: 'dev' });

  agent.remember({
    scope: 'global',
    title: '用户偏好',
    tags: ['preference', 'lang'],
    content: '用户偏好：回答使用简体中文，输出尽量简洁。',
  });

  agent.remember({
    scope: 'session',
    sessionId: 'dev',
    title: '构建信息',
    tags: ['build', 'env'],
    content: '本地调试端口 5173；使用 pnpm 作为包管理器。',
  });

  const top = agent.recall({
    query: '语言偏好与本地调试端口是什么？',
    filter: { scope: ['global', 'session'], sessionId: 'dev', limit: 5, tagsAny: ['lang', 'build'] },
  });

  return top;
}