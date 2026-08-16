import { isActiveBusinessRecord } from '@hxhwang/domain';
import {
  buildBusinessRecordComparison,
  type BusinessComparisonContext,
  type BusinessComparisonKind,
  type BusinessComparisonRecordMap,
} from './business-record-comparison';

const moduleLabels: Record<BusinessComparisonKind, string> = {
  task: '任务管理',
  meeting: '会议管理',
  document: '文件收发',
  research: '外出活动',
  seal: '用章管理',
  material: '物资收发',
};

const titleKeys: Record<BusinessComparisonKind, string> = {
  task: 'name',
  meeting: 'subject',
  document: 'title',
  research: 'subject',
  seal: 'docName',
  material: 'materialName',
};

function formatSummaryField(label: string, value: string) {
  const [first = '未填写', ...continuations] = value.replace(/\r\n?/g, '\n').split('\n');
  return `${label}：${first}${continuations.map((line) => `\n  ${line}`).join('')}`;
}

export function buildBusinessRecordSummary<K extends BusinessComparisonKind>(
  kind: K,
  record: BusinessComparisonRecordMap[K],
  context: BusinessComparisonContext,
): string {
  if (!isActiveBusinessRecord(record)) throw new Error('只能复制当前 active 记录摘要');
  const presentation = buildBusinessRecordComparison(kind, record, record, context);
  const heading = `【${moduleLabels[kind]}】${presentation.sourceTitle.replace(/\s+/g, ' ').trim()}`;
  const fields = presentation.rows
    .filter((row) => row.key !== titleKeys[kind])
    .map((row) => formatSummaryField(row.label, row.sourceValue));
  return [heading, ...fields].join('\n');
}
