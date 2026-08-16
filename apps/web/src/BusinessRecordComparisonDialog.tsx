import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, GitCompareArrows, Search, X } from 'lucide-react';
import type { BusinessComparisonCandidate, BusinessRecordComparison } from './business-record-comparison';

interface BusinessRecordComparisonDialogProps {
  open: boolean;
  comparison: BusinessRecordComparison | null;
  candidates: readonly BusinessComparisonCandidate[];
  targetId: string;
  onTargetChange: (id: string) => void;
  onClose: () => void;
}

export function BusinessRecordComparisonDialog({ open, comparison, candidates, targetId, onTargetChange, onClose }: BusinessRecordComparisonDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'all' | 'differences'>('all');
  const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN');
  const visibleCandidates = useMemo(
    () => candidates.filter((candidate) => !normalizedQuery || candidate.title.toLocaleLowerCase('zh-CN').includes(normalizedQuery)),
    [candidates, normalizedQuery],
  );
  const visibleRows = comparison?.rows.filter((row) => mode === 'all' || row.changed) || [];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setQuery('');
      setMode('all');
      dialog.showModal();
      window.requestAnimationFrame(() => searchRef.current?.focus());
      return;
    }
    if (!open && dialog.open) {
      dialog.close();
      const target = returnFocusRef.current;
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => target?.isConnected && target.focus()));
    }
  }, [open]);

  return <dialog
    ref={dialogRef}
    className="business-comparison-dialog"
    aria-labelledby="business-comparison-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
  >
    <div className="business-comparison-shell">
      <header className="business-comparison-heading">
        <span className="business-comparison-mark" aria-hidden="true"><GitCompareArrows size={20} /></span>
        <div><span className="eyebrow">ACTIVE RECORDS / READ ONLY</span><h2 id="business-comparison-title">对比业务记录</h2></div>
        <button type="button" className="icon-button business-comparison-action" aria-label="关闭记录对比" onClick={onClose}><X size={18} /></button>
      </header>
      <div className="business-comparison-body">
        <aside className="business-comparison-targets" aria-label="同类记录">
          <div className="business-comparison-target-meta"><span>{comparison?.kindLabel || '同类'}候选</span><strong>{candidates.length}</strong></div>
          <label className="business-comparison-search">
            <Search size={15} aria-hidden="true" />
            <input ref={searchRef} type="search" aria-label="搜索同类记录" value={query} placeholder="搜索记录名称" onChange={(event) => setQuery(event.target.value)} />
            {query && <button type="button" className="icon-button business-comparison-action" aria-label="清除记录搜索" onClick={() => { setQuery(''); searchRef.current?.focus(); }}><X size={15} /></button>}
          </label>
          <div className="business-comparison-target-list">
            {visibleCandidates.map((candidate) => <button
              type="button"
              key={candidate.id}
              className={`business-comparison-target business-comparison-action ${candidate.id === targetId ? 'selected' : ''}`}
              aria-label={`选择对比记录：${candidate.title}`}
              aria-pressed={candidate.id === targetId}
              onClick={() => onTargetChange(candidate.id)}
            >
              <span>{candidate.title}</span>
              {candidate.id === targetId && <Check size={15} aria-hidden="true" />}
            </button>)}
            {!visibleCandidates.length && <div className="business-comparison-empty">没有匹配的同类记录</div>}
          </div>
        </aside>
        <section className="business-comparison-workspace" aria-live="polite">
          <div className="business-comparison-toolbar">
            <div><span>字段核对</span><strong>{comparison ? `${comparison.differenceCount} 项差异 / ${comparison.rows.length} 个字段` : '记录已不可用'}</strong></div>
            <div className="business-comparison-mode" role="group" aria-label="字段显示范围">
              <button type="button" className="business-comparison-action" aria-pressed={mode === 'all'} onClick={() => setMode('all')}>全部字段</button>
              <button type="button" className="business-comparison-action" aria-pressed={mode === 'differences'} onClick={() => setMode('differences')}>仅看差异 <span>{comparison?.differenceCount || 0}</span></button>
            </div>
          </div>
          {comparison && <div className="business-comparison-table">
            <div className="business-comparison-column-head"><span>字段</span><h3>{comparison.sourceTitle}</h3><h3>{comparison.targetTitle}</h3></div>
            <div className="business-comparison-rows">
              {visibleRows.map((row) => <div className={`business-comparison-row ${row.changed ? 'changed' : ''}`} key={row.key}>
                <div className="business-comparison-label"><span>{row.label}</span><small>{row.changed ? '有差异' : '相同'}</small></div>
                <div className="business-comparison-value"><small>当前记录</small><span>{row.sourceValue}</span></div>
                <div className="business-comparison-value"><small>对比记录</small><span>{row.targetValue}</span></div>
              </div>)}
              {!visibleRows.length && <div className="business-comparison-no-differences"><Check size={20} /><strong>没有需要显示的差异</strong></div>}
            </div>
          </div>}
        </section>
      </div>
    </div>
  </dialog>;
}
