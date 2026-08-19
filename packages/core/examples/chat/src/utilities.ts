import { hexToUint8Array } from "@automerge/automerge-repo-keyhive/dist/utilities.js";

export function rotate(index: number, length: number, direction: -1 | 1) {
  return (index + direction + length) % length;
}

export function shrinkIdentifier(
  identifier: string,
  head = 6,
  tail = 4,
): string {
  const graphemes = [
    ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
      identifier,
    ),
  ].map(({ segment }) => segment);
  if (graphemes.length <= head + tail) return identifier;
  return (
    graphemes.slice(0, head).join("") + "..." + graphemes.slice(-tail).join("")
  );
}

export function identifierColor(identifier: string): string {
  const bytes = hexToUint8Array(identifier);

  let hash = 2166136261;

  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }

  const hue = (hash >>> 0) % 360;

  return hslToHex(hue, 65, 55);
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, x, 0];

  return `#${[r, g, b]
    .map((v) =>
      Math.round((v + m) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
