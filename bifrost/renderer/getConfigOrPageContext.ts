import { PageContextNoProxy } from "../types/internal.js";

type ConfigOrContext = PageContextNoProxy | PageContextNoProxy["config"];

/**
 * Get page configs that are definable in config and in runtime via onBeforeRoute. documentProps, for example.
 */
export function getPageContextOrConfig<T extends keyof ConfigOrContext>(
  pageContext: PageContextNoProxy,
  prop: T
): ConfigOrContext[T] {
  return pageContext[prop] || pageContext.config[prop];
}
