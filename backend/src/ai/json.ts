import type { ZodTypeAny, z } from 'zod';

/**
 * Parse JSON out of an LLM response, tolerating ```json fences and surrounding
 * prose, then validate against a zod schema. Returns the schema's OUTPUT type
 * (so `.default()`ed fields are present). Throws on unrecoverable output.
 */
export function parseAiJson<S extends ZodTypeAny>(raw: string, schema: S): z.output<S> {
  let text = raw.trim();

  // Strip ```json ... ``` or ``` ... ``` fences.
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fence?.[1]) text = fence[1].trim();

  // Fall back to the first {...} or [...] block if there's leading/trailing prose.
  if (!/^[[{]/.test(text)) {
    const obj = /[{[][\s\S]*[}\]]/.exec(text);
    if (obj) text = obj[0];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`AI did not return valid JSON: ${raw.slice(0, 200)}`);
  }
  return schema.parse(parsed) as z.output<S>;
}
