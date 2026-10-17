export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const builtin = new Function("name", "return process.getBuiltinModule(name)") as (
    name: string,
  ) => { AsyncLocalStorage: typeof import("node:async_hooks").AsyncLocalStorage; Server: typeof import("node:http").Server };
  const { AsyncLocalStorage } = builtin("node:async_hooks");
  const { Server } = builtin("node:http");

  type LogMethod = "log" | "info" | "warn" | "error";
  const storage = new AsyncLocalStorage<string[]>();
  const globalForLogs = globalThis as typeof globalThis & {
    apiLogOriginal?: Partial<Record<LogMethod, (...args: unknown[]) => void>>;
    apiResponseJson?: typeof Response.json;
    apiServerEmit?: (...args: unknown[]) => boolean;
  };

  function formatArg(value: unknown): string {
    if (value instanceof Error) return value.stack ?? value.message;
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  const original = (globalForLogs.apiLogOriginal ??= {});
  for (const method of ["log", "info", "warn", "error"] as const) {
    original[method] ??= console[method].bind(console);
    const write = original[method];
    console[method] = (...args: unknown[]) => {
      write(...args);
      storage.getStore()?.push(args.map(formatArg).join(" "));
    };
  }

  globalForLogs.apiResponseJson ??= Response.json;
  const responseJson = globalForLogs.apiResponseJson;
  Response.json = (data, init) => {
    const logs = storage.getStore();
    if (logs && data && typeof data === "object" && !Array.isArray(data)) {
      data = { ...data, logs: [...logs] };
    }
    return responseJson.call(Response, data, init);
  };

  globalForLogs.apiServerEmit ??= Server.prototype.emit as (...args: unknown[]) => boolean;
  const emit = globalForLogs.apiServerEmit;
  Server.prototype.emit = function (this: unknown, event: string, ...args: unknown[]) {
    const request = args[0] as { url?: string } | undefined;
    if (event === "request" && request?.url?.startsWith("/api")) {
      return storage.run([], () => emit.call(this, event, ...args));
    }
    return emit.call(this, event, ...args);
  } as typeof Server.prototype.emit;
}
