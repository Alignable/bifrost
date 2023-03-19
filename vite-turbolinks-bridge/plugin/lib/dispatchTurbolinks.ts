// we probably dont need to support this?
export interface TurbolinksTiming {
  requestEnd: number;
  requestStart: number;
  visitEnd: number;
  visitStart: number;
}

// breaking change - we don't log request:start or request:end
export type TurbolinksEvents = {
  "turbolinks:click": { url: string };
  "turbolinks:before-visit": { url: string };
  "turbolinks:visit": { url: string };
  "turbolinks:before-cache": {};
  "turbolinks:before-render": { newBody: string};// breaking change: Turbolinks sends newBody in here as Element, we send as string
  "turbolinks:render": {};
  "turbolinks:load": { url: string; timing?: TurbolinksTiming };
};

export function dispatchTurbolinks<E extends keyof TurbolinksEvents>(
  name: E,
  data: TurbolinksEvents[E],
  target: EventTarget = document,
) {
  const event = new Event(name, { bubbles: true, cancelable: true }) as Event & { data: any };
  event.data = data;
  target.dispatchEvent(event);
}
