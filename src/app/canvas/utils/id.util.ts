/**
 * Element and page identifiers.
 *
 * Kept local instead of pulling in a uuid dependency: ids only need to be
 * unique inside one document, and staying dependency-free keeps the Canvas JSON
 * contract portable to the future AI service.
 */
export function generateId(prefix = 'el'): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${random}`;
}
