import { type Config } from "vike/types";

export default {
  // Disable onRenderClient timeout since we wait for head scripts to load in onAfterRenderClient
  // onWrappedReactRenderTimeout will fire when vike-react's onRenderClient times out.
  // Ideally, we could only disable timeout for onAfterRenderClient 
  // https://github.com/vikejs/vike/issues/3147
  onRenderClient: false,
} satisfies Config["hooksTimeout"];
