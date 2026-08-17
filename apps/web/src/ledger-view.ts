import {
  isActiveBusinessRecord,
  isValidIsoDate,
  isValidIsoDateTime,
  statusLabels,
  type BusinessRecordLifecycle,
  type MaterialRecord,
  type MeetingRecord,
  type OfficialDocument,
  type ResearchDirection,
  type ResearchRecord,
  type SealRecord,
  type Status,
  type Task,
} from '@hxhwang/domain';

export type LedgerKind = 'tasks' | 'meetings' | 'documents' | 'researches' | 'seals' | 'materials';

export interface LedgerRecordMap {
  tasks: Task;
  meetings: MeetingRecord;
  documents: OfficialDocument;
  researches: ResearchRecord;
  seals: SealRecord;
  materials: MaterialRecord;
}

export interface LedgerViewState {
  query: string;
  filter: string;
  sort: string;
  date: LedgerPresenceFilter;
  attachments: LedgerPresenceFilter;
}

export type LedgerPresenceFilter = 'all' | 'present' | 'missing';

export type LedgerViewStates = Record<LedgerKind, LedgerViewState>;

export interface LedgerViewOption {
  value: string;
  label: string;
}

type LedgerConfig<T> = {
  searchText: (record: T) => string;
  matchesFilter: (record: T, filter: string) => boolean;
  compare: (left: T, right: T, sort: string) => number;
  dateValue: (record: T) => { value: string; kind: 'date' | 'datetime' };
};

const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' });
export const createInitialLedgerViewState = (): LedgerViewState => ({ query: '', filter: 'all', sort: 'default', date: 'all', attachments: 'all' });

export function toggleLedgerPresenceFilter(current: LedgerPresenceFilter, requested: Exclude<LedgerPresenceFilter, 'all'>): LedgerPresenceFilter {
  return current === requested ? 'all' : requested;
}

export function createInitialLedgerViewStates(): LedgerViewStates {
  return {
    tasks: createInitialLedgerViewState(),
    meetings: createInitialLedgerViewState(),
    documents: createInitialLedgerViewState(),
    researches: createInitialLedgerViewState(),
    seals: createInitialLedgerViewState(),
    materials: createInitialLedgerViewState(),
  };
}

export const LEDGER_SORT_OPTIONS: Record<LedgerKind, readonly LedgerViewOption[]> = {
  tasks: [
    { value: 'default', label: '原始顺序' },
    { value: 'deadline:asc', label: '截止日期：由近到远' },
    { value: 'deadline:desc', label: '截止日期：由远到近' },
    { value: 'updatedAt:desc', label: '最近更新优先' },
    { value: 'name:asc', label: '任务名称：正序' },
  ],
  meetings: [
    { value: 'default', label: '原始顺序' },
    { value: 'meetingTime:desc', label: '会议时间：最新优先' },
    { value: 'meetingTime:asc', label: '会议时间：最早优先' },
    { value: 'subject:asc', label: '会议主题：正序' },
  ],
  documents: [
    { value: 'default', label: '原始顺序' },
    { value: 'docDate:desc', label: '文件日期：最新优先' },
    { value: 'docDate:asc', label: '文件日期：最早优先' },
    { value: 'title:asc', label: '文件标题：正序' },
  ],
  researches: [
    { value: 'default', label: '原始顺序' },
    { value: 'researchTime:desc', label: '活动日期：最新优先' },
    { value: 'researchTime:asc', label: '活动日期：最早优先' },
    { value: 'subject:asc', label: '活动主题：正序' },
  ],
  seals: [
    { value: 'default', label: '原始顺序' },
    { value: 'sealTime:desc', label: '用章日期：最新优先' },
    { value: 'sealTime:asc', label: '用章日期：最早优先' },
    { value: 'docName:asc', label: '文件名称：正序' },
  ],
  materials: [
    { value: 'default', label: '原始顺序' },
    { value: 'handlerTime:desc', label: '经手日期：最新优先' },
    { value: 'handlerTime:asc', label: '经手日期：最早优先' },
    { value: 'materialName:asc', label: '物资名称：正序' },
  ],
};

function uniqueOptions(values: readonly string[], prefix: string): LedgerViewOption[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
    .sort((left, right) => collator.compare(left, right))
    .map((value) => ({ value: `${prefix}:${value}`, label: `${prefix === 'category' ? '类目' : prefix === 'receipt' ? '状态' : '类型'}：${value}` }));
}

export function getLedgerFilterOptions<K extends LedgerKind>(kind: K, records: readonly LedgerRecordMap[K][]): LedgerViewOption[] {
  const activeRecords = records.filter(isActiveBusinessRecord);
  if (kind === 'tasks') {
    const tasks = activeRecords as readonly Task[];
    const statuses: Status[] = ['pending', 'progress', 'done', 'overdue'];
    return [
      { value: 'all', label: '全部任务' },
      ...statuses.map((status) => ({ value: `status:${status}`, label: `状态：${statusLabels[status]}` })),
      ...uniqueOptions(tasks.map((task) => task.category), 'category'),
    ];
  }
  if (kind === 'meetings') return [
    { value: 'all', label: '全部会议' },
    { value: 'time:scheduled', label: '时间：已安排' },
    { value: 'time:missing', label: '时间：待补充' },
  ];
  if (kind === 'documents') {
    const documents = activeRecords as readonly OfficialDocument[];
    return [
      { value: 'all', label: '全部文件' },
      ...(['收文', '发文', '其他'] as const).map((type) => ({ value: `type:${type}`, label: `类型：${type}` })),
      ...uniqueOptions(documents.map((document) => document.receiptStatus), 'receipt'),
    ];
  }
  if (kind === 'researches') {
    const directions: ResearchDirection[] = ['外出调研', '外出开会', '外出活动', '慰问活动', '上级来访'];
    return [{ value: 'all', label: '全部活动' }, ...directions.map((direction) => ({ value: `direction:${direction}`, label: `类型：${direction}` }))];
  }
  if (kind === 'seals') {
    const seals = activeRecords as readonly SealRecord[];
    return [{ value: 'all', label: '全部用章' }, ...uniqueOptions(seals.map((seal) => seal.docType), 'type')];
  }
  return [
    { value: 'all', label: '全部收发' },
    { value: 'movement:in', label: '收发：入库' },
    { value: 'movement:out', label: '收发：领用' },
  ];
}

function compareValue(left: string, right: string, direction: 'asc' | 'desc') {
  const leftValue = left.trim();
  const rightValue = right.trim();
  if (!leftValue && !rightValue) return 0;
  if (!leftValue) return 1;
  if (!rightValue) return -1;
  const result = collator.compare(leftValue, rightValue);
  return direction === 'asc' ? result : -result;
}

function valueAfterPrefix(value: string) {
  const separator = value.indexOf(':');
  return separator === -1 ? '' : value.slice(separator + 1);
}

const ledgerConfigs: { [K in LedgerKind]: LedgerConfig<LedgerRecordMap[K]> } = {
  tasks: {
    searchText: (task) => `${task.name} ${task.category} ${task.assigner} ${task.source} ${task.workSummary}`,
    matchesFilter: (task, filter) => filter === 'all'
      || (filter.startsWith('status:') && task.status === valueAfterPrefix(filter))
      || (filter.startsWith('category:') && task.category === valueAfterPrefix(filter)),
    compare: (left, right, sort) => {
      if (sort === 'deadline:asc') return compareValue(left.deadline, right.deadline, 'asc');
      if (sort === 'deadline:desc') return compareValue(left.deadline, right.deadline, 'desc');
      if (sort === 'updatedAt:desc') return compareValue(left.updatedAt, right.updatedAt, 'desc');
      if (sort === 'name:asc') return compareValue(left.name, right.name, 'asc');
      return 0;
    },
    dateValue: (task) => ({ value: task.deadline, kind: 'date' }),
  },
  meetings: {
    searchText: (meeting) => `${meeting.subject} ${meeting.sendTo} ${meeting.receiver} ${meeting.location} ${meeting.remark}`,
    matchesFilter: (meeting, filter) => filter === 'all'
      || (filter === 'time:scheduled' && isValidIsoDateTime(meeting.meetingTime, false))
      || (filter === 'time:missing' && !isValidIsoDateTime(meeting.meetingTime, false)),
    compare: (left, right, sort) => {
      if (sort === 'meetingTime:asc') return compareValue(left.meetingTime, right.meetingTime, 'asc');
      if (sort === 'meetingTime:desc') return compareValue(left.meetingTime, right.meetingTime, 'desc');
      if (sort === 'subject:asc') return compareValue(left.subject, right.subject, 'asc');
      return 0;
    },
    dateValue: (meeting) => ({ value: meeting.meetingTime, kind: 'datetime' }),
  },
  documents: {
    searchText: (document) => `${document.title} ${document.code} ${document.fromUnit} ${document.handler} ${document.fileCategory} ${document.workCategory}`,
    matchesFilter: (document, filter) => filter === 'all'
      || (filter.startsWith('type:') && document.docType === valueAfterPrefix(filter))
      || (filter.startsWith('receipt:') && document.receiptStatus === valueAfterPrefix(filter)),
    compare: (left, right, sort) => {
      if (sort === 'docDate:asc') return compareValue(left.docDate, right.docDate, 'asc');
      if (sort === 'docDate:desc') return compareValue(left.docDate, right.docDate, 'desc');
      if (sort === 'title:asc') return compareValue(left.title, right.title, 'asc');
      return 0;
    },
    dateValue: (document) => ({ value: document.docDate, kind: 'date' }),
  },
  researches: {
    searchText: (research) => `${research.subject} ${research.direction} ${research.participants} ${research.location} ${research.summary} ${research.achievements}`,
    matchesFilter: (research, filter) => filter === 'all' || (filter.startsWith('direction:') && research.direction === valueAfterPrefix(filter)),
    compare: (left, right, sort) => {
      if (sort === 'researchTime:asc') return compareValue(left.researchTime, right.researchTime, 'asc');
      if (sort === 'researchTime:desc') return compareValue(left.researchTime, right.researchTime, 'desc');
      if (sort === 'subject:asc') return compareValue(left.subject, right.subject, 'asc');
      return 0;
    },
    dateValue: (research) => ({ value: research.researchTime, kind: 'date' }),
  },
  seals: {
    searchText: (seal) => `${seal.userName} ${seal.approver} ${seal.docName} ${seal.docType} ${seal.remark}`,
    matchesFilter: (seal, filter) => filter === 'all' || (filter.startsWith('type:') && seal.docType === valueAfterPrefix(filter)),
    compare: (left, right, sort) => {
      if (sort === 'sealTime:asc') return compareValue(left.sealTime, right.sealTime, 'asc');
      if (sort === 'sealTime:desc') return compareValue(left.sealTime, right.sealTime, 'desc');
      if (sort === 'docName:asc') return compareValue(left.docName, right.docName, 'asc');
      return 0;
    },
    dateValue: (seal) => ({ value: seal.sealTime, kind: 'date' }),
  },
  materials: {
    searchText: (material) => `${material.materialName} ${material.spec} ${material.handler} ${material.fromUnit} ${material.remark}`,
    matchesFilter: (material, filter) => filter === 'all' || (filter.startsWith('movement:') && material.type === valueAfterPrefix(filter)),
    compare: (left, right, sort) => {
      if (sort === 'handlerTime:asc') return compareValue(left.handlerTime, right.handlerTime, 'asc');
      if (sort === 'handlerTime:desc') return compareValue(left.handlerTime, right.handlerTime, 'desc');
      if (sort === 'materialName:asc') return compareValue(left.materialName, right.materialName, 'asc') || compareValue(left.spec, right.spec, 'asc');
      return 0;
    },
    dateValue: (material) => ({ value: material.handlerTime, kind: 'date' }),
  },
};

function matchesPresenceFilter(present: boolean, filter: LedgerPresenceFilter) {
  return filter === 'all' || (filter === 'present' ? present : !present);
}

function hasValidLedgerDate<T>(record: T, config: LedgerConfig<T>) {
  const date = config.dateValue(record);
  return date.kind === 'datetime'
    ? isValidIsoDateTime(date.value, false)
    : isValidIsoDate(date.value, false);
}

function applyLedgerView<T extends BusinessRecordLifecycle & { files: string[] }>(records: readonly T[], state: LedgerViewState, config: LedgerConfig<T>): T[] {
  const query = state.query.trim().toLocaleLowerCase('zh-CN');
  return records
    .filter(isActiveBusinessRecord)
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => (!query || config.searchText(record).toLocaleLowerCase('zh-CN').includes(query))
      && config.matchesFilter(record, state.filter)
      && matchesPresenceFilter(hasValidLedgerDate(record, config), state.date)
      && matchesPresenceFilter(record.files.length > 0, state.attachments))
    .sort((left, right) => config.compare(left.record, right.record, state.sort) || left.index - right.index)
    .map(({ record }) => record);
}

export function deriveLedgerRecords<K extends LedgerKind>(kind: K, records: readonly LedgerRecordMap[K][], state: LedgerViewState): LedgerRecordMap[K][] {
  const config = ledgerConfigs[kind] as LedgerConfig<LedgerRecordMap[K]>;
  return applyLedgerView(records, state, config);
}
