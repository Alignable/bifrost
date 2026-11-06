import "../lib/type";
import type { Config, PageContextServer } from "vike/types";

type OnHookCall = Extract<Config["onHookCall"], Function>;

// Bifrost's server renders through Vike's page handler, which returns a Response but not its pageContext
const onHookCall: OnHookCall = (hook, pageContext) => {
  const wrap = (pageContext as PageContextServer | null)?._bifrostWrap;
  if (wrap) wrap.pageContext = pageContext as PageContextServer;
  // Not returned: Vike awaits the hook itself, and would log a rejection returned here, such as an intentional throw render()
  hook.call();
};

export default onHookCall;
