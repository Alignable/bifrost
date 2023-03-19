vps v1 doesnt support multiple overriding configs
also doesnt seem to support remapping imports in +config when they come from node modules (stem- system)


so either we wait or we merge proxy and regular +onRenderClient which may not be that bad anyway so that theoretically proxied routes could be set up in user land? I guess setting default renderer for proxy/pages would also achieve that goal right?