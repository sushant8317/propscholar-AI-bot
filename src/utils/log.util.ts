// src/utils/log.util.ts
export function info(tag: string, ...args: any[]) {
  console.log(`[INFO] ${new Date().toISOString()} [${tag}]`, ...args);
}

export function warn(tag: string, ...args: any[]) {
  console.warn(`[WARN] ${new Date().toISOString()} [${tag}]`, ...args);
}

export function error(tag: string, ...args: any[]) {
  console.error(`[ERROR] ${new Date().toISOString()} [${tag}]`, ...args);
}

/**
 * Use this to wrap top-level async functions:
 * safeLog(async () => { ... })
 */
export async function safeLog<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (err) {
    console.error("[CRASH]", new Date().toISOString(), err);
    throw err;
  }
}
