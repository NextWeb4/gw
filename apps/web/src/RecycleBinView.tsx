import { useMemo, useState } from 'react';
import { ArrowDownToLine, CalendarDays, ClipboardList, FileText, MapPin, Package, RotateCcw, Search, Stamp, Trash2, type LucideIcon } from 'lucide-react';
import type { Attachment } from '@hxhwang/domain';

export type RecycleRecordKind = 'task' | 'meeting' | 'document' | 'research' | 'seal' | 'material';

export interface RecycleBinEntry {
  id: string;
  kind: RecycleRecordKind;
  typeLabel: string;
  title: string;
  description: string;
  deletedAt: string;
  attachmentIds: string[];
}

interface RecycleBinViewProps {
  entries: RecycleBinEntry[];
  attachments: Attachment[];
  onRestore: (kind: RecycleRecordKind, id: string) => void;
  onPurge: (kind: RecycleRecordKind, id: string) => void;
  onEmpty: () => void;
  onDownloadAttachment: (attachment: Attachment) => void;
}

const kindOptions: Array<{ value: 'all' | RecycleRecordKind; label: string }> = [
  { value: 'all', label: '全部类型' },
  { value: 'task', label: '任务' },
  { value: 'meeting', label: '会议' },
  { value: 'document', label: '文件' },
  { value: 'research', label: '外出' },
  { value: 'seal', label: '用章' },
  { value: 'material', label: '物资' }
];

const kindIcons: Record<RecycleRecordKind, LucideIcon> = {
  task: ClipboardList,
  meeting: CalendarDays,
  document: FileText,
  research: MapPin,
  seal: Stamp,
  material: Package
};

const formatDeletedAt = (value: string) => {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? value : timestamp.toLocaleString('zh-CN', { hour12: false });
};

export function RecycleBinView({ entries, attachments, onRestore, onPurge, onEmpty, onDownloadAttachment }: RecycleBinViewProps) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | RecycleRecordKind>('all');
  const attachmentById = useMemo(() => new Map(attachments.map((attachment) => [attachment.id, attachment])), [attachments]);
  const visibleEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN');
    return entries.filter((entry) => {
      if (kind !== 'all' && entry.kind !== kind) return false;
      if (!normalizedQuery) return true;
      const attachmentNames = entry.attachmentIds.map((id) => attachmentById.get(id)?.name || '').join(' ');
      return `${entry.typeLabel} ${entry.title} ${entry.description} ${attachmentNames}`.toLocaleLowerCase('zh-CN').includes(normalizedQuery);
    });
  }, [attachmentById, entries, kind, query]);

  return <>
    <div className="page-heading recycle-heading">
      <div className="heading-copy"><span className="eyebrow">本机生命周期 / LOCAL RETENTION</span><h1>回收站</h1><p>已删除业务记录仍保留在本机，可恢复或显式永久删除。永久删除后只保留不含业务正文的同步墓碑。</p></div>
      <div className="heading-action"><button type="button" className="secondary-button danger-secondary" disabled={!entries.length} onClick={onEmpty}><Trash2 size={16} />清空回收站</button></div>
      <span className="heading-signal" aria-hidden="true">RB</span>
    </div>
    <section className="panel recycle-panel" aria-label="已删除业务记录">
      <div className="recycle-toolbar">
        <label className="recycle-search"><Search size={16} /><input aria-label="搜索回收站" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、摘要或附件名" /></label>
        <label className="recycle-filter"><span>类型</span><select aria-label="按类型筛选" value={kind} onChange={(event) => setKind(event.target.value as 'all' | RecycleRecordKind)}>{kindOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <div className="recycle-count" aria-live="polite"><strong>{visibleEntries.length}</strong><span>/ {entries.length} 条</span></div>
      </div>
      <div className="recycle-list">
        {visibleEntries.map((entry) => {
          const Icon = kindIcons[entry.kind];
          const recordAttachments = entry.attachmentIds.map((id) => attachmentById.get(id)).filter((attachment): attachment is Attachment => Boolean(attachment));
          return <article className="recycle-item" key={`${entry.kind}:${entry.id}`}>
            <div className="recycle-kind" aria-hidden="true"><Icon size={19} /></div>
            <div className="recycle-copy"><div className="recycle-title-row"><span>{entry.typeLabel}</span><h2>{entry.title}</h2></div><p>{entry.description}</p><small>删除时间：{formatDeletedAt(entry.deletedAt)}</small>
              {recordAttachments.length > 0 && <div className="recycle-attachments" aria-label={`${entry.title} 的附件`}>{recordAttachments.map((attachment) => <button type="button" key={attachment.id} disabled={attachment.data === undefined} onClick={() => onDownloadAttachment(attachment)} title={`下载附件 ${attachment.name}`}><ArrowDownToLine size={14} /><span>{attachment.name}</span></button>)}</div>}
            </div>
            <div className="recycle-actions"><button type="button" className="secondary-button recycle-action" aria-label={`恢复${entry.typeLabel}：${entry.title}`} onClick={() => onRestore(entry.kind, entry.id)}><RotateCcw size={15} />恢复</button><button type="button" className="secondary-button danger-secondary recycle-action" aria-label={`永久删除${entry.typeLabel}：${entry.title}`} onClick={() => onPurge(entry.kind, entry.id)}><Trash2 size={15} />永久删除</button></div>
          </article>;
        })}
        {!visibleEntries.length && <div className="empty-state recycle-empty"><Trash2 size={22} /><span>{entries.length ? '没有匹配的已删除记录' : '回收站为空'}</span></div>}
      </div>
    </section>
  </>;
}
