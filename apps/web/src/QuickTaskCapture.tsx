import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, ClipboardPlus, Radio, UserRound, WandSparkles, X } from 'lucide-react';
import { extractTaskFromText } from '@hxhwang/domain';

interface QuickTaskCaptureProps {
  open: boolean;
  today: string;
  onCancel: () => void;
  onCreateBlank: () => void;
  onContinue: (sourceText: string) => void;
}

const previewRows = [
  { key: 'name', label: '任务名称', icon: ClipboardPlus },
  { key: 'assigner', label: '交办人', icon: UserRound },
  { key: 'assignDate', label: '交办日期', icon: CalendarDays },
  { key: 'deadline', label: '截止日期', icon: CalendarDays },
  { key: 'source', label: '任务来源', icon: Radio }
] as const;

export function QuickTaskCapture({ open, today, onCancel, onCreateBlank, onContinue }: QuickTaskCaptureProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [sourceText, setSourceText] = useState('');
  const extraction = useMemo(() => extractTaskFromText(sourceText, today), [sourceText, today]);
  const recognizedRows = previewRows.filter((row) => extraction.fields[row.key]);
  const hasText = Boolean(sourceText.trim());

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      setSourceText('');
      if (!dialog.open) dialog.showModal();
      window.requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    if (dialog.open) dialog.close();
  }, [open]);

  return <dialog
    ref={dialogRef}
    className="quick-capture-dialog"
    aria-labelledby="quick-capture-title"
    onCancel={(event) => { event.preventDefault(); onCancel(); }}
    onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}
  >
    <div className="quick-capture-shell">
      <header className="quick-capture-heading">
        <span className="quick-capture-mark" aria-hidden="true"><WandSparkles size={20} strokeWidth={1.7} /></span>
        <div><span>LOCAL PARSER / SHIFT A</span><h2 id="quick-capture-title">快速记录任务</h2></div>
        <button type="button" className="icon-button quick-capture-action" aria-label="取消快速记录" title="取消快速记录" onClick={onCancel}><X size={18} /></button>
      </header>

      <div className="quick-capture-flow">
        <section className="quick-capture-source" aria-labelledby="quick-capture-source-title">
          <div className="quick-capture-section-title"><span>01</span><div><strong id="quick-capture-source-title">粘贴交办文字</strong><small>通知、聊天记录或一句任务描述均可</small></div></div>
          <textarea
            ref={inputRef}
            className="quick-capture-input"
            aria-label="快速记录文字"
            value={sourceText}
            placeholder={'例如：2026-07-21 张主任要求：整理基层治理台账，7月28日前完成并通过微信报送。'}
            onChange={(event) => setSourceText(event.target.value)}
          />
          <p>文字只在当前操作中使用；本机规则识别，不联网、不自动保存。</p>
        </section>

        <section className="quick-capture-preview" aria-labelledby="quick-capture-preview-title" aria-live="polite">
          <div className="quick-capture-section-title"><span>02</span><div><strong id="quick-capture-preview-title">核对识别结果</strong><small>{recognizedRows.length ? `已识别 ${recognizedRows.length} 个字段` : '等待可识别字段'}</small></div></div>
          {recognizedRows.length ? <div className="quick-capture-preview-grid">
            {recognizedRows.map(({ key, label, icon: Icon }) => <div key={key}><span aria-hidden="true"><Icon size={15} /></span><small>{label}</small><strong>{extraction.fields[key]}</strong></div>)}
          </div> : <div className="quick-capture-empty"><WandSparkles size={19} /><div><strong>{hasText ? '暂未识别出结构化字段' : '输入后即时预览'}</strong><span>{hasText ? '仍可继续进入原任务表单手工核对，原文字会保留。' : '系统会尝试识别任务名称、交办人、日期和来源。'}</span></div></div>}
        </section>
      </div>

      <footer className="quick-capture-footer">
        <span>最终写入仍需在任务抽屉点击“保存任务”</span>
        <div>
          <button type="button" className="secondary-button quick-capture-action" onClick={onCancel}>取消</button>
          <button type="button" className="secondary-button quick-capture-action" onClick={onCreateBlank}><ClipboardPlus size={16} />新建空白任务</button>
          <button type="button" className="primary-button quick-capture-action" disabled={!hasText} onClick={() => onContinue(sourceText.trim())}>继续核对<ArrowRight size={16} /></button>
        </div>
      </footer>
    </div>
  </dialog>;
}
