export const RECORD_VISIT_HISTORY_LIMIT = 20;

export interface RecordVisit<TTab extends string> {
  tab: TTab;
  id: string;
}

export interface RecordVisitHistory<TTab extends string> {
  entries: RecordVisit<TTab>[];
  cursor: number;
}

export interface RecordVisitNavigation<TTab extends string> {
  previous?: RecordVisit<TTab>;
  next?: RecordVisit<TTab>;
  position: number;
  total: number;
}

function sameVisit<TTab extends string>(left: RecordVisit<TTab> | undefined, right: RecordVisit<TTab>) {
  return left?.tab === right.tab && left.id === right.id;
}

function boundedCursor<TTab extends string>(history: RecordVisitHistory<TTab>) {
  if (!history.entries.length) return -1;
  return Math.min(Math.max(Math.trunc(history.cursor), 0), history.entries.length - 1);
}

export function createRecordVisitHistory<TTab extends string>(): RecordVisitHistory<TTab> {
  return { entries: [], cursor: -1 };
}

export function rememberRecordVisit<TTab extends string>(
  history: RecordVisitHistory<TTab>,
  visit: RecordVisit<TTab>,
  limit = RECORD_VISIT_HISTORY_LIMIT,
): RecordVisitHistory<TTab> {
  const boundedLimit = Math.max(0, Math.trunc(limit));
  if (!boundedLimit) return createRecordVisitHistory<TTab>();
  const cursor = boundedCursor(history);
  if (sameVisit(history.entries[cursor], visit)) {
    return { entries: history.entries.map((entry) => ({ tab: entry.tab, id: entry.id })), cursor };
  }
  const retained = history.entries.slice(0, cursor + 1).map((entry) => ({ tab: entry.tab, id: entry.id }));
  const entries = [...retained, { tab: visit.tab, id: visit.id }].slice(-boundedLimit);
  return { entries, cursor: entries.length - 1 };
}

export function moveRecordVisitHistory<TTab extends string>(
  history: RecordVisitHistory<TTab>,
  direction: 'back' | 'forward',
): { history: RecordVisitHistory<TTab>; target?: RecordVisit<TTab> } {
  const cursor = boundedCursor(history);
  const targetCursor = cursor + (direction === 'back' ? -1 : 1);
  if (targetCursor < 0 || targetCursor >= history.entries.length) {
    return { history: { entries: history.entries, cursor }, target: undefined };
  }
  const target = history.entries[targetCursor];
  return {
    history: { entries: history.entries, cursor: targetCursor },
    target: { tab: target.tab, id: target.id },
  };
}

export function jumpRecordVisitHistory<TTab extends string>(
  history: RecordVisitHistory<TTab>,
  target: RecordVisit<TTab>,
): { history: RecordVisitHistory<TTab>; target?: RecordVisit<TTab> } {
  const cursor = history.entries.findIndex((entry) => sameVisit(entry, target));
  if (cursor < 0) return { history: { entries: history.entries, cursor: boundedCursor(history) }, target: undefined };
  return { history: { entries: history.entries, cursor }, target: { tab: target.tab, id: target.id } };
}

export function recordVisitHistoryNavigation<TTab extends string>(history: RecordVisitHistory<TTab>): RecordVisitNavigation<TTab> {
  const cursor = boundedCursor(history);
  const previous = cursor > 0 ? history.entries[cursor - 1] : undefined;
  const next = cursor >= 0 && cursor < history.entries.length - 1 ? history.entries[cursor + 1] : undefined;
  return {
    previous: previous ? { tab: previous.tab, id: previous.id } : undefined,
    next: next ? { tab: next.tab, id: next.id } : undefined,
    position: cursor + 1,
    total: history.entries.length,
  };
}

export function pruneRecordVisitHistory<TTab extends string>(
  history: RecordVisitHistory<TTab>,
  activeRecordKeys: ReadonlySet<string>,
): RecordVisitHistory<TTab> {
  const cursor = boundedCursor(history);
  const entries: RecordVisit<TTab>[] = [];
  let survivorsThroughCursor = 0;
  history.entries.forEach((entry, index) => {
    if (!activeRecordKeys.has(`${entry.tab}:${entry.id}`)) return;
    entries.push({ tab: entry.tab, id: entry.id });
    if (index <= cursor) survivorsThroughCursor += 1;
  });
  if (!entries.length) return createRecordVisitHistory<TTab>();
  return { entries, cursor: Math.max(0, survivorsThroughCursor - 1) };
}
