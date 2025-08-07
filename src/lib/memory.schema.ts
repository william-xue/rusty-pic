/**
 * 轻量本地版 Memory Bank - 类型与校验
 * 存放 MemoryItem/RecallQuery 等类型与工具函数
 */

export type MemoryScope = 'session' | 'global';

export interface MemoryItem {
  id: string; // 唯一ID（文件名去扩展名）
  scope: MemoryScope; // 作用域
  sessionId?: string; // 会话ID（session 作用域时可选但推荐）
  project?: string; // 可选项目名
  tags?: string[]; // 关键词标签
  title?: string; // 可读标题
  content: string; // 记忆正文（可为提炼摘要）
  createdAt: string; // ISO 时间
  updatedAt: string; // ISO 时间
  meta?: Record<string, unknown>; // 额外元数据（避免存放敏感密钥）
}

export interface RecallFilter {
  scope?: MemoryScope | MemoryScope[];
  sessionId?: string;
  project?: string;
  tagsAny?: string[]; // 命中任意一个标签即可
  tagsAll?: string[]; // 必须全部命中
  limit?: number; // 上限条数
}

export interface RecallQuery {
  query: string; // 用户问题/当前任务的检索文本
  filter?: RecallFilter;
}

export interface RecallResult {
  item: MemoryItem;
  score: number; // 简易相关性评分，越高越相关
}

export function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function normalizeScope(scope?: string): MemoryScope {
  return scope === 'global' ? 'global' : 'session';
}

export function ensureMemoryItem(partial: Partial<MemoryItem> & Pick<MemoryItem, 'content'>): MemoryItem {
  const id = partial.id ?? cryptoRandomId();
  const createdAt = partial.createdAt ?? nowISO();
  const updatedAt = partial.updatedAt ?? createdAt;
  const scope = normalizeScope(partial.scope);
  return {
    id,
    scope,
    sessionId: partial.sessionId,
    project: partial.project,
    tags: partial.tags ?? [],
    title: partial.title ?? '',
    content: partial.content,
    createdAt,
    updatedAt,
    meta: partial.meta ?? {},
  };
}

export function cryptoRandomId(): string {
  // 浏览器/Node 通用生成短ID（不要求强加密，仅去重）
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // 兜底
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

// 简易文本相似度：基于词汇重叠的 Jaccard
export function jaccardSimilarity(a: string, b: string): number {
  const ta = toTokens(a);
  const tb = toTokens(b);
  const sa = new Set(ta);
  const sb = new Set(tb);
  let inter = 0;
  for (const t of sa) {
    if (sb.has(t)) inter++;
  }
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function toTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function matchTags(item: MemoryItem, any?: string[], all?: string[]): boolean {
  const tags = new Set((item.tags ?? []).map((t) => t.toLowerCase()));
  if (all && all.length > 0) {
    for (const t of all) {
      if (!tags.has(t.toLowerCase())) return false;
    }
  }
  if (any && any.length > 0) {
    let ok = false;
    for (const t of any) {
      if (tags.has(t.toLowerCase())) {
        ok = true;
        break;
      }
    }
    if (!ok) return false;
  }
  return true;
}