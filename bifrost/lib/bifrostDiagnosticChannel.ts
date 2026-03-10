interface DiagnosticEvent {
  type: "start" | "end";
  fnName: InstrumentedFunctions;
}

type InstrumentedFunctions = "_vikeAfterRender" | "_vikeBeforeRender" | "_waitForHeadScripts";

type DiagnosticListener = (event: DiagnosticEvent) => void;

class DiagnosticChannel {
  private listeners = new Map<InstrumentedFunctions | "*", Set<DiagnosticListener>>();

  on(fnName: InstrumentedFunctions | "*", listener: DiagnosticListener): () => void {
    if (!this.listeners.has(fnName)) {
      this.listeners.set(fnName, new Set());
    }
    this.listeners.get(fnName)!.add(listener);
    return () => this.off(fnName, listener);
  }

  off(fnName: InstrumentedFunctions | "*", listener: DiagnosticListener): void {
    this.listeners.get(fnName)?.delete(listener);
  }

  emit(event: DiagnosticEvent): void {
    this.listeners.get(event.fnName)?.forEach(listener => {
      try { listener(event); } catch { }
    });
    this.listeners.get("*")?.forEach(listener => {
      try { listener(event); } catch { }
    });
  }
}

export const diagChannel = new DiagnosticChannel();

export function wrap<N extends InstrumentedFunctions, T extends (...args: any[]) => any>(
  fnName: N,
  fn: T
): T {
  return function (this: unknown, ...args: Parameters<T>): ReturnType<T> {
    diagChannel.emit({ type: "start", fnName });
    try {
      const result = fn.apply(this, args);
      if (result instanceof Promise) {
        return result.finally(() => {
          diagChannel.emit({ type: "end", fnName });
        }) as ReturnType<T>;
      }
      diagChannel.emit({ type: "end", fnName });
      return result as ReturnType<T>;
    } catch (err) {
      diagChannel.emit({ type: "end", fnName });
      throw err;
    }
  } as T;
}
