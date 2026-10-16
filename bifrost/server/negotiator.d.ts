declare module "negotiator" {
  export default class Negotiator {
    constructor(request: { headers: Record<string, string | undefined> });
    mediaTypes(available?: string[]): string[];
  }
}
