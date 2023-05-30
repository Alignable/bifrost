export function formatMetaObject(obj: { [key: string]: string }) {
  return Object.entries(obj).map((e) => e.join("=")).join(", ");
}
