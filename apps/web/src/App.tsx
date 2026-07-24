import { useEffect, useMemo, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Archive, ArrowDownToLine, BookOpen, Check, ChevronRight, ClipboardList, CloudOff, FileArchive, FileOutput,
  FileText, FolderOpen, Info, LayoutDashboard, Menu, Pencil, Plus, RefreshCw, Save, Search,
  ShieldCheck, Sparkles, Upload, X
} from 'lucide-react';
import {
  buildWeeklyReportSummary, createId, nowIso, type ArchiveRecord, type Attachment, type Draft, type KnowledgePack, type MigrationReport,
  type OfficialDocument, type PartnerStatus, type Status, type Task, type TaskStage, type WeeklyReport, type WritingTemplate
} from '@hxhwang/domain';
import {
  exportLocalSnapshot, getRecord, importLocalSnapshot, listRecords, putRecord, removeRecord, seedDemoData
} from '@hxhwang/local-data';
import { migrateLegacyExport, type MigrationBundle } from '@hxhwang/migration';
import type { PrivateSyncClient } from '@hxhwang/sync-client';
import { redactSensitiveContent } from '@hxhwang/sync-client/redaction';
import { buildPrintableDocument, downloadBlob, draftBodyLines, exportDraftDocx } from '@hxhwang/documents';
import knowledgePack from '../../../content/generated/knowledge-pack.json';
import { syncPrivateWorkspace } from './private-services';

type Tab = 'dashboard' | 'tasks' | 'documents' | 'writing' | 'weekly' | 'archive' | 'migration' | 'about';
type HxWindow = Window & { hxhwang?: { printPdf: (html: string, title: string) => Promise<boolean> } };
const desktopBridge = () => (window as HxWindow).hxhwang;
const brandIconUrl = `${import.meta.env.BASE_URL}icons/icon-192.png`;

const navItems: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: '工作台', icon: LayoutDashboard },
  { id: 'tasks', label: '任务管理', icon: ClipboardList },
  { id: 'documents', label: '文件收发', icon: FileText },
  { id: 'writing', label: '公文写作', icon: Pencil },
  { id: 'weekly', label: '周报生成', icon: FileOutput },
  { id: 'archive', label: '历史档案', icon: Archive },
  { id: 'migration', label: '数据迁移', icon: RefreshCw }
];

const emptyTask = (): Task => ({
  id: createId('task'), name: '', category: '日常工作', source: '其他', assigner: '', assignDate: new Date().toISOString().slice(0, 10),
  deadline: '', status: 'pending', partnerStatus: [], stages: [], remark: '', workSummary: '', files: [], createdAt: nowIso(), updatedAt: nowIso()
});

const emptyDocument = (): OfficialDocument => ({
  id: createId('doc'), title: '', code: '', docType: '收文', docDate: new Date().toISOString().slice(0, 10), securityLevel: '公开',
  fromUnit: '', fileCategory: '', workCategory: '', handler: '', sendScope: '', receiptStatus: '待登记', remark: '', files: [], createdAt: nowIso(), updatedAt: nowIso()
});

function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<OfficialDocument[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [archives, setArchives] = useState<ArchiveRecord[]>([]);
  const [legacySettings, setLegacySettings] = useState<Array<Record<string, unknown>>>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [draft, setDraft] = useState<Draft>({ id: 'draft_main', title: '工作总结', documentType: '工作总结', contentHtml: '', contentText: '', templateId: 'work-summary', version: 1, updatedAt: nowIso() });
  const [search, setSearch] = useState('');
  const [taskEditor, setTaskEditor] = useState<Task | null>(null);
  const [documentEditor, setDocumentEditor] = useState<OfficialDocument | null>(null);
  const [toast, setToast] = useState('');
  const isDesktop = Boolean(desktopBridge());
  const privateServicesEnabled = __PRIVATE_SERVICES__ || isDesktop;

  const reload = async () => {
    await seedDemoData();
    setTasks(await listRecords<Task>('task'));
    setDocuments(await listRecords<OfficialDocument>('document'));
    setWeeklyReports(await listRecords<WeeklyReport>('weekly'));
    setArchives(await listRecords<ArchiveRecord>('archive'));
    setLegacySettings(await listRecords<Record<string, unknown>>('setting'));
    setAttachments(await listRecords<Attachment>('attachment'));
    const savedDraft = await getRecord<Draft>('draft_main');
    if (savedDraft) setDraft(savedDraft);
  };

  useEffect(() => { void reload(); }, []);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 3200); return () => window.clearTimeout(timer); }, [toast]);

  const filteredTasks = useMemo(() => tasks.filter((task) => `${task.name} ${task.category} ${task.assigner}`.toLowerCase().includes(search.toLowerCase())), [tasks, search]);
  const filteredDocuments = useMemo(() => documents.filter((doc) => `${doc.title} ${doc.code} ${doc.fromUnit}`.toLowerCase().includes(search.toLowerCase())), [documents, search]);

  const saveTask = async (task: Task) => { if (!task.name.trim()) return setToast('请填写任务名称'); await putRecord('task', task.id, { ...task, name: task.name.trim(), updatedAt: nowIso() }); setTaskEditor(null); await reload(); setToast('任务已保存'); };
  const saveDocument = async (doc: OfficialDocument) => { if (!doc.title.trim()) return setToast('请填写文件标题'); await putRecord('document', doc.id, { ...doc, title: doc.title.trim(), updatedAt: nowIso() }); setDocumentEditor(null); await reload(); setToast('文件登记已保存'); };
  const deleteTask = async (id: string) => { await removeRecord(id); await reload(); setToast('任务已删除'); };
  const deleteDocument = async (id: string) => { await removeRecord(id); await reload(); setToast('文件已删除'); };
  const saveWeeklyReport = async (report: WeeklyReport) => {
    if (!report.title.trim() || !report.contentText.trim()) throw new Error('请填写周报标题和正文');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(report.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(report.endDate) || report.startDate > report.endDate) throw new Error('周报起止日期无效');
    const saved: WeeklyReport = {
      ...report,
      id: report.id || createId('weekly'),
      title: report.title.trim(),
      contentText: report.contentText.trim(),
      createdAt: report.createdAt || nowIso(),
      updatedAt: nowIso(),
      version: report.version + 1
    };
    await putRecord('weekly', saved.id, saved);
    await reload();
    setToast('周报已保存');
    return saved;
  };
  const deleteWeeklyReport = async (id: string) => { await removeRecord(id); await reload(); setToast('周报已删除'); };

  const importLegacy = async (bundle: MigrationBundle) => {
    for (const task of bundle.tasks) await putRecord('task', task.id, task);
    for (const doc of bundle.documents) await putRecord('document', doc.id, doc);
    for (const archive of bundle.archives) await putRecord('archive', archive.id, archive);
    for (const attachment of bundle.attachments) await putRecord('attachment', attachment.id, attachment);
    for (const skill of bundle.skills) await putRecord('setting', `legacy-skill:${skill.id}`, { type: 'legacy-skill', ...skill });
    for (const setting of bundle.settings) await putRecord('setting', setting.id, { type: 'legacy-setting', id: setting.id, value: setting.value, sourceVersion: bundle.report.sourceVersion });
    await reload();
    return bundle.report;
  };

  const restoreSnapshot = async (snapshot: unknown): Promise<MigrationReport> => {
    const result = await importLocalSnapshot(snapshot);
    await reload();
    return {
      sourceVersion: 'HxHwang Gw 本地快照',
      imported: {
        tasks: result.byKind.task,
        documents: result.byKind.document,
        drafts: result.byKind.draft,
        weeklyReports: result.byKind.weekly,
        archives: result.byKind.archive,
        settings: result.byKind.setting
      },
      attachments: result.byKind.attachment,
      warnings: result.warnings
    };
  };

  const addAttachments = async (files: FileList, currentIds: string[], onUpdate: (ids: string[]) => void) => {
    if (!privateServicesEnabled) { setToast('公开演示版不保存真实附件，请使用桌面端或内网模式'); return; }
    const nextIds = [...currentIds];
    for (const file of Array.from(files)) {
      if (file.size > 8_000_000) { setToast(`${file.name} 超过 8 MB 限制`); continue; }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
      const id = createId('attachment');
      const attachment: Attachment = { id, name: file.name, mimeType: file.type || 'application/octet-stream', size: file.size, data: bytesToBase64(bytes), sha256: hash, createdAt: nowIso() };
      await putRecord('attachment', id, attachment);
      nextIds.push(id);
    }
    onUpdate([...new Set(nextIds)]);
    await reload();
    setToast('附件已加入当前记录');
  };

  const renderContent = () => {
    if (tab === 'dashboard') return <Dashboard tasks={tasks} documents={documents} archives={archives} onNavigate={setTab} />;
    if (tab === 'tasks') return <TaskView tasks={filteredTasks} search={search} setSearch={setSearch} attachments={attachments} canAttach={privateServicesEnabled} onNew={() => setTaskEditor(emptyTask())} onEdit={setTaskEditor} onDelete={deleteTask} />;
    if (tab === 'documents') return <DocumentView documents={filteredDocuments} search={search} setSearch={setSearch} attachments={attachments} canAttach={privateServicesEnabled} onNew={() => setDocumentEditor(emptyDocument())} onEdit={setDocumentEditor} onDelete={deleteDocument} />;
    if (tab === 'writing') return <WritingStudio draft={draft} setDraft={setDraft} setToast={setToast} />;
    if (tab === 'weekly') return <WeeklyView tasks={tasks} documents={documents} reports={weeklyReports} onSave={saveWeeklyReport} onDelete={deleteWeeklyReport} setToast={setToast} />;
    if (tab === 'archive') return <ArchiveView archives={archives} settings={legacySettings} attachments={attachments} />;
    if (tab === 'migration') return <MigrationView canImport={privateServicesEnabled} onImport={importLegacy} onRestore={restoreSnapshot} onReload={reload} setToast={setToast} />;
    return <AboutView desktop={isDesktop} privateServices={privateServicesEnabled} tasks={tasks} documents={documents} weeklyReports={weeklyReports} attachments={attachments} draft={draft} onReload={reload} setToast={setToast} />;
  };

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand-lockup"><img className="brand-mark" src={brandIconUrl} alt="" aria-hidden="true" /><div><strong>HxHwang Gw</strong><span>公文事务台</span></div></div>
      <div className="mode-label"><span className="status-dot" /><span>{privateServicesEnabled ? (isDesktop ? '桌面本地模式' : '内网模式') : '本地演示模式'}</span></div>
      <nav className="nav-list" aria-label="主导航">
        {navItems.map(({ id, label, icon: Icon }) => <button aria-label={label} className={`nav-button ${tab === id ? 'active' : ''}`} key={id} onClick={() => { setTab(id); setSearch(''); }}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{tab === id && <ChevronRight size={14} />}</button>)}
      </nav>
      <div className="sidebar-bottom"><button aria-label="关于与设置" className="nav-button" onClick={() => setTab('about')}><Info size={17} /><span>关于与设置</span></button><div className="sidebar-credit">© HaoXiangHwang<br /><a href="mailto:Rays688888@Gmail.com">Rays688888@Gmail.com</a></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="mobile-brand"><Menu size={18} /><span>HxHwang Gw</span></div><div className="breadcrumbs">工作台 <span>/</span> {navItems.find((item) => item.id === tab)?.label ?? '关于'}</div><div className="topbar-actions"><span className="connection">{privateServicesEnabled ? <ShieldCheck size={15} /> : <CloudOff size={15} />} {privateServicesEnabled ? '本机存储 · 同步需手动触发' : '数据仅保存在本机'}</span><button className="icon-button" title="刷新本地数据" onClick={() => void reload()}><RefreshCw size={17} /></button></div></header>
      <div className="content-wrap">{renderContent()}</div>
      <footer className="page-footer">© HaoXiangHwang · <a href="mailto:Rays688888@Gmail.com">Rays688888@Gmail.com</a> · <a href="https://nextweb4.github.io/" target="_blank" rel="noreferrer">nextweb4.github.io</a></footer>
    </main>
    {taskEditor && <TaskEditor task={taskEditor} attachments={attachments} canAttach={privateServicesEnabled} onChange={setTaskEditor} onAttach={(files) => void addAttachments(files, taskEditor.files, (ids) => setTaskEditor({ ...taskEditor, files: ids }))} onSave={() => void saveTask(taskEditor)} onClose={() => setTaskEditor(null)} />}
    {documentEditor && <DocumentEditor document={documentEditor} attachments={attachments} canAttach={privateServicesEnabled} onChange={setDocumentEditor} onAttach={(files) => void addAttachments(files, documentEditor.files, (ids) => setDocumentEditor({ ...documentEditor, files: ids }))} onSave={() => void saveDocument(documentEditor)} onClose={() => setDocumentEditor(null)} />}
    {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
  </div>;
}

function PageHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{detail}</p></div>{action && <div className="heading-action">{action}</div>}</div>;
}

function Dashboard({ tasks, documents, archives, onNavigate }: { tasks: Task[]; documents: OfficialDocument[]; archives: ArchiveRecord[]; onNavigate: (tab: Tab) => void }) {
  const active = tasks.filter((task) => task.status !== 'done').length;
  const dueSoon = tasks.filter((task) => task.deadline && task.deadline <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) && task.status !== 'done').length;
  return <>
    <PageHeading eyebrow="今日工作" title="把材料，变成可推进的事项。" detail="本地优先保存，按任务、文件和文稿建立可追溯的工作链。" action={<button className="primary-button" onClick={() => onNavigate('tasks')}><Plus size={16} />新建任务</button>} />
    <section className="metric-grid"><Metric label="进行中任务" value={active} note="未完成事项" accent="rust" /><Metric label="近七日到期" value={dueSoon} note="需要优先处理" accent="gold" /><Metric label="登记文件" value={documents.length} note="本机索引" accent="green" /><Metric label="历史档案" value={archives.length} note="只读保留" accent="ink" /></section>
    <div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">优先事项</span><h2>任务队列</h2></div><button className="text-button" onClick={() => onNavigate('tasks')}>查看全部 <ChevronRight size={15} /></button></div><div className="task-queue">{tasks.slice(0, 5).map((task) => <div className="queue-row" key={task.id}><span className={`priority-bar ${task.status}`} /><div className="queue-main"><strong>{task.name}</strong><span>{task.category} · {task.assigner || '未指定交办人'}</span></div><StatusPill status={task.status} /><span className="queue-date">{task.deadline || '未设截止'}</span></div>)}{!tasks.length && <EmptyState text="还没有任务" />}</div></section><section className="panel paper-panel"><div className="paper-index">公文写作速查</div><h2>先立意，再落笔。</h2><p>将“依据—行动—结果”拆开，把可核验的数据留在句子里。正式规范与写作建议分别标注，不让模型替你做判断。</p><button className="secondary-button" onClick={() => onNavigate('writing')}><Sparkles size={16} />打开写作中心</button></section></div>
    <section className="panel quick-panel"><div className="panel-heading"><div><span className="eyebrow">工作入口</span><h2>继续处理</h2></div></div><div className="quick-actions"><button onClick={() => onNavigate('documents')}><FileText size={18} /><span>登记新文件</span><small>收文、发文、附件</small></button><button onClick={() => onNavigate('writing')}><BookOpen size={18} /><span>开始写作</span><small>模板、规则、版本</small></button><button onClick={() => onNavigate('migration')}><Upload size={18} /><span>导入旧数据</span><small>支持 JSON 导出文件</small></button></div></section>
  </>;
}

function Metric({ label, value, note, accent }: { label: string; value: number; note: string; accent: string }) { return <div className={`metric metric-${accent}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>; }
function StatusPill({ status }: { status: Status }) { const labels: Record<Status, string> = { pending: '未启动', progress: '进行中', done: '已完成', overdue: '已超期' }; return <span className={`status-pill ${status}`}>{labels[status]}</span>; }
function EmptyState({ text }: { text: string }) { return <div className="empty-state"><FolderOpen size={22} /><span>{text}</span></div>; }

function TaskView({ tasks, search, setSearch, attachments, canAttach, onNew, onEdit, onDelete }: { tasks: Task[]; search: string; setSearch: (value: string) => void; attachments: Attachment[]; canAttach: boolean; onNew: () => void; onEdit: (task: Task) => void; onDelete: (id: string) => void }) {
  return <><PageHeading eyebrow="事务管理" title="任务管理" detail="把交办、进度、配合单位和工作小结放在同一条记录里。" action={<button className="primary-button" onClick={onNew}><Plus size={16} />新建任务</button>} /><div className="toolbar"><div className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索任务、类目或交办人" /></div><span className="toolbar-count">{tasks.length} 条任务</span></div><section className="panel table-panel"><div className="table-head task-columns"><span>任务</span><span>来源 / 类目</span><span>截止日期</span><span>状态</span><span /></div>{tasks.map((task) => <div className="table-row task-columns" key={task.id}><div className="row-title"><strong>{task.name}</strong><small>{task.assigner || '未指定交办人'} · {task.workSummary || '尚无工作小结'} · 附件 {task.files.length}</small></div><span className="muted-cell">{task.source || '其他'}<br />{task.category}</span><span className="date-cell">{task.deadline || '—'}</span><StatusPill status={task.status} /><div className="row-actions"><button className="icon-button" title="编辑任务" onClick={() => onEdit(task)}><Pencil size={15} /></button><button className="icon-button danger-icon" title="删除任务" onClick={() => onDelete(task.id)}><X size={15} /></button></div></div>)}{!tasks.length && <EmptyState text="没有匹配的任务" />}</section><AttachmentHint count={attachments.length} canAttach={canAttach} /></>;
}

function DocumentView({ documents, search, setSearch, attachments, canAttach, onNew, onEdit, onDelete }: { documents: OfficialDocument[]; search: string; setSearch: (value: string) => void; attachments: Attachment[]; canAttach: boolean; onNew: () => void; onEdit: (doc: OfficialDocument) => void; onDelete: (id: string) => void }) {
  return <><PageHeading eyebrow="文件台账" title="文件收发" detail="登记文件来源、文号、承办人和关联工作，附件留在本地。" action={<button className="primary-button" onClick={onNew}><Plus size={16} />登记文件</button>} /><div className="toolbar"><div className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索标题、文号或来源单位" /></div><span className="toolbar-count">{documents.length} 份文件</span></div><section className="panel table-panel"><div className="table-head doc-columns"><span>文件标题</span><span>文号 / 类型</span><span>来源单位</span><span>登记状态</span><span /></div>{documents.map((doc) => <div className="table-row doc-columns" key={doc.id}><div className="row-title"><strong>{doc.title}</strong><small>{doc.docDate || '未设日期'} · {doc.securityLevel || '未分级'} · 附件 {doc.files.length}</small></div><span className="muted-cell">{doc.code || '无文号'}<br />{doc.docType}</span><span className="muted-cell">{doc.fromUnit || '未填写'}</span><span className="status-pill neutral">{doc.receiptStatus || '待登记'}</span><div className="row-actions"><button className="icon-button" title="编辑文件" onClick={() => onEdit(doc)}><Pencil size={15} /></button><button className="icon-button danger-icon" title="删除文件" onClick={() => onDelete(doc.id)}><X size={15} /></button></div></div>)}{!documents.length && <EmptyState text="还没有登记文件" />}</section><AttachmentHint count={attachments.length} canAttach={canAttach} /></>;
}

function TaskEditor({ task, attachments, canAttach, onChange, onAttach, onSave, onClose }: { task: Task; attachments: Attachment[]; canAttach: boolean; onChange: (task: Task) => void; onAttach: (files: FileList) => void; onSave: () => void; onClose: () => void }) {
  const update = <K extends keyof Task,>(key: K, value: Task[K]) => onChange({ ...task, [key]: value });
  return <Drawer title={task.name ? '编辑任务' : '新建任务'} onClose={onClose}>
    <Field label="任务名称" value={task.name} onChange={(v) => update('name', v)} placeholder="例如：推进年度重点工作总结" />
    <div className="form-grid"><SelectField label="状态" value={task.status} options={['pending', 'progress', 'done', 'overdue']} onChange={(v) => update('status', v as Status)} /><Field label="截止日期" type="date" value={task.deadline} onChange={(v) => update('deadline', v)} /></div>
    <div className="form-grid"><Field label="工作类目" value={task.category} onChange={(v) => update('category', v)} /><Field label="交办人" value={task.assigner} onChange={(v) => update('assigner', v)} /></div>
    <div className="form-grid"><Field label="任务来源" value={task.source} onChange={(v) => update('source', v)} /><Field label="交办日期" type="date" value={task.assignDate} onChange={(v) => update('assignDate', v)} /></div>
    <PartnerStatusEditor label="配合单位" partners={task.partnerStatus} onChange={(partners) => update('partnerStatus', partners)} />
    <TaskStageEditor stages={task.stages} onChange={(stages) => update('stages', stages)} />
    <TextArea label="工作小结" value={task.workSummary} onChange={(v) => update('workSummary', v)} placeholder="生成周报时可引用" />
    <TextArea label="备注" value={task.remark} onChange={(v) => update('remark', v)} />
    <LegacyPayloadView payload={task.legacyPayload} />
    <AttachmentField ids={task.files} attachments={attachments} canAttach={canAttach} onAttach={onAttach} onRemove={(id) => update('files', task.files.filter((fileId) => fileId !== id))} />
    <div className="drawer-actions"><button className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" onClick={onSave}><Save size={16} />保存任务</button></div>
  </Drawer>;
}

function DocumentEditor({ document, attachments, canAttach, onChange, onAttach, onSave, onClose }: { document: OfficialDocument; attachments: Attachment[]; canAttach: boolean; onChange: (document: OfficialDocument) => void; onAttach: (files: FileList) => void; onSave: () => void; onClose: () => void }) {
  const update = <K extends keyof OfficialDocument,>(key: K, value: OfficialDocument[K]) => onChange({ ...document, [key]: value });
  return <Drawer title={document.title ? '编辑文件' : '登记文件'} onClose={onClose}>
    <Field label="文件标题" value={document.title} onChange={(v) => update('title', v)} placeholder="例如：关于做好年度重点工作的通知" />
    <div className="form-grid"><SelectField label="文件类型" value={document.docType} options={['收文', '发文', '其他']} onChange={(v) => update('docType', v as OfficialDocument['docType'])} /><Field label="成文日期" type="date" value={document.docDate} onChange={(v) => update('docDate', v)} /></div>
    <div className="form-grid"><Field label="发文字号" value={document.code} onChange={(v) => update('code', v)} /><Field label="来源单位" value={document.fromUnit} onChange={(v) => update('fromUnit', v)} /></div>
    <div className="form-grid"><Field label="承办人" value={document.handler} onChange={(v) => update('handler', v)} /><SelectField label="登记状态" value={document.receiptStatus} options={['待登记', '已登记', '已办结', '归档']} onChange={(v) => update('receiptStatus', v)} /></div>
    <div className="form-grid"><Field label="安全级别" value={document.securityLevel} onChange={(v) => update('securityLevel', v)} /><Field label="工作类目" value={document.workCategory} onChange={(v) => update('workCategory', v)} /></div>
    <div className="form-grid"><Field label="文件归类" value={document.fileCategory} onChange={(v) => update('fileCategory', v)} /><Field label="发送范围" value={document.sendScope} onChange={(v) => update('sendScope', v)} /></div>
    <TextArea label="备注" value={document.remark} onChange={(v) => update('remark', v)} />
    <LegacyPayloadView payload={document.legacyPayload} />
    <AttachmentField ids={document.files} attachments={attachments} canAttach={canAttach} onAttach={onAttach} onRemove={(id) => update('files', document.files.filter((fileId) => fileId !== id))} />
    <div className="drawer-actions"><button className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" onClick={onSave}><Save size={16} />保存文件</button></div>
  </Drawer>;
}

const partnerStatuses: PartnerStatus['status'][] = ['notified', 'pending', 'progress', 'done'];
const partnerStatusLabels: Record<PartnerStatus['status'], string> = { notified: '已通知', pending: '待反馈', progress: '进行中', done: '已完成' };

function PartnerStatusEditor({ label, partners, onChange }: { label: string; partners: PartnerStatus[]; onChange: (partners: PartnerStatus[]) => void }) {
  const update = (index: number, patch: Partial<PartnerStatus>) => onChange(partners.map((partner, partnerIndex) => partnerIndex === index ? { ...partner, ...patch } : partner));
  return <section className="form-section">
    <div className="form-section-heading"><span>{label}</span><button type="button" className="text-button" aria-label={`添加${label}`} onClick={() => onChange([...partners, { name: '', status: 'pending', files: [] }])}><Plus size={13} />添加单位</button></div>
    <div className="compact-rows">{partners.map((partner, index) => <div className="compact-row" key={`${label}:${index}`}><input aria-label={`${label}名称 ${index + 1}`} value={partner.name} placeholder="单位名称" onChange={(event) => update(index, { name: event.target.value })} /><select aria-label={`${label}状态 ${index + 1}`} value={partner.status} onChange={(event) => update(index, { status: event.target.value as PartnerStatus['status'] })}>{partnerStatuses.map((status) => <option value={status} key={status}>{partnerStatusLabels[status]}</option>)}</select>{partner.files?.length ? <small>{partner.files.length} 个附件</small> : <span />}<button type="button" className="icon-button danger-icon" title={`删除${label} ${index + 1}`} onClick={() => onChange(partners.filter((_, partnerIndex) => partnerIndex !== index))}><X size={14} /></button></div>)}{!partners.length && <small className="form-empty">尚未添加</small>}</div>
  </section>;
}

function TaskStageEditor({ stages, onChange }: { stages: TaskStage[]; onChange: (stages: TaskStage[]) => void }) {
  const update = (index: number, patch: Partial<TaskStage>) => onChange(stages.map((stage, stageIndex) => stageIndex === index ? { ...stage, ...patch } : stage));
  return <section className="form-section">
    <div className="form-section-heading"><span>任务阶段</span><button type="button" className="text-button" onClick={() => onChange([...stages, { id: createId('stage'), name: '', partnerStatus: [] }])}><Plus size={13} />添加阶段</button></div>
    <div className="stage-list">{stages.map((stage, index) => <div className="stage-editor" key={`${stage.id}:${index}`}><div className="stage-title"><input aria-label={`阶段名称 ${index + 1}`} value={stage.name} placeholder={`阶段 ${index + 1}`} onChange={(event) => update(index, { name: event.target.value })} /><button type="button" className="icon-button danger-icon" title={`删除阶段 ${index + 1}`} onClick={() => onChange(stages.filter((_, stageIndex) => stageIndex !== index))}><X size={14} /></button></div><PartnerStatusEditor label={`阶段 ${index + 1} 配合单位`} partners={stage.partnerStatus} onChange={(partners) => update(index, { partnerStatus: partners })} /></div>)}{!stages.length && <small className="form-empty">尚未设置阶段</small>}</div>
  </section>;
}

function LegacyPayloadView({ payload }: { payload?: Record<string, unknown> }) {
  if (!payload || !Object.keys(payload).length) return null;
  return <details className="legacy-payload"><summary>查看迁移原始字段</summary><pre>{JSON.stringify(payload, null, 2)}</pre></details>;
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside className="drawer"><div className="drawer-header"><h2>{title}</h2><button className="icon-button" title="关闭" onClick={onClose}><X size={18} /></button></div><div className="drawer-body">{children}</div></aside></div>; }
function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) { return <label className="field"><span>{label}</span><input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>; }
function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) { return <label className="field"><span>{label}</span><textarea value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>; }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label className="field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>; }
function AttachmentField({ ids, attachments, canAttach, onAttach, onRemove }: { ids: string[]; attachments: Attachment[]; canAttach: boolean; onAttach: (files: FileList) => void; onRemove: (id: string) => void }) { const selected = ids.map((id) => attachments.find((attachment) => attachment.id === id)).filter((attachment): attachment is Attachment => Boolean(attachment)); return <div className="attachment-field"><div className="attachment-heading"><span>附件</span><small>{canAttach ? '单个文件不超过 8 MB，仅保存在本机' : '公开演示版禁用真实附件'}</small></div>{selected.length > 0 && <div className="attachment-list">{selected.map((attachment) => <div className="attachment-row" key={attachment.id}><FileText size={14} /><span>{attachment.name}</span><small>{formatBytes(attachment.size)}</small><button type="button" className="icon-button" title={`下载附件 ${attachment.name}`} disabled={attachment.data === undefined} onClick={() => downloadStoredAttachment(attachment)}><ArrowDownToLine size={14} /></button><button type="button" className="icon-button danger-icon" title={`解除关联 ${attachment.name}`} onClick={() => onRemove(attachment.id)}><X size={14} /></button></div>)}</div>}<label className={`attachment-picker ${canAttach ? '' : 'disabled'}`}><Upload size={15} /><span>{canAttach ? '选择附件' : '请使用桌面端添加附件'}</span><input type="file" multiple disabled={!canAttach} onChange={(event) => { if (event.target.files?.length) onAttach(event.target.files); event.currentTarget.value = ''; }} /></label></div>; }
function AttachmentHint({ count, canAttach }: { count: number; canAttach: boolean }) { return <div className="attachment-hint"><ShieldCheck size={15} /><span>{canAttach ? `本机附件库 ${count} 项；打开任务或文件编辑器可继续添加。` : '公开 Pages 不保存真实附件；历史导入附件仅保留在本机 IndexedDB。'}</span></div>; }
function bytesToBase64(bytes: Uint8Array) { let binary = ''; for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)); return btoa(binary); }
function formatBytes(size: number) { if (size < 1024) return `${size} B`; if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`; return `${(size / 1024 / 1024).toFixed(1)} MB`; }
function downloadStoredAttachment(attachment: Attachment) { if (attachment.data === undefined) return; const binary = atob(attachment.data); const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); downloadBlob(new Blob([bytes], { type: attachment.mimeType }), attachment.name); }

function WritingStudio({ draft, setDraft, setToast }: { draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>>; setToast: (text: string) => void }) {
  const pack = knowledgePack as KnowledgePack;
  const templates = pack.templates as WritingTemplate[];
  const [templateQuery, setTemplateQuery] = useState('');
  const editor = useEditor({ extensions: [StarterKit, Placeholder.configure({ placeholder: '从第一段开始，把事实、数据和动作写下来……' })], content: draft.contentHtml || `<p>一、基本情况</p><p>围绕年度重点工作，系统梳理工作进展、主要做法和实际成效。</p><p>二、主要做法</p><p>坚持目标导向，细化任务清单，明确责任分工和完成时限。</p><p>三、下一步安排</p><p>持续跟踪重点事项，及时补充数据和佐证材料。</p>`, onUpdate: ({ editor: current }) => setDraft((currentDraft) => ({ ...currentDraft, contentHtml: current.getHTML(), contentText: current.getText(), updatedAt: nowIso() })) });
  useEffect(() => { if (editor && draft.contentHtml && editor.getHTML() !== draft.contentHtml) editor.commands.setContent(draft.contentHtml); }, [editor, draft.contentHtml]);
  const selectedTemplate = templates.find((template) => template.id === draft.templateId) || templates[0];
  const lines = (draft.contentText || editor?.getText() || '').split(/\r?\n/).filter(Boolean);
  const longLines = lines.filter((line) => line.length > 45);
  const visibleTemplates = templates.filter((template) => `${template.name} ${template.documentType}`.toLowerCase().includes(templateQuery.trim().toLowerCase()));
  const saveDraft = async () => { const next = { ...draft, contentHtml: editor?.getHTML() || draft.contentHtml, contentText: editor?.getText() || draft.contentText, updatedAt: nowIso(), version: draft.version + 1 }; await putRecord('draft', next.id, next); setDraft(next); setToast('文稿版本已保存'); };
  const applyTemplate = (template: WritingTemplate) => { const [outlineTitle, ...outlineBody] = template.outline; const title = outlineTitle && outlineTitle !== '标题' ? outlineTitle : template.name; const content = outlineBody.map((item, index) => `${['一', '二', '三', '四', '五'][index] || index + 1}、${item}`).join('\n'); const contentHtml = content.split('\n').map((line) => `<p>${line}</p>`).join(''); editor?.commands.setContent(contentHtml); setDraft((currentDraft) => ({ ...currentDraft, title, documentType: template.documentType, templateId: template.id, contentHtml, contentText: content })); };
  const downloadWord = async () => { const next = { ...draft, contentText: editor?.getText() || draft.contentText, contentHtml: editor?.getHTML() || draft.contentHtml }; downloadBlob(await exportDraftDocx(next), `${next.title || '公文文稿'}.docx`); setToast('DOCX 已生成'); };
  const downloadPdf = async () => { const next = { ...draft, contentText: editor?.getText() || draft.contentText, contentHtml: editor?.getHTML() || draft.contentHtml }; const printable = buildPrintableDocument(next); const handled = await (window as HxWindow).hxhwang?.printPdf(printable, next.title || '公文文稿'); if (!handled) { document.body.classList.add('printing-draft'); window.print(); window.setTimeout(() => document.body.classList.remove('printing-draft'), 500); } };
  const sourceLabel = (sourceId: string) => { const source = pack.sources.find((item) => item.id === sourceId); const kinds: Record<string, string> = { 'official-standard': '官方规范', 'unit-template': '单位模板', 'licensed-material': '授权教材建议' }; return { title: source?.title || sourceId, kind: kinds[source?.kind || ''] || source?.kind || '未知来源', version: source?.version || '未标版本' }; };
  const severityLabel: Record<string, string> = { advisory: '建议', warning: '警告', error: '确定性规则' };
  return <>
    <PageHeading
      eyebrow="写作中心"
      title="公文写作"
      detail="模板负责结构，规则负责提醒，事实仍由你确认。"
      action={<div className="button-row"><button className="secondary-button" onClick={() => void saveDraft()}><Save size={16} />保存版本</button><button className="primary-button" onClick={() => void downloadWord()}><ArrowDownToLine size={16} />导出 DOCX</button><button className="secondary-button" onClick={() => void downloadPdf()}><FileOutput size={16} />导出 PDF</button></div>}
    />
    <div className="writing-layout">
      <aside className="writing-sidebar panel">
        <div className="panel-heading"><div><span className="eyebrow">模板</span><h2>结构选择</h2></div></div>
        <label className="template-search">
          <Search size={15} />
          <input aria-label="搜索写作模板" value={templateQuery} onChange={(event) => setTemplateQuery(event.target.value)} placeholder="搜索文种或模板" />
        </label>
        <div className="template-list">
          {visibleTemplates.map((template) => {
            const source = sourceLabel(template.sourceId || 'unit-template-demo');
            return <button className={`template-option ${selectedTemplate?.id === template.id ? 'selected' : ''}`} key={template.id} onClick={() => applyTemplate(template)}><span>{template.name}</span><small>{source.kind} · {template.sourceVersion || source.version}</small></button>;
          })}
          {!visibleTemplates.length && <div className="template-empty">未找到匹配模板</div>}
        </div>
        <div className="source-note"><ShieldCheck size={15} /><span>规则包 v{pack.version}<br />来源已标注，未启用联网 AI。</span></div>
      </aside>
      <section className="editor-panel panel">
        <div className="editor-toolbar"><div className="editor-mode"><span className="mode-dot" />离线编辑</div><div className="toolbar-hint">第 {draft.version} 个版本 · {draft.updatedAt.slice(0, 10)}</div></div>
        <div className="editor-paper"><input className="draft-title-input" aria-label="文稿标题" value={draft.title} onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, title: event.target.value, updatedAt: nowIso() }))} placeholder="请输入文稿标题" /><EditorContent editor={editor} /></div>
      </section>
      <aside className="writing-sidebar panel">
        <div className="panel-heading"><div><span className="eyebrow">校核提醒</span><h2>落笔检查</h2></div></div>
        <div className="check-list"><CheckItem ok={Boolean(draft.title)} title="文稿标题" detail={draft.title || '请先确定标题'} /><CheckItem ok={lines.length >= 3} title="结构完整" detail={`${lines.length} 行有效内容`} /><CheckItem ok={longLines.length === 0} title="句子节奏" detail={longLines.length ? `${longLines.length} 行超过建议长度` : '未发现过长句'} /><CheckItem ok={Boolean(draft.contentText)} title="事实待核" detail="数据、时间和单位需人工确认" /></div>
        <div className="advice-list">{pack.rules.map((rule) => { const source = sourceLabel(rule.sourceId); return <div className="advice" key={rule.id}><span className={`advice-level ${rule.severity}`} /> <div><strong>{rule.title}</strong><p>{rule.description}</p><small>{source.kind} · {source.title}<br />版本：{rule.sourceVersion || source.version} · 严重程度：{severityLabel[rule.severity]}</small></div></div>; })}</div>
        <div className="ai-disabled"><CloudOff size={15} /><span>公开演示版未连接 AI 网关</span></div>
      </aside>
    </div>
    <div className="print-only"><h1>{draft.title}</h1><div>{draftBodyLines(draft).map((line, index) => <p key={`${index}:${line}`}>{line}</p>)}</div></div>
  </>;
}

function CheckItem({ ok, title, detail }: { ok: boolean; title: string; detail: string }) { return <div className="check-item"><span className={`check-icon ${ok ? 'ok' : 'pending'}`}>{ok ? <Check size={13} /> : '!'}</span><div><strong>{title}</strong><small>{detail}</small></div></div>; }

function localDateInput(date: Date) { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; }
function defaultWeekRange() { const end = new Date(); const start = new Date(end); start.setDate(end.getDate() - ((end.getDay() + 6) % 7)); return { startDate: localDateInput(start), endDate: localDateInput(end) }; }
function composeWeeklyReport(tasks: Task[], documents: OfficialDocument[], startDate: string, endDate: string): WeeklyReport {
  const summary = buildWeeklyReportSummary(tasks, documents, startDate, endDate);
  return { id: '', title: `工作周报（${startDate}至${endDate}）`, startDate, endDate, contentText: summary.contentText, taskIds: summary.taskIds, documentIds: summary.documentIds, version: 0, createdAt: '', updatedAt: nowIso() };
}
function weeklyAsDraft(report: WeeklyReport): Draft { return { id: `draft:${report.id || 'weekly'}`, title: report.title, documentType: '工作周报', contentHtml: '', contentText: report.contentText, templateId: 'weekly-report', version: report.version, updatedAt: report.updatedAt }; }

function WeeklyView({ tasks, documents, reports, onSave, onDelete, setToast }: { tasks: Task[]; documents: OfficialDocument[]; reports: WeeklyReport[]; onSave: (report: WeeklyReport) => Promise<WeeklyReport>; onDelete: (id: string) => Promise<void>; setToast: (text: string) => void }) {
  const initialRange = useMemo(defaultWeekRange, []);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const current = report ?? composeWeeklyReport(tasks, documents, initialRange.startDate, initialRange.endDate);
  const update = <K extends keyof WeeklyReport,>(key: K, value: WeeklyReport[K]) => setReport({ ...current, [key]: value, updatedAt: nowIso() });
  const regenerate = () => { try { setReport({ ...composeWeeklyReport(tasks, documents, current.startDate, current.endDate), id: current.id, createdAt: current.createdAt, version: current.version }); setToast('已按日期重新汇总'); } catch (error) { setToast(error instanceof Error ? error.message : '周报生成失败'); } };
  const save = async () => { try { setReport(await onSave(current)); } catch (error) { setToast(error instanceof Error ? error.message : '周报保存失败'); } };
  const remove = async (id: string) => { await onDelete(id); if (current.id === id) setReport(null); };
  const downloadWord = async () => { downloadBlob(await exportDraftDocx(weeklyAsDraft(current)), `${current.title || '工作周报'}.docx`); setToast('周报 DOCX 已生成'); };
  const downloadPdf = async () => { const printable = buildPrintableDocument(weeklyAsDraft(current)); const handled = await desktopBridge()?.printPdf(printable, current.title || '工作周报'); if (!handled) { document.body.classList.add('printing-draft'); window.print(); window.setTimeout(() => document.body.classList.remove('printing-draft'), 500); } };
  return <>
    <PageHeading eyebrow="阶段汇总" title="周报生成" detail="按日期汇总本地任务和文件，保存后可继续编辑和导出。" action={<div className="button-row"><button className="secondary-button" onClick={() => setReport(null)}><Plus size={16} />新建</button><button className="secondary-button" onClick={() => void save()}><Save size={16} />保存版本</button><button className="primary-button" onClick={() => void downloadWord()}><ArrowDownToLine size={16} />导出 DOCX</button><button className="secondary-button" onClick={() => void downloadPdf()}><FileOutput size={16} />导出 PDF</button></div>} />
    <div className="weekly-layout">
      <aside className="panel weekly-controls">
        <div className="panel-heading"><div><span className="eyebrow">素材范围</span><h2>汇总设置</h2></div></div>
        <div className="weekly-control-body"><Field label="开始日期" type="date" value={current.startDate} onChange={(value) => update('startDate', value)} /><Field label="结束日期" type="date" value={current.endDate} onChange={(value) => update('endDate', value)} /><button className="primary-button weekly-generate" onClick={regenerate}><RefreshCw size={15} />重新汇总</button><div className="weekly-source-count"><span>任务素材</span><strong>{current.taskIds.length}</strong><span>文件素材</span><strong>{current.documentIds.length}</strong></div></div>
        <div className="weekly-history-heading"><span>已保存周报</span><small>{reports.length} 份</small></div>
        <div className="weekly-history">{[...reports].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).map((saved) => <div className={`weekly-history-row ${saved.id === current.id ? 'selected' : ''}`} key={saved.id}><button className="weekly-history-open" onClick={() => setReport(saved)}><strong>{saved.title}</strong><small>{saved.startDate} 至 {saved.endDate} · v{saved.version}</small></button><button className="icon-button danger-icon" title={`删除周报 ${saved.title}`} onClick={() => void remove(saved.id)}><X size={14} /></button></div>)}{!reports.length && <small className="form-empty weekly-empty">暂无已保存周报</small>}</div>
      </aside>
      <section className="panel weekly-editor-panel">
        <div className="weekly-editor-toolbar"><span>{current.id ? `已保存版本 v${current.version}` : '未保存草稿'}</span><button className="text-button" onClick={() => { void navigator.clipboard?.writeText(current.contentText); setToast('周报正文已复制'); }}><ClipboardList size={14} />复制正文</button></div>
        <div className="weekly-paper"><textarea className="draft-title-input weekly-title-input" rows={1} aria-label="周报标题" value={current.title} onChange={(event) => update('title', event.target.value)} /><textarea aria-label="周报正文" value={current.contentText} onChange={(event) => update('contentText', event.target.value)} /></div>
      </section>
    </div>
    <div className="print-only"><h1>{current.title}</h1><div>{splitWeeklyLines(current.contentText).map((line, index) => <p key={`${index}:${line}`}>{line}</p>)}</div></div>
  </>;
}
function splitWeeklyLines(content: string) { return content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean); }
function ArchiveView({ archives, settings, attachments }: { archives: ArchiveRecord[]; settings: Array<Record<string, unknown>>; attachments: Attachment[] }) {
  return <><PageHeading eyebrow="历史保留" title="历史档案" detail="旧版本的会议、外出、用章、物资、周报、Skill 和配置只读保留。" /><section className="panel table-panel"><div className="table-head archive-columns"><span>类型</span><span>记录标题</span><span>日期</span><span>来源版本</span></div>{archives.map((record) => { const linkedAttachments = record.files.map((id) => attachments.find((attachment) => attachment.id === id)).filter((attachment): attachment is Attachment => Boolean(attachment)); return <div className="table-row archive-columns" key={record.id}><span className="archive-type">{record.type}</span><div className="row-title"><strong>{record.title}</strong><small>{record.summary || '无摘要'}</small>{linkedAttachments.length > 0 && <div className="archive-attachments">{linkedAttachments.map((attachment) => { const available = attachment.data !== undefined && Boolean(attachment.sha256); return <button key={attachment.id} aria-label={`下载附件 ${attachment.name}`} title={available ? '下载本地附件' : '附件内容不可用'} disabled={!available} onClick={() => downloadStoredAttachment(attachment)}><ArrowDownToLine size={13} /><span>{attachment.name}</span></button>; })}</div>}<LegacyPayloadView payload={record.legacyPayload} /></div><span className="muted-cell">{record.date || '—'}</span><span className="muted-cell">{record.sourceVersion}</span></div>; })}{!archives.length && <EmptyState text="暂无历史业务档案，可从数据迁移导入" />}</section>
    <section className="panel legacy-settings-panel"><div className="panel-heading"><div><span className="eyebrow">只读保留</span><h2>历史 Skill 与配置</h2></div><span className="toolbar-count">{settings.length} 项</span></div><div className="legacy-setting-list">{settings.map((setting, index) => { const skill = setting.type === 'legacy-skill'; const title = String(skill ? setting.name || setting.id || '未命名 Skill' : setting.id || '未命名配置'); const content = skill ? String(setting.content || '') : stringifyLegacyValue(setting.value); return <details className="legacy-setting" key={`${title}:${index}`}><summary><span>{skill ? 'Skill' : '配置'}</span><strong>{title}</strong><small>{String(setting.sourceVersion || '未标来源')}</small></summary><pre>{content}</pre>{skill && Boolean(setting.legacyPayload) && <pre>{JSON.stringify(setting.legacyPayload, null, 2)}</pre>}</details>; })}{!settings.length && <EmptyState text="暂无历史 Skill 或配置" />}</div></section>
  </>;
}
function stringifyLegacyValue(value: unknown) { if (typeof value === 'string') return value; const serialized = JSON.stringify(value, null, 2); return serialized === undefined ? String(value) : serialized; }

function MigrationView({ canImport, onImport, onRestore, onReload, setToast }: {
  canImport: boolean;
  onImport: (bundle: MigrationBundle) => Promise<MigrationReport>;
  onRestore: (snapshot: unknown) => Promise<MigrationReport>;
  onReload: () => Promise<void>;
  setToast: (text: string) => void;
}) {
  const [report, setReport] = useState<MigrationReport | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const importFile = async (file?: File) => {
    if (!file) return;
    if (!canImport) return setToast('公开演示版不导入真实业务数据，请使用桌面端或内网 Web');
    try {
      const parsed = JSON.parse(await file.text()) as { format?: string };
      if (parsed.format === 'hxhwang-gw-local-v1') {
        setReport(await onRestore(parsed));
        setToast('本地快照恢复完成');
      } else {
        setReport(await onImport(await migrateLegacyExport(parsed)));
        setToast('历史数据导入完成');
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : '导入失败');
    }
  };
  const exportSnapshot = async () => {
    const data = await exportLocalSnapshot();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `hxhwang-gw-本地快照-${new Date().toISOString().slice(0, 10)}.json`);
    setSnapshot('已导出当前本地快照');
  };
  return <>
    <PageHeading eyebrow="数据边界" title="数据迁移" detail={canImport ? '旧版导出和本地快照都只在本机解析，不会上传或清空现有数据。' : '公开演示版只提供样例和快照导出；真实数据导入请使用桌面端或内网 Web。'} />
    <div className="migration-grid">
      <section className="panel migration-card">
        <div className="migration-icon"><Upload size={22} /></div>
        <h2>导入 JSON / 快照</h2>
        <p>{canImport ? '自动识别两版历史导出与 HxHwang Gw 本地快照；同 ID 记录以导入内容更新。' : 'Pages 不接收真实业务 JSON、附件或快照恢复。'}</p>
        <label className={`file-drop ${canImport ? '' : 'disabled'}`}><input type="file" accept="application/json,.json" disabled={!canImport} onChange={(event) => void importFile(event.target.files?.[0])} /><span>{canImport ? '选择 JSON 文件' : '公开演示版已禁用导入'}</span><small>{canImport ? '数据只在本机解析' : '请使用桌面端或内网 Web'}</small></label>
      </section>
      <section className="panel migration-card">
        <div className="migration-icon"><FileArchive size={22} /></div>
        <h2>导出本地快照</h2>
        <p>将任务、文件、草稿、周报、历史档案和附件导出为可恢复快照。</p>
        <button className="secondary-button" onClick={() => void exportSnapshot()}><ArrowDownToLine size={16} />导出快照</button>
        {snapshot && <small className="success-text">{snapshot}</small>}
      </section>
    </div>
    {report && <section className="panel report-panel"><div className="panel-heading"><div><span className="eyebrow">迁移报告</span><h2>{report.sourceVersion}</h2></div><button className="icon-button" title="刷新数据" onClick={() => void onReload()}><RefreshCw size={16} /></button></div><div className="report-metrics">{Object.entries(report.imported).map(([key, value]) => <div key={key}><strong>{value}</strong><span>{key}</span></div>)}<div><strong>{report.attachments}</strong><span>附件</span></div></div>{report.warnings.map((warning) => <p className="warning-line" key={warning}>! {warning}</p>)}</section>}
  </>;
}

function AboutView({ desktop, privateServices, tasks, documents, weeklyReports, attachments, draft, onReload, setToast }: { desktop: boolean; privateServices: boolean; tasks: Task[]; documents: OfficialDocument[]; weeklyReports: WeeklyReport[]; attachments: Attachment[]; draft: Draft; onReload: () => Promise<void>; setToast: (text: string) => void }) {
  const [baseUrl, setBaseUrl] = useState('http://127.0.0.1:8787');
  const [accessCode, setAccessCode] = useState('');
  const [client, setClient] = useState<PrivateSyncClient | null>(null);
  const [redactionSource, setRedactionSource] = useState(draft.contentText);
  const [redactedContent, setRedactedContent] = useState('');
  const [purpose, setPurpose] = useState('起草提纲');
  const [aiResult, setAiResult] = useState('');
  const connect = async () => {
    try {
      const { PrivateSyncClient } = await import('@hxhwang/sync-client');
      const next = new PrivateSyncClient({ baseUrl });
      await next.createSession(accessCode);
      setClient(next);
      setAccessCode('');
      setToast('内网会话已建立，访问码未保存');
    } catch (error) { setToast(error instanceof Error ? error.message : '连接失败'); }
  };
  const sync = async () => {
    if (!client) return setToast('请先建立内网会话');
    try {
      const result = await syncPrivateWorkspace(client, { tasks, documents, drafts: [draft], weeklyReports, attachments });
      await onReload();
      setToast(`同步完成：拉取 ${result.pulled}，推送 ${result.pushed}，冲突 ${result.conflicts}，附件上传 ${result.attachmentsUploaded}`);
    } catch (error) { setToast(error instanceof Error ? error.message : '同步失败'); }
  };
  const previewRedaction = () => {
    if (!redactionSource.trim()) return setToast('请先填写待处理材料');
    setRedactedContent(redactSensitiveContent(redactionSource));
    setAiResult('');
  };
  const sendAi = async () => {
    if (!client) return setToast('请先建立内网会话');
    if (!redactedContent) return setToast('请先生成并检查脱敏预览');
    try {
      const response = await client.generate({ redactedContent, redacted: true, confirmed: true, purpose });
      setAiResult(JSON.stringify(response.result, null, 2));
      setToast('AI 结果已返回；原稿未被覆盖');
    } catch (error) { setToast(error instanceof Error ? error.message : 'AI 请求失败'); }
  };
  return <><PageHeading eyebrow="系统信息" title="关于 HxHwang Gw" detail="一个面向公文事务和写作工作的本地优先工作台。" /><section className="about-grid"><div className="panel about-hero"><img className="about-mark" src={brandIconUrl} alt="" aria-hidden="true" /><span className="eyebrow">HxHwang Gw · v{__APP_VERSION__}</span><h2>让材料有来源，让事项有去处。</h2><p>公开演示版不请求后端、不保存云端数据、不连接 AI。桌面端或内网 Web 可在下方明确配置后启用私有同步与 AI 网关。</p><div className="about-links"><a href="mailto:Rays688888@Gmail.com"><Info size={15} />Rays688888@Gmail.com</a><a href="https://nextweb4.github.io/" target="_blank" rel="noreferrer"><BookOpen size={15} />nextweb4.github.io</a></div></div><div className="panel about-list"><div><span>作者</span><strong>HaoXiangHwang</strong></div><div><span>版本</span><strong>{__APP_VERSION__}</strong></div><div><span>构建时间</span><strong>{new Date(__BUILD_TIME__).toLocaleString('zh-CN')}</strong></div><div><span>运行模式</span><strong>{desktop ? '桌面本地模式' : privateServices ? '内网 Web 模式' : 'Pages 本地演示模式'}</strong></div><div><span>数据位置</span><strong>浏览器 IndexedDB</strong></div><div><span>已保存周报</span><strong>{weeklyReports.length}</strong></div><div><span>项目许可</span><strong>保留全部权利</strong></div><div><span>版权</span><strong>Copyright (c) 2026 HaoXiangHwang</strong></div><div><span>规则包</span><strong>v{(knowledgePack as KnowledgePack).version} · 来源已标注</strong></div></div></section>{privateServices && <section className="desktop-services"><div className="panel service-panel"><div className="panel-heading"><div><span className="eyebrow">可选内网能力</span><h2>同步连接</h2></div><span className={`status-pill ${client ? 'done' : 'pending'}`}>{client ? '已连接' : '未连接'}</span></div><Field label="私有 API 地址" value={baseUrl} onChange={setBaseUrl} placeholder="https://intranet.example/api" /><Field label="一次性访问码" type="password" value={accessCode} onChange={setAccessCode} /><div className="button-row"><button className="secondary-button" onClick={() => void connect()}><ShieldCheck size={16} />建立会话</button><button className="primary-button" disabled={!client} onClick={() => void sync()}><RefreshCw size={16} />同步业务数据</button></div><p className="service-note">访问码仅用于建立本次内存会话，不写入 IndexedDB。任务、文件、文稿和周报只在手动触发时同步，冲突不会被静默覆盖。</p></div><div className="panel service-panel"><div className="panel-heading"><div><span className="eyebrow">逐次确认</span><h2>脱敏 AI 网关</h2></div></div><Field label="用途" value={purpose} onChange={setPurpose} /><TextArea label="待处理材料" value={redactionSource} onChange={setRedactionSource} placeholder="粘贴待脱敏材料" /><button className="secondary-button" onClick={previewRedaction}><ShieldCheck size={16} />生成脱敏预览</button>{redactedContent && <><TextArea label="脱敏预览（可继续修改）" value={redactedContent} onChange={setRedactedContent} /><button className="primary-button" disabled={!client} onClick={() => void sendAi()}><Sparkles size={16} />确认本次发送</button></>}{aiResult && <pre className="ai-result">{aiResult}</pre>}<p className="service-note">每次请求都必须先生成并检查脱敏预览；结果只读展示，不覆盖原稿或确定性格式规则。</p></div></section>}</>;
}

export default App;
