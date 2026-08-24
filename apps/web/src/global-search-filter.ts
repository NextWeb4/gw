import { defaultFilter } from 'cmdk';

export function matchesGlobalSearchQuery(
  value: string,
  query: string,
  keywords: readonly string[] = [],
): boolean {
  const terms = query.trim().toLocaleLowerCase('zh-CN').split(/\s+/u).filter(Boolean);
  if (terms.length === 0) return true;
  const normalizedKeywords = keywords.map((keyword) => keyword.toLocaleLowerCase('zh-CN'));
  return terms.every((term) => defaultFilter(value, term, normalizedKeywords) > 0);
}

export function globalSearchFilter(value: string, search: string, keywords?: readonly string[]): number {
  return matchesGlobalSearchQuery(value, search, keywords ?? []) ? 1 : 0;
}
