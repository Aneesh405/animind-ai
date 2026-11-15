const UNIT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/m\s*\/\s*s(?:²|\^2)/gi, "meters per second squared"],
  [/m\s*\/\s*s\b/gi, "meters per second"],
  [/m\/s²/gi, "meters per second squared"],
  [/m\/s/gi, "meters per second"],
  [/\bm²\b/gi, "square meters"],
  [/\bkm\/h\b/gi, "kilometers per hour"],
];

/**
 * Converts lesson prose into speech-friendly text without changing its meaning.
 * This intentionally handles a small scientific vocabulary instead of trying to
 * reinterpret arbitrary mathematics.
 */
export function formatSpeechText(source: string): string {
  let text = source
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/<\/?[a-z][^>]*>/gi, " ")
    .replace(/```(?:[a-z]+)?/gi, " ")
    .replace(/[`*_#~>|]/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, " and ")
    .replace(/&lt;/gi, " less than ")
    .replace(/&gt;/gi, " greater than ");

  for (const [pattern, replacement] of UNIT_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  return text
    .replace(/(-?\d+(?:\.\d+)?)\s*°/g, "$1 degrees")
    .replace(/v₀/g, "v naught")
    .replace(/vₓ/g, "v x")
    .replace(/vᵧ/g, "v y")
    .replace(/θ/g, "theta")
    .replace(/Δ/g, "delta ")
    .replace(/²/g, " squared")
    .replace(/³/g, " cubed")
    .replace(/≤/g, " less than or equal to ")
    .replace(/≥/g, " greater than or equal to ")
    .replace(/\s<\s/g, " less than ")
    .replace(/\s>\s/g, " greater than ")
    .replace(/→/g, " leads to ")
    .replace(/\s*\/\s*/g, " divided by ")
    .replace(/\s*=\s*/g, " equals ")
    .replace(/\s*×\s*/g, " times ")
    .replace(/\s*·\s*/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}
