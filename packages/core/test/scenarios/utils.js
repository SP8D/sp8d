// ...existing code from utils.js...
export const encode = (obj, size = 80) => {
  const s = JSON.stringify(obj);
  const b = new TextEncoder().encode(s);
  const arr = new Uint8Array(size);
  arr.set(b.slice(0, size));
  return arr;
};
export const decode = (arr) =>
  JSON.parse(new TextDecoder().decode(arr).replace(/\0+$/g, ""));
// Add more shared utilities here as needed
