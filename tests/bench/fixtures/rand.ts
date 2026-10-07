// Deterministic generators so every run benchmarks byte-identical fixtures.

export type Rand = ReturnType<typeof createRand>;

const WORDS =
  "local business network owner referral community service quality trusted family kitchen design custom remodel cabinet county main street market growth partner event member review recommend neighbor client project estimate small shop studio supply coffee bakery repair plumbing legal accounting insurance marketing realty fitness salon garden".split(
    " "
  );

const UTILITY_CLASSES =
  "flex flex-col flex-row items-center justify-between justify-center gap-2 gap-x-1.5 gap-y-1 rounded-full rounded-[10px] p-2.5 px-4 py-2 mx-auto my-0 mt-4 mb-2 text-body-medium text-body-bold text-black-800 text-grey-600 text-purple-500 bg-white-100 bg-grey-200 bg-purple-100 hover:bg-purple-100 hover:text-purple-600 no-underline transition-all duration-500 shadow-sm border border-solid border-grey-350 w-full h-auto max-w-[1200px] md:px-12 md:flex lg:hidden lg:block sm:w-[300px] truncate leading-tight font-sans font-semibold overflow-hidden shrink-0 grow".split(
    " "
  );

export function createRand(seed: number) {
  // mulberry32
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) =>
    min + Math.floor(next() * (max - min + 1));
  const pick = <T>(xs: readonly T[]): T => xs[int(0, xs.length - 1)];
  const words = (n: number) => Array.from({ length: n }, () => pick(WORDS)).join(" ");
  const title = (n: number) =>
    words(n).replace(/\b\w/g, (c) => c.toUpperCase());
  const sentence = (n: number) => {
    const s = words(n);
    return s[0].toUpperCase() + s.slice(1) + ".";
  };
  const classes = (n: number) =>
    Array.from({ length: n }, () => pick(UTILITY_CLASSES)).join(" ");
  const hex = (n: number) =>
    Array.from({ length: n }, () => int(0, 15).toString(16)).join("");
  const uuid = () =>
    `${hex(8)}-${hex(4)}-4${hex(3)}-${pick(["8", "9", "a", "b"])}${hex(3)}-${hex(12)}`;
  const token = (n: number) => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    return Array.from({ length: n }, () => pick(chars.split(""))).join("");
  };
  const num = () => (next() * 40 - 10).toFixed(3).replace(/0+$/, "");
  /** SVG path data of roughly `length` characters, like inlined icon/logo paths. */
  const svgPath = (length: number) => {
    let d = `M${num()} ${num()}`;
    while (d.length < length) {
      d += `${pick(["c", "l", "s", "C", "L", "h", "v", "z"])}${num()} ${num()} ${num()} ${num()}`;
    }
    return d;
  };
  return { next, int, pick, words, title, sentence, classes, hex, uuid, token, svgPath };
}
