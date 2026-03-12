type InstrumentedFunctions = "_vikeAfterRender" | "_vikeBeforeRender" | "_waitForHeadScripts" | "_waitForReload" | "wrappedOnBeforeRenderClient" | "wrappedOnAfterRenderClient" | "bifrostOnBeforeRenderClient" | "bifrostOnAfterRenderClient" | "recordExistingHeadScripts" | "_waitForDOMContentLoaded";

interface DiagnosticEventDetail {
  /** Whether the instrumented function is starting or has finished. */
  type: "start" | "end";
  /** Which instrumented function fired the event. */
  fnName: InstrumentedFunctions;
}

type DiagnosticEventName = `bifrost:diagnostic:${InstrumentedFunctions | "*"}`;

declare global {
  type CustomEventMap = {
    [K in DiagnosticEventName]: CustomEvent<DiagnosticEventDetail>;
  };

  interface WindowEventMap extends CustomEventMap {}
}

function dispatchDiagnosticEvent(detail: DiagnosticEventDetail): void {
  const wildCardEvent : DiagnosticEventName = "bifrost:diagnostic:*"
  const specificEvent : DiagnosticEventName = `bifrost:diagnostic:${detail.fnName}`;
  window.dispatchEvent(new CustomEvent(specificEvent, { detail }));
  window.dispatchEvent(new CustomEvent(wildCardEvent, { detail }));
}

/**
 * Wraps `fn` so that it dispatches typed `CustomEvent`s on `window`
 * around each invocation. Works with both sync and async functions —
 * for promises, "end" fires in `.finally()`.
 *
 * Each call dispatches two events:
 *   - `bifrost:diagnostic:<fnName>` — scoped to the function
 *   - `bifrost:diagnostic:*`        — wildcard, fires for all instrumented functions
 *
 * @example
 * // Listen for a specific function
 * window.addEventListener("bifrost:diagnostic:_vikeBeforeRender", (e) => {
 *   console.log(e.detail.type, e.detail.fnName);
 * });
 *
 * // Listen for all instrumented functions
 * window.addEventListener("bifrost:diagnostic:*", (e) => {
 *   console.log(e.detail.type, e.detail.fnName);
 * });
 */
export function instrument<N extends InstrumentedFunctions, T extends (...args: any[]) => any>(
  fnName: N,
  fn: T
): T {
  return function (this: unknown, ...args: Parameters<T>): ReturnType<T> {
    dispatchDiagnosticEvent({ type: "start", fnName });
    try {
      const result = fn.apply(this, args);
      if (result instanceof Promise) {
        return result.finally(() => {
          dispatchDiagnosticEvent({ type: "end", fnName });
        }) as ReturnType<T>;
      }
      dispatchDiagnosticEvent({ type: "end", fnName });
      return result as ReturnType<T>;
    } catch (err) {
      dispatchDiagnosticEvent({ type: "end", fnName });
      throw err;
    }
  } as T;
}
