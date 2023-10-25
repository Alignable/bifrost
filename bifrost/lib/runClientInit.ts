import { ConfigEntries } from "vike/types";
import { OnClientInit } from "../types/internal";

export async function runClientInit(configEntries: ConfigEntries) {
  const onClientInitConfig = configEntries["onClientInit"]?.[0];
  if (
    onClientInitConfig &&
    !onClientInitConfig?.configDefinedByFile?.startsWith("/renderer/")
  ) {
    throw new Error(
      `${onClientInitConfig.configDefinedAt} must be defined globally in /renderer and there cannot be multiple`
    );
  }
  await (onClientInitConfig?.configValue as OnClientInit)?.();
}
