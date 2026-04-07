// Pure utility functions — no state dependency
export const di = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
export const cl = (v, l, h) => Math.max(l, Math.min(h, v));
export const rn = (a, b) => a + Math.random() * (b - a);
export const $ = id => document.getElementById(id);
