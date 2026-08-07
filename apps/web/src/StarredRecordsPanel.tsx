import { CalendarDays, ChevronRight, ClipboardList, FileText, MapPin, Package, Star, Stamp, type LucideIcon } from 'lucide-react';
import { statusLabels, type StarredBusinessRecordRef } from '@hxhwang/domain';
import type { AgendaKind, AgendaSources } from './agenda';

const kindPresentation: Record<StarredBusinessRecordRef['kind'], { tab: AgendaKind; label: string; icon: LucideIcon }> = {
  task: { tab: 'tasks', label: '任务', icon: ClipboardList },
  meeting: { tab: 'meetings', label: '会议', icon: CalendarDays },
  document: { tab: 'documents', label: '文件', icon: FileText },
  research: { tab: 'researches', label: '外出', icon: MapPin },
  seal: { tab: 'seals', label: '用章', icon: Stamp },
  material: { tab: 'materials', label: '物资', icon: Package },
};

interface StarredRecordItem {
  kind: StarredBusinessRecordRef['kind'];
  tab: AgendaKind;
  id: string;
  label: string;
  title: string;
  detail: string;
  icon: LucideIcon;
}

function resolveStarredRecords(refs: readonly StarredBusinessRecordRef[], sources: AgendaSources): StarredRecordItem[] {
  return refs.flatMap<StarredRecordItem>((ref) => {
    const presentation = kindPresentation[ref.kind];
    if (ref.kind === 'task') {
      const record = sources.tasks.find((item) => item.id === ref.id);
      return record ? [{ ...presentation, kind: ref.kind, id: ref.id, title: record.name || '未命名任务', detail: `${record.category || '未分类'} · ${statusLabels[record.status]}` }] : [];
    }
    if (ref.kind === 'meeting') {
      const record = sources.meetings.find((item) => item.id === ref.id);
      return record ? [{ ...presentation, kind: ref.kind, id: ref.id, title: record.subject || '未命名会议', detail: record.meetingTime?.replace('T', ' ') || record.location || '未设会议时间' }] : [];
    }
    if (ref.kind === 'document') {
      const record = sources.documents.find((item) => item.id === ref.id);
      return record ? [{ ...presentation, kind: ref.kind, id: ref.id, title: record.title || '未命名文件', detail: `${record.code || '无文号'} · ${record.fromUnit || '未填写来源单位'}` }] : [];
    }
    if (ref.kind === 'research') {
      const record = sources.researches.find((item) => item.id === ref.id);
      return record ? [{ ...presentation, kind: ref.kind, id: ref.id, title: record.subject || '未命名外出活动', detail: `${record.direction} · ${record.location || '未填写地点'}` }] : [];
    }
    if (ref.kind === 'seal') {
      const record = sources.seals.find((item) => item.id === ref.id);
      return record ? [{ ...presentation, kind: ref.kind, id: ref.id, title: record.docName || '未命名用章文件', detail: `${record.docType || '未分类'} · ${record.userName || '未填写用章人'}` }] : [];
    }
    const record = sources.materials.find((item) => item.id === ref.id);
    return record ? [{ ...presentation, kind: ref.kind, id: ref.id, title: record.materialName || '未命名物资', detail: `${record.type === 'in' ? '入库' : '领用'} ${record.quantity} · ${record.spec || '无规格'}` }] : [];
  });
}

export function StarredRecordsPanel({ refs, tasks, meetings, documents, researches, seals, materials, onOpenRecord }: { refs: readonly StarredBusinessRecordRef[]; onOpenRecord: (kind: AgendaKind, id: string) => void } & AgendaSources) {
  const items = resolveStarredRecords(refs, { tasks, meetings, documents, researches, seals, materials });
  return <section className="panel starred-records-panel" aria-label="星标记录">
    <div className="panel-heading starred-records-heading"><div><span className="eyebrow">LOCAL FAVORITES</span><h2>星标记录</h2></div><span className="starred-record-count"><Star size={14} fill="currentColor" />{items.length}</span></div>
    <div className="starred-record-list">
      {items.map((item) => { const Icon = item.icon; return <button type="button" className="starred-record-item" key={`${item.kind}:${item.id}`} aria-label={`打开星标${item.label}：${item.title}`} onClick={() => onOpenRecord(item.tab, item.id)}><span className="starred-record-icon"><Icon size={16} strokeWidth={1.7} /></span><span><strong>{item.title}</strong><small>{item.label} · {item.detail}</small></span><ChevronRight size={15} aria-hidden="true" /></button>; })}
      {!items.length && <div className="starred-record-empty"><Star size={22} /><strong>暂无星标记录</strong></div>}
    </div>
  </section>;
}
