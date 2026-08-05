import { useEffect, useMemo, useRef, useState } from 'react';
import { History, RotateCcw, Trash2, X } from 'lucide-react';

interface RevisionDocument {
  title: string;
  contentText: string;
  version: number;
  documentType?: string;
  startDate?: string;
  endDate?: string;
}

interface RevisionItem {
  id: string;
  version: number;
  createdAt: string;
  snapshot: RevisionDocument;
}

interface DocumentRevisionDialogProps<T extends RevisionItem> {
  open: boolean;
  current: RevisionDocument;
  revisions: T[];
  onClose: () => void;
  onRestore: (revision: T) => void | Promise<void>;
  onDelete: (revision: T) => Promise<void>;
  onClear: () => Promise<void>;
}

function revisionTitle(revision: RevisionItem) {
  return revision.snapshot.title || `v${revision.version}`;
}

function revisionDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
}

function documentText(document: RevisionDocument) {
  if (document.documentType !== undefined) {
    return [`标题：${document.title || '未命名文稿'}`, `文种：${document.documentType || '未设置'}`, '', document.contentText].join('\n');
  }
  return [`标题：${document.title || '未命名周报'}`, `周期：${document.startDate} 至 ${document.endDate}`, '', document.contentText].join('\n');
}

export function DocumentRevisionDialog<T extends RevisionItem>({ open, current, revisions, onClose, onRestore, onDelete, onClear }: DocumentRevisionDialogProps<T>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const sortedRevisions = useMemo(
    () => revisions.slice().sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id)),
    [revisions],
  );
  const [selectedId, setSelectedId] = useState('');
  const [busyAction, setBusyAction] = useState<'restore' | 'delete' | 'clear' | ''>('');
  const selected = sortedRevisions.find((revision) => revision.id === selectedId) || sortedRevisions[0];
  const currentRevisionId = sortedRevisions.find((revision) => revision.version === current.version)?.id;
  const selectedIsCurrent = selected?.id === currentRevisionId;

  useEffect(() => {
    if (!open) return;
    if (!selectedId || !sortedRevisions.some((revision) => revision.id === selectedId)) setSelectedId(sortedRevisions[0]?.id || '');
  }, [open, selectedId, sortedRevisions]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      return;
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => {
    if (busyAction) return;
    onClose();
    const target = returnFocusRef.current;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => target?.isConnected && target.focus()));
  };
  const restore = async () => {
    if (!selected || !window.confirm(`恢复 v${selected.version} 会替换当前屏幕中的未保存内容，确认继续？`)) return;
    setBusyAction('restore');
    try {
      await onRestore(selected);
      onClose();
      const target = returnFocusRef.current;
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => target?.isConnected && target.focus()));
    } finally {
      setBusyAction('');
    }
  };
  const remove = async () => {
    if (!selected || selectedIsCurrent || !window.confirm(`确认删除 v${selected.version} 的本机历史？当前文稿不会改变。`)) return;
    setBusyAction('delete');
    try {
      await onDelete(selected);
    } finally {
      setBusyAction('');
    }
  };
  const clear = async () => {
    if (!sortedRevisions.length || !window.confirm(`确认清空当前目标的 ${sortedRevisions.length} 条本机版本历史？当前内容不会改变。`)) return;
    setBusyAction('clear');
    try {
      await onClear();
    } finally {
      setBusyAction('');
    }
  };

  return <dialog
    ref={dialogRef}
    className="document-revision-dialog"
    aria-labelledby="document-revision-title"
    onCancel={(event) => { event.preventDefault(); close(); }}
    onClick={(event) => { if (event.target === event.currentTarget) close(); }}
  >
    <div className="document-revision-shell">
      <header className="document-revision-heading">
        <div><span className="eyebrow"><History size={14} />本机版本历史</span><h2 id="document-revision-title">查看与恢复保存版本</h2></div>
        <button type="button" className="icon-button document-revision-action" aria-label="关闭版本历史" disabled={Boolean(busyAction)} onClick={close}><X size={18} /></button>
      </header>
      <div className="document-revision-body">
        <aside className="document-revision-list" aria-label="保存版本">
          <div className="document-revision-list-meta"><span>已保存版本</span><strong>{sortedRevisions.length}</strong></div>
          {sortedRevisions.map((revision) => <button
            type="button"
            key={revision.id}
            className={`document-revision-row ${revision.id === selected?.id ? 'selected' : ''}`}
            aria-pressed={revision.id === selected?.id}
            aria-current={revision.id === currentRevisionId ? 'true' : undefined}
            onClick={() => setSelectedId(revision.id)}
          >
            <span><strong>v{revision.version}</strong><small>{revisionDate(revision.createdAt)}</small></span>
            <span>{revisionTitle(revision)}</span>
          </button>)}
          {!sortedRevisions.length && <div className="document-revision-empty"><History size={20} /><strong>暂无已保存版本</strong></div>}
        </aside>
        <section className="document-revision-comparison" aria-live="polite">
          <article><h3>当前内容</h3><pre>{documentText(current)}</pre></article>
          <article><h3>该版本内容{selected ? ` · v${selected.version}` : ''}</h3><pre>{selected ? documentText(selected.snapshot) : '选择一个保存版本后可在此查看。'}</pre></article>
        </section>
      </div>
      <footer className="document-revision-footer">
        <button type="button" className="text-button document-revision-action document-revision-clear" disabled={!sortedRevisions.length || Boolean(busyAction)} onClick={() => void clear()}><Trash2 size={15} />{busyAction === 'clear' ? '正在清空' : '清空当前目标历史'}</button>
        <div>
          <button type="button" className="secondary-button document-revision-action" disabled={!selected || selectedIsCurrent || Boolean(busyAction)} title={selectedIsCurrent ? '当前保存版不可删除' : undefined} onClick={() => void remove()}><Trash2 size={15} />{busyAction === 'delete' ? '正在删除' : '删除该版本'}</button>
          <button type="button" className="primary-button document-revision-action" disabled={!selected || Boolean(busyAction)} onClick={() => void restore()}><RotateCcw size={15} />{busyAction === 'restore' ? '正在载入' : selected ? `恢复 v${selected.version} 为未保存工作副本` : '恢复为未保存工作副本'}</button>
        </div>
      </footer>
    </div>
  </dialog>;
}
