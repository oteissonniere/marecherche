// Namespace shim: Safari exposes both `browser` and `chrome`.
export const browser = globalThis.browser ?? globalThis.chrome;
