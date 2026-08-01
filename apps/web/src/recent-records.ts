export const RECENT_RECORD_LIMIT = 6;

export interface RecentRecordRef<TTab extends string> {
  tab: TTab;
  id: string;
}

export function rememberRecentRecord<TTab extends string>(
  current: readonly RecentRecordRef<TTab>[],
  record: RecentRecordRef<TTab>,
  limit = RECENT_RECORD_LIMIT,
) {
  const boundedLimit = Math.max(0, Math.trunc(limit));
  if (!boundedLimit) return [];
  return [
    { tab: record.tab, id: record.id },
    ...current.filter((item) => item.tab !== record.tab || item.id !== record.id),
  ].slice(0, boundedLimit);
}

export function pruneRecentRecords<TTab extends string>(
  current: readonly RecentRecordRef<TTab>[],
  activeRecordKeys: ReadonlySet<string>,
) {
  return current.filter((record) => activeRecordKeys.has(`${record.tab}:${record.id}`));
}
