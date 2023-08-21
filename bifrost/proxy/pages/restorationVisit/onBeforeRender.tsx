import { PageContextProxyServer } from "../../../types/internal.js";

// In restoration visit, this happens on client.
// Do nothing. onBeforeRoute handles it all for us.
export default async function onBeforeRender() {}
