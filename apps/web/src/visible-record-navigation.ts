export interface VisibleRecordPosition {
  index: number;
  total: number;
  previousId?: string;
  nextId?: string;
}

export function getVisibleRecordPosition(
  records: readonly { id: string }[],
  selectedId: string | undefined,
): VisibleRecordPosition | null {
  if (!selectedId) return null;
  const index = records.findIndex((record) => record.id === selectedId);
  if (index === -1) return null;
  return {
    index,
    total: records.length,
    previousId: records[index - 1]?.id,
    nextId: records[index + 1]?.id,
  };
}
