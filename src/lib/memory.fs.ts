/**
 * 轻量本地版 Memory Bank - 文件系统读写与检索
 * Node/浏览器同构：在浏览器环境用 localStorage 兜底（仅示例，不建议生产）
 */

import {
  MemoryItem,
  RecallQuery,
  RecallResult,
  ensureMemoryItem,
  isNonEmptyString,
  jaccardSimilarity,
  matchTags,
  nowISO,
} from './memory.schema';

const MEMORY_ROOT = '.kiro/memory';
const SESSION_DIR = `${MEMORY_ROOT}/sessions`;
const GLOBAL_DIR = `${MEMORY_ROOT}/global`;

type Env = 'node' | 'browser';

function getEnv(): Env {
  return typeof window === 'undefined' ? 'node' : 'browser';
}

// Node 环境使用 fs
let fs: typeof import('fs') | undefined;
let path: typeof import('path') | undefined;
if (getEnv() === 'node') {
  fs = require('fs');
  path = require('path');
  // 确保目录存在
  ensureDirSync(MEMORY_ROOT);
  ensureDirSync(SESSION_DIR);
  ensureDirSync(GLOBAL_DIR);
}

// 浏览器兜底的 KV（仅示例用途）
const LS_KEY = 'kiro_memory_bank_items';

function ensureDirSync(dir: string) {
  if (!fs) return;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeJSONFileSync(filePath: string, data: unknown) {
  if (!fs) return;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function readJSONFileSync<T>(filePath: string): T | undefined {
  if (!fs) return undefined;
  if (!fs.existsSync(filePath)) return undefined;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function listJSONFiles(dir: string): string[] {
  if (!fs) return [];
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => (path ? path.join(dir, f) : `${dir}/${f}`));
}

function toFilePath(item: MemoryItem): string {
  const baseDir = item.scope === 'global' ? GLOBAL_DIR : SESSION_DIR;
  if (item.scope === 'session') {
    const sid = item.sessionId ?? 'default';
    const dir = path ? path.join(baseDir, sid) : `${baseDir}/${sid}`;
    ensureDirSync(dir);
    return path ? path.join(dir, `${item.id}.json`) : `${dir}/${item.id}.json`;
  }
  return path ? path.join(baseDir, `${item.id}.json`) : `${baseDir}/${item.id}.json`;
}

// 浏览器存储读写
function readAllFromLocalStorage(): MemoryItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr as MemoryItem[];
    return [];
  } catch {
    return [];
  }
}

function writeAllToLocalStorage(items: MemoryItem[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch {
    // 忽略
  }
}

export function writeMemoryItem(partial: Partial<MemoryItem> & Pick<MemoryItem, 'content'>): MemoryItem {
  const item = ensureMemoryItem(partial);
  item.updatedAt = nowISO();

  if (getEnv() === 'node' && fs) {
    const file = toFilePath(item);
    writeJSONFileSync(file, item);
    return item;
  }

  // 浏览器兜底：全量列表写回
  const all = readAllFromLocalStorage();
  const idx = all.findIndex((x) => x.id === item.id);
  if (idx >= 0) {
    all[idx] = item;
  } else {
    all.push(item);
  }
  writeAllToLocalStorage(all);
  return item;
}

export function readAllMemory(): MemoryItem[] {
  if (getEnv() === 'node' && fs) {
    const files: string[] = [
      ...listJSONFiles(GLOBAL_DIR),
      ...listSessionFilesRecursively(),
    ];
    const items: MemoryItem[] = [];
    for (const fpath of files) {
      const obj = readJSONFileSync<MemoryItem>(fpath);
      if (obj && isValidItem(obj)) items.push(obj);
    }
    return items;
  }
  return readAllFromLocalStorage();
}

function listSessionFilesRecursively(): string[] {
  if (!fs || !path) return [];
  if (!fs.existsSync(SESSION_DIR)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(SESSION_DIR, { withFileTypes: true })) {
    const full = path.join(SESSION_DIR, entry.name);
    if (entry.isDirectory()) {
      for (const f of listJSONFiles(full)) out.push(f);
    }
  }
  return out;
}

function isValidItem(obj: any): obj is MemoryItem {
  return obj && isNonEmptyString(obj.id) && isNonEmptyString(obj.content);
}

export function simpleSearch(query: RecallQuery): RecallResult[] {
  const { query: q, filter } = query;
  const all = readAllMemory();

  // 过滤
  const candidate = all.filter((item) => {
    if (filter?.scope) {
      const scopes = Array.isArray(filter.scope) ? filter.scope : [filter.scope];
      if (!scopes.includes(item.scope)) return false;
    }
    if (filter?.sessionId && item.sessionId !== filter.sessionId) return false;
    if (filter?.project && item.project !== filter.project) return false;
    if (!matchTags(item, filter?.tagsAny, filter?.tagsAll)) return false;
    return true;
  });

  // 打分
  const scored: RecallResult[] = candidate.map((item) => {
    // 基于标题+正文做简易相似度
    const baseText = `${item.title ?? ''}\n${item.content}`;
    const score = jaccardSimilarity(q, baseText);
    return { item, score };
  });

  // 排序，截断
  scored.sort((a, b) => b.score - a.score);
  const limit = filter?.limit ?? 10;
  return scored.slice(0, limit);
}

export function upsertGlobalNote(content: string, tags?: string[], title?: string, project?: string): MemoryItem {
  return writeMemoryItem({
    scope: 'global',
    content,
    tags,
    title,
    project,
  });
}

export function upsertSessionNote(sessionId: string, content: string, tags?: string[], title?: string, project?: string): MemoryItem {
  return writeMemoryItem({
    scope: 'session',
    sessionId,
    content,
    tags,
    title,
    project,
  });
}