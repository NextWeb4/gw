import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Activity, AlertTriangle, Archive, ArrowDownToLine, ArrowUpRight, BarChart3, BookOpen, CalendarDays, Check, ChevronRight, ClipboardList,
  Bot, Building2, FileArchive, FileOutput, FileText, FileUp, FolderOpen, Globe2, Info, KeyRound, LayoutDashboard, Library, MapPin,
  Menu, Orbit, Package, PanelLeftClose, PanelLeftOpen, Pencil, Plus, RefreshCw, Save, Search, Server, ShieldCheck, Sparkles, Stamp, Upload, UsersRound, WandSparkles, X
} from 'lucide-react';
import {
  buildWeeklyReportSummary, buildWorkStatistics, calculateMaterialStock, createId, DEFAULT_WEEKLY_TEMPLATE, extractTaskFromText,
  extractWeeklyTemplateFromSample, listStatisticsMonths, mergePartnerGroupMembers, nowIso, parseWeeklyTemplate, resolveCategoryTint,
  weeklySectionSourceLabels,
  type AiFieldChange, type AiGuidancePreset, type AiHistoryEntry, type AiSkill, type ArchiveRecord, type Attachment, type CategoryStyle, type CategoryTint, type Draft, type KnowledgePack, type MaterialRecord, type PartnerGroup,
  type MeetingRecord, type MigrationReport, generateTaskWorkSummary, isValidIsoDate, isValidIsoDateTime, mergeContactDirectory, statusLabels,
  type ContactDirectory, type CustomWritingTemplate, type OfficialDocument, type PartnerStatus, type ResearchDirection, type ResearchRecord,
  type SealRecord, type Status, type Task, type TaskStage, type WeeklyReport, type WeeklySectionSource, type WeeklyTemplate,
  type WeeklyTemplateSection, type WorkStatisticsInput, type WorkSummaryTemplateId, type WritingTemplate,
  workSummaryTemplateLabels
} from '@hxhwang/domain';
import {
  attachmentIdsFromPayload, exportLocalSnapshot, getRecord, importLocalSnapshot, listRecords, putRecord, removeAttachmentsIfUnreferenced,
  removeRecord, seedDemoData, type Kind
} from '@hxhwang/local-data';
import { migrateLegacyExport, type MigrationBundle } from '@hxhwang/migration';
import { AI_MAX_CONTENT_LENGTH, AI_MAX_GUIDANCE_LENGTH, AI_PROVIDER_PRESETS, DirectAiClient, extractOpenAiText, PrivateSyncClient, RelayAiClient, type RelayProviderDescriptor } from '@hxhwang/sync-client';
import { redactSensitiveContent } from '@hxhwang/sync-client/redaction';
import { buildPrintableDocument, downloadBlob, draftBodyLines, exportDraftDocx } from '@hxhwang/documents';
import knowledgePack from '../../../content/generated/knowledge-pack.json';
import guidancePresetData from '../../../content/generated/ai-guidance-presets.json';
import { importWritingDocument } from './document-import';
import { syncPrivateWorkspace } from './private-services';
import { GlobalSearch, type GlobalSearchGroup, type GlobalSearchItem } from './GlobalSearch';

type Tab = 'dashboard' | 'tasks' | 'meetings' | 'documents' | 'researches' | 'seals' | 'materials' | 'directory' | 'writing' | 'weekly' | 'stats' | 'ai' | 'archive' | 'migration' | 'about';
type BusinessTab = Extract<Tab, 'tasks' | 'meetings' | 'documents' | 'researches' | 'seals' | 'materials'>;
type BusinessDetail =
  | { kind: 'task'; record: Task }
  | { kind: 'meeting'; record: MeetingRecord }
  | { kind: 'document'; record: OfficialDocument }
  | { kind: 'research'; record: ResearchRecord }
  | { kind: 'seal'; record: SealRecord }
  | { kind: 'material'; record: MaterialRecord };
interface AiChangeContext { targetLabel: string; fields: Array<{ field: string; label: string; before: string }>; }
interface AiPrefill { source: string; purpose: string; custom?: string; changeContext?: AiChangeContext; nonce: number; }
type AiAssistRequest = { source?: string; purpose?: string; custom?: string; changeContext?: AiChangeContext };
type HxWindow = Window & { hxhwang?: {
  printPdf: (html: string, title: string) => Promise<boolean>;
  listAiModels: (baseUrl: string, apiKey: string) => Promise<string[]>;
  generateAi: (payload: { baseUrl: string; apiKey: string; model: string; redactedContent: string; redacted: true; confirmed: true; purpose: string; guidance?: string }) => Promise<unknown>;
} };
const desktopBridge = () => (window as HxWindow).hxhwang;
const distributionMode = __DISTRIBUTION_MODE__;
const emptyDirectory = (): ContactDirectory => ({ people: [], units: [], updatedAt: nowIso() });

const navItems: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: '工作台', icon: LayoutDashboard },
  { id: 'tasks', label: '任务管理', icon: ClipboardList },
  { id: 'meetings', label: '会议管理', icon: CalendarDays },
  { id: 'documents', label: '文件收发', icon: FileText },
  { id: 'researches', label: '外出活动', icon: MapPin },
  { id: 'seals', label: '用章管理', icon: Stamp },
  { id: 'materials', label: '物资收发', icon: Package },
  { id: 'directory', label: '常用项管理', icon: UsersRound },
  { id: 'writing', label: '公文写作', icon: Pencil },
  { id: 'weekly', label: '周报生成', icon: FileOutput },
  { id: 'stats', label: '统计分析', icon: BarChart3 },
  { id: 'ai', label: 'AI 助手', icon: Sparkles },
  { id: 'archive', label: '历史档案', icon: Archive },
  { id: 'migration', label: '数据迁移', icon: RefreshCw }
];
const aboutNavItem: { id: Tab; label: string; icon: typeof LayoutDashboard } = { id: 'about', label: '关于与设置', icon: Info };
const globalNavItems = [...navItems, aboutNavItem];

const emptyTask = (): Task => ({
  id: createId('task'), name: '', category: '日常工作', source: '其他', assigner: '', assignDate: localDateInput(new Date()),
  deadline: '', status: 'pending', partnerStatus: [], stages: [], remark: '', workSummary: '', files: [], createdAt: nowIso(), updatedAt: nowIso()
});

const emptyDocument = (): OfficialDocument => ({
  id: createId('doc'), title: '', code: '', docType: '收文', docDate: localDateInput(new Date()), securityLevel: '公开',
  fromUnit: '', fileCategory: '', workCategory: '', handler: '', sendScope: '', receiptStatus: '待登记', remark: '', files: [], createdAt: nowIso(), updatedAt: nowIso()
});

const emptyMeeting = (): MeetingRecord => ({
  id: createId('meeting'), subject: '', sendTo: '', receiver: '', notifyTime: localDateInput(new Date()), meetingTime: '',
  location: '', remark: '', files: [], createdAt: nowIso(), updatedAt: nowIso()
});

const emptyResearch = (): ResearchRecord => ({
  id: createId('research'), researchTime: localDateInput(new Date()), direction: '外出调研', subject: '', location: '', useCar: '',
  participants: '', summary: '', achievements: '', remark: '', files: [], createdAt: nowIso(), updatedAt: nowIso()
});

const emptySeal = (): SealRecord => ({
  id: createId('seal'), sealTime: localDateInput(new Date()), userName: '', approver: '', docName: '', docType: '', remark: '', files: [],
  createdAt: nowIso(), updatedAt: nowIso()
});

const emptyMaterial = (): MaterialRecord => ({
  id: createId('material'), materialName: '', spec: '', quantity: 1, type: 'in', handlerTime: localDateInput(new Date()), handler: '',
  fromUnit: '', remark: '', files: [], createdAt: nowIso(), updatedAt: nowIso()
});

const legacyText = (payload: Record<string, unknown>, key: string) => typeof payload[key] === 'string' ? payload[key] as string : '';
const normalizedLegacyDate = (value: string) => {
  const candidate = value.slice(0, 10);
  return isValidIsoDate(candidate, false) ? candidate : '';
};
const normalizedLegacyDateTime = (value: string) => {
  const candidate = value.trim().replace(' ', 'T').slice(0, 16);
  return isValidIsoDateTime(candidate, false) ? candidate : '';
};

function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedBusinessRecord, setSelectedBusinessRecord] = useState<{ tab: BusinessTab; id: string } | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [documents, setDocuments] = useState<OfficialDocument[]>([]);
  const [researches, setResearches] = useState<ResearchRecord[]>([]);
  const [seals, setSeals] = useState<SealRecord[]>([]);
  const [materials, setMaterials] = useState<MaterialRecord[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [archives, setArchives] = useState<ArchiveRecord[]>([]);
  const [legacySettings, setLegacySettings] = useState<Array<Record<string, unknown>>>([]);
  const [directory, setDirectory] = useState<ContactDirectory>(emptyDirectory);
  const [customTemplates, setCustomTemplates] = useState<CustomWritingTemplate[]>([]);
  const [aiSkills, setAiSkills] = useState<AiSkill[]>([]);
  const [aiHistory, setAiHistory] = useState<AiHistoryEntry[]>([]);
  const [weeklyTemplates, setWeeklyTemplates] = useState<WeeklyTemplate[]>([]);
  const [partnerGroups, setPartnerGroups] = useState<PartnerGroup[]>([]);
  const [categoryStyles, setCategoryStyles] = useState<CategoryStyle[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [pendingAttachmentJobs, setPendingAttachmentJobs] = useState(0);
  const [draft, setDraft] = useState<Draft>({ id: 'draft_main', title: '工作总结', documentType: '工作总结', contentHtml: '', contentText: '', templateId: 'work-summary', version: 1, updatedAt: nowIso() });
  const [search, setSearch] = useState('');
  const [taskEditor, setTaskEditor] = useState<Task | null>(null);
  const [meetingEditor, setMeetingEditor] = useState<MeetingRecord | null>(null);
  const [documentEditor, setDocumentEditor] = useState<OfficialDocument | null>(null);
  const [researchEditor, setResearchEditor] = useState<ResearchRecord | null>(null);
  const [sealEditor, setSealEditor] = useState<SealRecord | null>(null);
  const [materialEditor, setMaterialEditor] = useState<MaterialRecord | null>(null);
  const [toast, setToastState] = useState({ text: '', key: 0 });
  // 带自增 key：同文案连续提示也会重置定时器并重新渲染，不会被相同 state 合并吞掉
  const setToast = (text: string) => setToastState((prev) => ({ text, key: prev.key + 1 }));
  const [aiPrefill, setAiPrefill] = useState<AiPrefill | null>(null);
  const [aiOverlayOpen, setAiOverlayOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const directoryRef = useRef<ContactDirectory>(emptyDirectory());
  const directoryWriteQueue = useRef<Promise<void>>(Promise.resolve());
  const pendingAttachmentsRef = useRef<Attachment[]>([]);
  const pendingAttachmentSessionRef = useRef(0);
  const mainAreaRef = useRef<HTMLElement>(null);
  const primaryContentRef = useRef<HTMLDivElement>(null);
  const businessDetailRef = useRef<HTMLElement>(null);
  const globalSearchTriggerRef = useRef<HTMLButtonElement>(null);
  const globalSearchReturnFocusRef = useRef<HTMLElement | null>(null);
  const isDesktop = Boolean(desktopBridge());
  const globalSearchBlocked = Boolean(taskEditor || meetingEditor || documentEditor || researchEditor || sealEditor || materialEditor || aiOverlayOpen);
  const changeGlobalSearchOpen = (open: boolean) => {
    if (open) {
      if (globalSearchBlocked) return;
      globalSearchReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : globalSearchTriggerRef.current;
      setGlobalSearchOpen(true);
      return;
    }
    setGlobalSearchOpen(false);
    const focusTarget = globalSearchReturnFocusRef.current?.isConnected ? globalSearchReturnFocusRef.current : globalSearchTriggerRef.current;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => focusTarget?.focus()));
  };

  const reload = async () => {
    if (__SEED_DEMO_DATA__) await seedDemoData();
    const [taskRows, meetingRows, documentRows, researchRows, sealRows, materialRows, reportRows, archiveRows, settings, attachmentRows] = await Promise.all([
      listRecords<Task>('task'), listRecords<MeetingRecord>('meeting'), listRecords<OfficialDocument>('document'), listRecords<ResearchRecord>('research'),
      listRecords<SealRecord>('seal'), listRecords<MaterialRecord>('material'), listRecords<WeeklyReport>('weekly'), listRecords<ArchiveRecord>('archive'),
      listRecords<Record<string, unknown>>('setting'), listRecords<Attachment>('attachment')
    ]);
    setTasks(taskRows); setMeetings(meetingRows); setDocuments(documentRows); setResearches(researchRows); setSeals(sealRows); setMaterials(materialRows);
    setWeeklyReports(reportRows); setArchives(archiveRows); setAttachments(attachmentRows);
    const directorySetting = settings.find((setting) => setting.type === 'contact-directory') as (ContactDirectory & { type: string }) | undefined;
    const legacyAssigners = settings.flatMap((setting) => setting.id === 'work_assigners' && Array.isArray(setting.value) ? setting.value.filter((value): value is string => typeof value === 'string') : []);
    const participantNames = researchRows.flatMap((research) => research.participants.split(/[、，,;；\n]/));
    const derivedPeople = [
      ...taskRows.map((task) => task.assigner), ...documentRows.map((document) => document.handler), ...meetingRows.map((meeting) => meeting.receiver),
      ...participantNames, ...sealRows.flatMap((seal) => [seal.userName, seal.approver]), ...materialRows.map((material) => material.handler), ...legacyAssigners
    ];
    const derivedUnits = [
      ...documentRows.map((document) => document.fromUnit), ...meetingRows.map((meeting) => meeting.sendTo), ...materialRows.map((material) => material.fromUnit),
      ...taskRows.flatMap((task) => [...task.partnerStatus.map((partner) => partner.name), ...task.stages.flatMap((stage) => stage.partnerStatus.map((partner) => partner.name))])
    ];
    const stored = directorySetting ? { people: directorySetting.people || [], units: directorySetting.units || [], updatedAt: directorySetting.updatedAt || nowIso() } : undefined;
    const nextDirectory = stored
      ? mergeContactDirectory(emptyDirectory(), stored.people, stored.units, stored.updatedAt)
      : mergeContactDirectory(emptyDirectory(), derivedPeople, derivedUnits);
    directoryRef.current = nextDirectory;
    setDirectory(nextDirectory);
    setCustomTemplates(settings.filter((setting) => setting.type === 'custom-writing-template') as unknown as CustomWritingTemplate[]);
    setAiSkills((settings.filter((setting) => setting.type === 'ai-skill') as unknown as AiSkill[]).slice().sort((left, right) => left.name.localeCompare(right.name, 'zh-CN')));
    setAiHistory((settings.filter((setting) => setting.type === 'ai-history') as unknown as AiHistoryEntry[]).slice().sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
    setWeeklyTemplates((settings.filter((setting) => setting.type === 'weekly-template') as unknown as WeeklyTemplate[]).slice().sort((left, right) => left.name.localeCompare(right.name, 'zh-CN')));
    setPartnerGroups((settings.filter((setting) => setting.type === 'partner-group') as unknown as PartnerGroup[]).slice().sort((left, right) => left.name.localeCompare(right.name, 'zh-CN')));
    setCategoryStyles(settings.filter((setting) => setting.type === 'category-style') as unknown as CategoryStyle[]);
    const localSettingTypes = new Set(['contact-directory', 'custom-writing-template', 'ai-skill', 'ai-history', 'weekly-template', 'partner-group', 'category-style', 'demo-seed']);
    setLegacySettings(settings.filter((setting) => !localSettingTypes.has(String(setting.type))));
    const savedDraft = await getRecord<Draft>('draft_main');
    if (savedDraft) setDraft(savedDraft);
  };

  useEffect(() => { void reload(); }, []);
  useEffect(() => { if (!toast.text) return; const timer = window.setTimeout(() => setToastState((prev) => ({ text: '', key: prev.key })), 3200); return () => window.clearTimeout(timer); }, [toast]);
  useLayoutEffect(() => { mainAreaRef.current?.scrollTo({ top: 0, left: 0 }); window.scrollTo({ top: 0, left: 0 }); }, [tab]);

  const filteredTasks = useMemo(() => tasks.filter((task) => `${task.name} ${task.category} ${task.assigner}`.toLowerCase().includes(search.toLowerCase())), [tasks, search]);
  const filteredMeetings = useMemo(() => meetings.filter((meeting) => `${meeting.subject} ${meeting.sendTo} ${meeting.receiver} ${meeting.location}`.toLowerCase().includes(search.toLowerCase())), [meetings, search]);
  const filteredDocuments = useMemo(() => documents.filter((doc) => `${doc.title} ${doc.code} ${doc.fromUnit}`.toLowerCase().includes(search.toLowerCase())), [documents, search]);
  const filteredResearches = useMemo(() => researches.filter((research) => `${research.subject} ${research.direction} ${research.participants} ${research.location} ${research.summary}`.toLowerCase().includes(search.toLowerCase())), [researches, search]);
  const filteredSeals = useMemo(() => seals.filter((seal) => `${seal.userName} ${seal.approver} ${seal.docName} ${seal.docType}`.toLowerCase().includes(search.toLowerCase())), [seals, search]);
  const filteredMaterials = useMemo(() => materials.filter((material) => `${material.materialName} ${material.spec} ${material.handler} ${material.fromUnit}`.toLowerCase().includes(search.toLowerCase())), [materials, search]);
  const globalSearchGroups = useMemo<Array<GlobalSearchGroup<Tab>>>(() => [
    {
      id: 'navigation', label: '导航模块', items: globalNavItems.map((item, index) => ({
        id: `navigation:${item.id}`, kind: 'navigation', tab: item.id, title: item.label,
        description: `HX / ${String(index + 1).padStart(2, '0')} · 打开导航模块`,
        searchValue: `导航 ${item.label} ${item.id} ${index + 1}`, keywords: [item.label, item.id], icon: item.icon
      }))
    },
    {
      id: 'tasks', label: '任务记录', items: tasks.map((task) => ({
        id: `task:${task.id}`, kind: 'record', tab: 'tasks', recordId: task.id, title: task.name || '未命名任务',
        description: `任务管理 · ${task.category || '未分类'} · ${task.assigner || '未指定交办人'}`,
        searchValue: `任务 ${task.name} ${task.category} ${task.assigner} ${task.id}`, keywords: [task.category, task.assigner], icon: ClipboardList
      }))
    },
    {
      id: 'meetings', label: '会议记录', items: meetings.map((meeting) => ({
        id: `meeting:${meeting.id}`, kind: 'record', tab: 'meetings', recordId: meeting.id, title: meeting.subject || '未命名会议',
        description: `会议管理 · ${meeting.location || meeting.sendTo || '未填写地点或对象'}`,
        searchValue: `会议 ${meeting.subject} ${meeting.sendTo} ${meeting.receiver} ${meeting.location} ${meeting.id}`,
        keywords: [meeting.sendTo, meeting.receiver, meeting.location], icon: CalendarDays
      }))
    },
    {
      id: 'documents', label: '文件记录', items: documents.map((document) => ({
        id: `document:${document.id}`, kind: 'record', tab: 'documents', recordId: document.id, title: document.title || '未命名文件',
        description: `文件收发 · ${document.code || '无文号'} · ${document.fromUnit || '未填写来源单位'}`,
        searchValue: `文件 ${document.title} ${document.code} ${document.fromUnit} ${document.id}`,
        keywords: [document.code, document.fromUnit], icon: FileText
      }))
    },
    {
      id: 'researches', label: '外出记录', items: researches.map((research) => ({
        id: `research:${research.id}`, kind: 'record', tab: 'researches', recordId: research.id, title: research.subject || '未命名外出活动',
        description: `外出活动 · ${research.direction || '未分类'} · ${research.location || '未填写地点'}`,
        searchValue: `外出 ${research.subject} ${research.direction} ${research.participants} ${research.location} ${research.summary} ${research.id}`,
        keywords: [research.direction, research.participants, research.location, research.summary], icon: MapPin
      }))
    },
    {
      id: 'seals', label: '用章记录', items: seals.map((seal) => ({
        id: `seal:${seal.id}`, kind: 'record', tab: 'seals', recordId: seal.id, title: seal.docName || '未命名用章文件',
        description: `用章管理 · ${seal.docType || '未分类'} · ${seal.userName || '未填写用章人'}`,
        searchValue: `用章 ${seal.docName} ${seal.userName} ${seal.approver} ${seal.docType} ${seal.id}`,
        keywords: [seal.userName, seal.approver, seal.docType], icon: Stamp
      }))
    },
    {
      id: 'materials', label: '物资记录', items: materials.map((material) => ({
        id: `material:${material.id}`, kind: 'record', tab: 'materials', recordId: material.id, title: material.materialName || '未命名物资',
        description: `物资收发 · ${material.spec || '未填写规格'} · ${material.handler || '未填写经手人'}`,
        searchValue: `物资 ${material.materialName} ${material.spec} ${material.handler} ${material.fromUnit} ${material.id}`,
        keywords: [material.spec, material.handler, material.fromUnit], icon: Package
      }))
    }
  ], [tasks, meetings, documents, researches, seals, materials]);

  useEffect(() => {
    const toggleGlobalSearch = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k') return;
      if (!event.metaKey && !event.ctrlKey) return;
      if (event.altKey || globalSearchBlocked) return;
      event.preventDefault();
      changeGlobalSearchOpen(!globalSearchOpen);
    };
    window.addEventListener('keydown', toggleGlobalSearch);
    return () => window.removeEventListener('keydown', toggleGlobalSearch);
  }, [globalSearchBlocked, globalSearchOpen]);
  useEffect(() => { if (globalSearchBlocked) setGlobalSearchOpen(false); }, [globalSearchBlocked]);

  const persistDirectory = (people: string[], units: string[]) => {
    const next = mergeContactDirectory(directoryRef.current, people, units);
    directoryRef.current = next;
    setDirectory(next);
    const write = directoryWriteQueue.current.then(() => putRecord('setting', 'contact-directory', { type: 'contact-directory', ...next }));
    directoryWriteQueue.current = write.catch(() => undefined);
    return write;
  };
  const replaceDirectory = async (people: string[], units: string[]) => {
    const next = mergeContactDirectory(emptyDirectory(), people, units);
    const write = directoryWriteQueue.current.then(() => putRecord('setting', 'contact-directory', { type: 'contact-directory', ...next }));
    directoryWriteQueue.current = write.catch(() => undefined);
    try {
      await write;
      directoryRef.current = next;
      setDirectory(next);
      setToast(`常用项已保存：${next.units.length} 个单位与处室，${next.people.length} 名人员`);
      return true;
    } catch (error) {
      setToast(error instanceof Error ? `常用项保存失败：${error.message}` : '常用项保存失败');
      return false;
    }
  };
  const clearPendingAttachments = () => {
    pendingAttachmentSessionRef.current += 1;
    pendingAttachmentsRef.current = [];
    setPendingAttachments([]);
    setPendingAttachmentJobs(0);
  };
  const persistEditableRecord = async <T extends Task | MeetingRecord | OfficialDocument | ResearchRecord | SealRecord | MaterialRecord,>(kind: Kind, id: string, payload: T) => {
    const previous = await getRecord<T>(id);
    const referenced = new Set(attachmentIdsFromPayload(payload));
    const detached = attachmentIdsFromPayload(previous).filter((attachmentId) => !referenced.has(attachmentId));
    const staged = pendingAttachmentsRef.current.filter((attachment) => referenced.has(attachment.id));
    try {
      for (const attachment of staged) await putRecord('attachment', attachment.id, attachment);
      await putRecord(kind, id, payload);
      clearPendingAttachments();
    } catch (error) {
      for (const attachment of staged) await removeRecord(attachment.id).catch(() => undefined);
      setToast(error instanceof Error ? `保存失败：${error.message}` : '保存失败');
      return false;
    }
    await removeAttachmentsIfUnreferenced(detached).catch(() => undefined);
    return true;
  };
  const saveTask = async (task: Task) => {
    if (!task.name.trim()) return setToast('请填写任务名称');
    if (!isValidIsoDate(task.assignDate, false) || !isValidIsoDate(task.deadline)) return setToast('任务日期必须是有效的四位年份日期');
    const partnerStatus = task.partnerStatus.filter((partner) => partner.name.trim()).map((partner) => ({ ...partner, name: partner.name.trim() }));
    const stages = task.stages.filter((stage) => stage.name.trim()).map((stage) => ({ ...stage, name: stage.name.trim(), partnerStatus: stage.partnerStatus.filter((partner) => partner.name.trim()).map((partner) => ({ ...partner, name: partner.name.trim() })) }));
    const saved = { ...task, name: task.name.trim(), partnerStatus, stages, updatedAt: nowIso() };
    if (!await persistEditableRecord('task', task.id, saved)) return;
    await persistDirectory([task.assigner], [...partnerStatus.map((partner) => partner.name), ...stages.flatMap((stage) => stage.partnerStatus.map((partner) => partner.name))]);
    setTaskEditor(null); await reload(); setToast('任务已保存，人员和单位已加入常用项');
  };
  const saveMeeting = async (meeting: MeetingRecord) => {
    if (!meeting.subject.trim()) return setToast('请填写会议主题');
    if (!isValidIsoDate(meeting.notifyTime) || !isValidIsoDateTime(meeting.meetingTime)) return setToast('会议日期必须使用有效的四位年份日期和时间');
    const saved = { ...meeting, subject: meeting.subject.trim(), sendTo: meeting.sendTo.trim(), receiver: meeting.receiver.trim(), location: meeting.location.trim(), remark: meeting.remark.trim(), updatedAt: nowIso() };
    if (!await persistEditableRecord('meeting', saved.id, saved)) return;
    await persistDirectory([saved.receiver], [saved.sendTo]);
    setMeetingEditor(null); await reload(); setToast('会议记录已保存');
  };
  const saveDocument = async (doc: OfficialDocument) => {
    if (!doc.title.trim()) return setToast('请填写文件标题');
    if (!isValidIsoDate(doc.docDate, false)) return setToast('成文日期必须是有效的四位年份日期');
    const saved = { ...doc, title: doc.title.trim(), updatedAt: nowIso() };
    if (!await persistEditableRecord('document', saved.id, saved)) return;
    await persistDirectory([saved.handler], [saved.fromUnit]);
    setDocumentEditor(null); await reload(); setToast('文件登记已保存，人员和单位已加入常用项');
  };
  const saveResearch = async (research: ResearchRecord) => {
    if (!research.subject.trim()) return setToast('请填写活动主题');
    if (!isValidIsoDate(research.researchTime)) return setToast('活动日期必须是有效的四位年份日期');
    const saved = { ...research, subject: research.subject.trim(), location: research.location.trim(), participants: research.participants.trim(), summary: research.summary.trim(), achievements: research.achievements.trim(), remark: research.remark.trim(), updatedAt: nowIso() };
    if (!await persistEditableRecord('research', saved.id, saved)) return;
    await persistDirectory(saved.participants.split(/[、，,;；\n]/), []);
    setResearchEditor(null); await reload(); setToast('外出活动已保存');
  };
  const saveSeal = async (seal: SealRecord) => {
    if (!seal.userName.trim() || !seal.approver.trim() || !seal.docName.trim()) return setToast('请填写用章人、审批人和所盖文件名称');
    if (!isValidIsoDate(seal.sealTime)) return setToast('用章日期必须是有效的四位年份日期');
    const saved = { ...seal, userName: seal.userName.trim(), approver: seal.approver.trim(), docName: seal.docName.trim(), docType: seal.docType.trim(), remark: seal.remark.trim(), updatedAt: nowIso() };
    if (!await persistEditableRecord('seal', saved.id, saved)) return;
    await persistDirectory([saved.userName, saved.approver], []);
    setSealEditor(null); await reload(); setToast('用章记录已保存');
  };
  const saveMaterial = async (material: MaterialRecord) => {
    if (!material.materialName.trim()) return setToast('请填写物资名称');
    if (!Number.isInteger(material.quantity) || material.quantity <= 0) return setToast('物资数量必须是正整数');
    if (!isValidIsoDate(material.handlerTime)) return setToast('经手日期必须是有效的四位年份日期');
    const saved = { ...material, materialName: material.materialName.trim(), spec: material.spec.trim(), handler: material.handler.trim(), fromUnit: material.fromUnit.trim(), remark: material.remark.trim(), updatedAt: nowIso() };
    if (!await persistEditableRecord('material', saved.id, saved)) return;
    await persistDirectory([saved.handler], [saved.fromUnit]);
    setMaterialEditor(null); await reload(); setToast('物资收发记录已保存');
  };
  const rememberDirectoryValue = async (kind: 'people' | 'units', value: string) => {
    if (!value.trim()) return setToast(kind === 'people' ? '请先填写人员名称' : '请先填写单位名称');
    await persistDirectory(kind === 'people' ? [value] : [], kind === 'units' ? [value] : []);
    setToast('已加入常用项');
  };
  const saveCustomTemplate = async (template: CustomWritingTemplate) => {
    await putRecord('setting', `custom-template:${template.id}`, { type: 'custom-writing-template', ...template });
    await reload();
    setToast('已保存为自定义格式');
  };
  const saveAiSkill = async (name: string, content: string) => {
    const trimmedName = name.trim();
    const trimmedContent = content.trim();
    if (!trimmedName || !trimmedContent) { setToast('请填写指引名称和内容'); return false; }
    if (trimmedContent.length > AI_MAX_GUIDANCE_LENGTH) { setToast(`指引内容不能超过 ${AI_MAX_GUIDANCE_LENGTH} 个字符`); return false; }
    const timestamp = nowIso();
    const skill: AiSkill = { id: createId('ai-skill'), name: trimmedName.slice(0, 60), content: trimmedContent, createdAt: timestamp, updatedAt: timestamp };
    try {
      await putRecord('setting', skill.id, { type: 'ai-skill', ...skill });
      await reload();
      setToast(`润色指引「${skill.name}」已保存到本机`);
      return true;
    } catch (error) {
      setToast(error instanceof Error ? `保存失败：${error.message}` : '保存失败');
      return false;
    }
  };
  const deleteAiSkill = async (skill: AiSkill) => {
    if (!window.confirm(`确认删除润色指引「${skill.name}」？删除后无法撤销。`)) return;
    try {
      await removeRecord(skill.id);
      await reload();
      setToast('润色指引已删除');
    } catch (error) {
      setToast(error instanceof Error ? `删除失败：${error.message}` : '删除失败');
    }
  };
  const saveAiHistory = async (entry: AiHistoryEntry, isCurrent: () => boolean = () => true) => {
    if (!isCurrent()) return false;
    const answerLimit = 200_000;
    const stored: AiHistoryEntry = {
      ...entry,
      input: entry.input.slice(0, AI_MAX_CONTENT_LENGTH),
      answer: entry.answer.slice(0, answerLimit),
      ...(entry.answer.length > answerLimit ? { answerTruncated: true } : {})
    };
    await putRecord('setting', stored.id, { type: 'ai-history', ...stored });
    if (!isCurrent()) { await removeRecord(stored.id); return false; }
    const retained = [stored, ...aiHistory.filter((item) => item.id !== stored.id)].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    for (const expired of retained.slice(200)) await removeRecord(expired.id);
    if (!isCurrent()) { await removeRecord(stored.id); return false; }
    setAiHistory(retained.slice(0, 200));
    return true;
  };
  const deleteAiHistory = async (entry: AiHistoryEntry) => {
    if (!window.confirm(`确认删除 ${entry.createdAt.slice(0, 10)} 的 AI 历史？`)) return;
    await removeRecord(entry.id);
    setAiHistory((current) => current.filter((item) => item.id !== entry.id));
    setToast('AI 历史已删除');
  };
  const clearAiHistory = async () => {
    if (!aiHistory.length || !window.confirm(`确认清空本机 ${aiHistory.length} 条 AI 历史？此操作无法撤销。`)) return;
    for (const entry of aiHistory) await removeRecord(entry.id);
    setAiHistory([]);
    setToast('本机 AI 历史已清空');
  };
  const saveWeeklyTemplate = async (name: string, sections: WeeklyTemplateSection[], id?: string): Promise<string | null> => {
    const trimmedName = name.trim();
    if (!trimmedName) { setToast('请填写模板名称'); return null; }
    const cleaned = sections
      .map((section) => ({ heading: section.heading.trim(), source: section.source, ...(section.note?.trim() ? { note: section.note.trim().slice(0, 500) } : {}) }))
      .filter((section) => section.heading && section.heading.length <= 60);
    if (!cleaned.length || cleaned.length > 20) { setToast('模板需要 1 至 20 个有标题的章节'); return null; }
    const timestamp = nowIso();
    const existing = id ? weeklyTemplates.find((template) => template.id === id) : undefined;
    const template: WeeklyTemplate = { id: existing?.id || createId('weekly-template'), name: trimmedName.slice(0, 60), sections: cleaned, createdAt: existing?.createdAt || timestamp, updatedAt: timestamp };
    try {
      await putRecord('setting', template.id, { type: 'weekly-template', ...template });
      await reload();
      setToast(`周报模板「${template.name}」已保存`);
      return template.id;
    } catch (error) {
      setToast(error instanceof Error ? `保存失败：${error.message}` : '保存失败');
      return null;
    }
  };
  const deleteWeeklyTemplate = async (template: WeeklyTemplate) => {
    if (!window.confirm(`确认删除周报模板「${template.name}」？删除后无法撤销。`)) return;
    try {
      await removeRecord(template.id);
      await reload();
      setToast('周报模板已删除');
    } catch (error) {
      setToast(error instanceof Error ? `删除失败：${error.message}` : '删除失败');
    }
  };
  const savePartnerGroup = async (name: string, members: string[]) => {
    const trimmedName = name.trim();
    const cleanedMembers = [...new Set(members.map((member) => member.trim()).filter(Boolean))];
    if (!trimmedName) return setToast('请填写分组名称');
    if (!cleanedMembers.length) return setToast('请先在名单中填写至少一个单位');
    if (cleanedMembers.length > 50) return setToast('单个分组最多保存 50 个单位');
    const timestamp = nowIso();
    const group: PartnerGroup = { id: createId('partner-group'), name: trimmedName.slice(0, 60), members: cleanedMembers, createdAt: timestamp, updatedAt: timestamp };
    try {
      await putRecord('setting', group.id, { type: 'partner-group', ...group });
      await reload();
      setToast(`分组「${group.name}」已保存（${group.members.length} 个单位）`);
    } catch (error) {
      setToast(error instanceof Error ? `保存失败：${error.message}` : '保存失败');
    }
  };
  const deletePartnerGroup = async (group: PartnerGroup) => {
    if (!window.confirm(`确认删除分组「${group.name}」？已加入任务的单位不受影响。`)) return;
    try {
      await removeRecord(group.id);
      await reload();
      setToast('分组已删除');
    } catch (error) {
      setToast(error instanceof Error ? `删除失败：${error.message}` : '删除失败');
    }
  };
  const setCategoryTint = async (name: string, tint: CategoryTint | null) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = `category-style:${trimmed}`.slice(0, 180);
    try {
      if (tint === null) {
        await removeRecord(id);
      } else {
        const existing = categoryStyles.find((style) => style.name === trimmed);
        const timestamp = nowIso();
        await putRecord('setting', id, { type: 'category-style', id, name: trimmed, tint, createdAt: existing?.createdAt || timestamp, updatedAt: timestamp });
      }
      await reload();
      setToast(tint === null ? `「${trimmed}」已恢复自动配色` : `「${trimmed}」类目颜色已更新`);
    } catch (error) {
      setToast(error instanceof Error ? `保存失败：${error.message}` : '保存失败');
    }
  };
  const categoryTints = useMemo(() => new Map(categoryStyles.map((style) => [style.name, style.tint])), [categoryStyles]);
  const deleteEditableRecord = async <T extends Task | MeetingRecord | OfficialDocument | ResearchRecord | SealRecord | MaterialRecord,>(id: string, label: string, successMessage: string) => {
    if (!window.confirm(`确认删除${label}？删除后无法撤销，建议先导出本地快照。`)) return;
    try {
      const existing = await getRecord<T>(id);
      const attachmentIds = attachmentIdsFromPayload(existing);
      await removeRecord(id);
      await removeAttachmentsIfUnreferenced(attachmentIds);
      await reload();
      setToast(successMessage);
    } catch (error) {
      setToast(error instanceof Error ? `删除失败：${error.message}` : '删除失败');
    }
  };
  const deleteTask = (id: string) => deleteEditableRecord<Task>(id, '该任务', '任务已删除');
  const deleteMeeting = (id: string) => deleteEditableRecord<MeetingRecord>(id, '该会议记录', '会议记录已删除');
  const deleteDocument = (id: string) => deleteEditableRecord<OfficialDocument>(id, '该文件记录', '文件已删除');
  const deleteResearch = (id: string) => deleteEditableRecord<ResearchRecord>(id, '该外出活动', '外出活动已删除');
  const deleteSeal = (id: string) => deleteEditableRecord<SealRecord>(id, '该用章记录', '用章记录已删除');
  const deleteMaterial = (id: string) => deleteEditableRecord<MaterialRecord>(id, '该物资流水', '物资记录已删除');
  const saveWeeklyReport = async (report: WeeklyReport) => {
    if (!report.title.trim() || !report.contentText.trim()) throw new Error('请填写周报标题和正文');
    if (!isValidIsoDate(report.startDate, false) || !isValidIsoDate(report.endDate, false) || report.startDate > report.endDate) throw new Error('周报起止日期无效');
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
  const deleteWeeklyReport = async (id: string) => {
    if (!window.confirm('确认删除该周报？删除后无法撤销，建议先导出本地快照。')) return;
    try {
      await removeRecord(id); await reload(); setToast('周报已删除');
    } catch (error) {
      setToast(error instanceof Error ? `删除失败：${error.message}` : '删除失败');
    }
  };

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
        meetings: result.byKind.meeting,
        documents: result.byKind.document,
        researches: result.byKind.research,
        seals: result.byKind.seal,
        materials: result.byKind.material,
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
    const session = pendingAttachmentSessionRef.current;
    const acceptedFiles = Array.from(files).filter((file) => {
      if (file.size <= 8_000_000) return true;
      setToast(`${file.name} 超过 8 MB 限制`);
      return false;
    });
    if (!acceptedFiles.length) return setToast('没有可加入的附件');
    setPendingAttachmentJobs((count) => count + 1);
    const nextIds = [...currentIds];
    const staged: Attachment[] = [];
    try {
      for (const file of acceptedFiles) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (session !== pendingAttachmentSessionRef.current) return;
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        if (session !== pendingAttachmentSessionRef.current) return;
        const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
        const id = createId('attachment');
        const attachment: Attachment = { id, name: file.name, mimeType: file.type || 'application/octet-stream', size: file.size, data: bytesToBase64(bytes), sha256: hash, createdAt: nowIso() };
        staged.push(attachment);
        nextIds.push(id);
      }
      if (session !== pendingAttachmentSessionRef.current) return;
      pendingAttachmentsRef.current = [...pendingAttachmentsRef.current, ...staged];
      setPendingAttachments(pendingAttachmentsRef.current);
      onUpdate([...new Set(nextIds)]);
      setToast('附件已暂存，保存当前记录后写入本机');
    } catch (error) {
      if (session === pendingAttachmentSessionRef.current) setToast(error instanceof Error ? `附件读取失败：${error.message}` : '附件读取失败');
    } finally {
      if (session === pendingAttachmentSessionRef.current) setPendingAttachmentJobs((count) => Math.max(0, count - 1));
    }
  };

  const copyArchiveToEditable = (record: ArchiveRecord) => {
    clearPendingAttachments();
    const payload = record.legacyPayload;
    const copiedAt = nowIso();
    if (record.type === 'meeting') {
      setMeetingEditor({
        ...emptyMeeting(), subject: legacyText(payload, 'subject') || record.title, sendTo: legacyText(payload, 'sendTo'), receiver: legacyText(payload, 'receiver'),
        notifyTime: normalizedLegacyDate(legacyText(payload, 'notifyTime')), meetingTime: normalizedLegacyDateTime(legacyText(payload, 'meetingTime')),
        location: legacyText(payload, 'location'), remark: legacyText(payload, 'remark'), files: record.files, sourceVersion: record.sourceVersion,
        legacyPayload: payload, createdAt: copiedAt, updatedAt: copiedAt
      });
      setTab('meetings');
    } else if (record.type === 'research') {
      const direction = legacyText(payload, 'direction');
      const directions: ResearchDirection[] = ['外出调研', '外出开会', '外出活动', '慰问活动', '上级来访'];
      setResearchEditor({
        ...emptyResearch(), researchTime: normalizedLegacyDate(legacyText(payload, 'researchTime')), direction: directions.includes(direction as ResearchDirection) ? direction as ResearchDirection : '外出调研',
        subject: legacyText(payload, 'subject') || record.title, location: legacyText(payload, 'location'), useCar: ['是', '否'].includes(legacyText(payload, 'useCar')) ? legacyText(payload, 'useCar') as '是' | '否' : '',
        participants: legacyText(payload, 'participants'), summary: legacyText(payload, 'summary'), achievements: legacyText(payload, 'achievements'), remark: legacyText(payload, 'remark'),
        files: record.files, sourceVersion: record.sourceVersion, legacyPayload: payload, createdAt: copiedAt, updatedAt: copiedAt
      });
      setTab('researches');
    } else if (record.type === 'seal') {
      setSealEditor({
        ...emptySeal(), sealTime: normalizedLegacyDate(legacyText(payload, 'sealTime')), userName: legacyText(payload, 'userName'), approver: legacyText(payload, 'approver'),
        docName: legacyText(payload, 'docName') || record.title, docType: legacyText(payload, 'docType'), remark: legacyText(payload, 'remark'), files: record.files,
        sourceVersion: record.sourceVersion, legacyPayload: payload, createdAt: copiedAt, updatedAt: copiedAt
      });
      setTab('seals');
    } else if (record.type === 'material') {
      const quantity = Number(payload.quantity);
      setMaterialEditor({
        ...emptyMaterial(), materialName: legacyText(payload, 'materialName') || record.title, spec: legacyText(payload, 'spec'), quantity: Number.isInteger(quantity) && quantity > 0 ? quantity : 1,
        type: legacyText(payload, 'type') === 'out' ? 'out' : 'in', handlerTime: normalizedLegacyDate(legacyText(payload, 'handlerTime')), handler: legacyText(payload, 'handler'),
        fromUnit: legacyText(payload, 'fromUnit'), remark: legacyText(payload, 'remark'), files: record.files, sourceVersion: record.sourceVersion, legacyPayload: payload,
        createdAt: copiedAt, updatedAt: copiedAt
      });
      setTab('materials');
    }
    setSearch('');
  };

  const editorAttachments = useMemo(() => [...attachments, ...pendingAttachments], [attachments, pendingAttachments]);

  const openAiAssistant = (request?: AiAssistRequest) => {
    if (request) {
      setAiPrefill({ source: request.source || 'workspace', purpose: request.purpose || '综合工作总结', custom: request.custom, changeContext: request.changeContext, nonce: Date.now() });
      setAiOverlayOpen(true);
      return;
    }
    setAiOverlayOpen(false);
    setTab('ai');
  };
  const navigate = (nextTab: Tab) => {
    setAiOverlayOpen(false);
    setTab(nextTab);
    setSearch('');
  };
  useEffect(() => {
    if (!aiOverlayOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAiOverlayOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [aiOverlayOpen]);
  const aiWorkspace: AiWorkspaceData = { tasks, meetings, documents, researches, seals, materials, weeklyReports, draft };
  const selectedIdFor = <T extends { id: string },>(businessTab: BusinessTab, records: T[]) => {
    const selectedId = selectedBusinessRecord?.tab === businessTab ? selectedBusinessRecord.id : '';
    return records.some((record) => record.id === selectedId) ? selectedId : records[0]?.id;
  };
  const selectedTaskId = selectedIdFor('tasks', filteredTasks);
  const selectedMeetingId = selectedIdFor('meetings', filteredMeetings);
  const selectedDocumentId = selectedIdFor('documents', filteredDocuments);
  const selectedResearchId = selectedIdFor('researches', filteredResearches);
  const selectedSealId = selectedIdFor('seals', filteredSeals);
  const selectedMaterialId = selectedIdFor('materials', filteredMaterials);
  const businessDetail: BusinessDetail | null = (() => {
    if (tab === 'tasks') {
      const record = filteredTasks.find((task) => task.id === selectedTaskId);
      return record ? { kind: 'task', record } : null;
    }
    if (tab === 'meetings') {
      const record = filteredMeetings.find((meeting) => meeting.id === selectedMeetingId);
      return record ? { kind: 'meeting', record } : null;
    }
    if (tab === 'documents') {
      const record = filteredDocuments.find((document) => document.id === selectedDocumentId);
      return record ? { kind: 'document', record } : null;
    }
    if (tab === 'researches') {
      const record = filteredResearches.find((research) => research.id === selectedResearchId);
      return record ? { kind: 'research', record } : null;
    }
    if (tab === 'seals') {
      const record = filteredSeals.find((seal) => seal.id === selectedSealId);
      return record ? { kind: 'seal', record } : null;
    }
    if (tab === 'materials') {
      const record = filteredMaterials.find((material) => material.id === selectedMaterialId);
      return record ? { kind: 'material', record } : null;
    }
    return null;
  })();
  const editBusinessDetail = (detail: BusinessDetail) => {
    clearPendingAttachments();
    if (detail.kind === 'task') setTaskEditor(detail.record);
    if (detail.kind === 'meeting') setMeetingEditor(detail.record);
    if (detail.kind === 'document') setDocumentEditor(detail.record);
    if (detail.kind === 'research') setResearchEditor(detail.record);
    if (detail.kind === 'seal') setSealEditor(detail.record);
    if (detail.kind === 'material') setMaterialEditor(detail.record);
  };
  const scrollToBusinessRegion = (target: HTMLElement | null) => {
    if (!target) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  };
  const selectBusinessRecord = (businessTab: BusinessTab, id: string) => {
    setSelectedBusinessRecord({ tab: businessTab, id });
    if (!window.matchMedia('(max-width: 1279px)').matches) return;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => scrollToBusinessRegion(businessDetailRef.current)));
  };
  const selectGlobalSearchItem = (item: GlobalSearchItem<Tab>) => {
    if (item.kind === 'record' && item.recordId) {
      const businessTab = item.tab as BusinessTab;
      const id = item.recordId;
      navigate(businessTab);
      selectBusinessRecord(businessTab, id);
      return;
    }
    navigate(item.tab);
  };

  const renderContent = () => {
    if (tab === 'dashboard') return <Dashboard tasks={tasks} meetings={meetings} documents={documents} researches={researches} seals={seals} materials={materials} archives={archives} onNavigate={navigate} />;
    if (tab === 'tasks') return <TaskView tasks={filteredTasks} selectedId={selectedTaskId} onSelect={(id) => selectBusinessRecord('tasks', id)} search={search} setSearch={setSearch} attachments={attachments} categoryTints={categoryTints} onNew={() => { clearPendingAttachments(); setTaskEditor(emptyTask()); }} onEdit={(task) => { clearPendingAttachments(); setTaskEditor(task); }} onDelete={deleteTask} />;
    if (tab === 'meetings') return <MeetingView meetings={filteredMeetings} selectedId={selectedMeetingId} onSelect={(id) => selectBusinessRecord('meetings', id)} search={search} setSearch={setSearch} onNew={() => { clearPendingAttachments(); setMeetingEditor(emptyMeeting()); }} onEdit={(meeting) => { clearPendingAttachments(); setMeetingEditor(meeting); }} onDelete={deleteMeeting} />;
    if (tab === 'documents') return <DocumentView documents={filteredDocuments} selectedId={selectedDocumentId} onSelect={(id) => selectBusinessRecord('documents', id)} search={search} setSearch={setSearch} attachments={attachments} onNew={() => { clearPendingAttachments(); setDocumentEditor(emptyDocument()); }} onEdit={(document) => { clearPendingAttachments(); setDocumentEditor(document); }} onDelete={deleteDocument} />;
    if (tab === 'researches') return <ResearchView researches={filteredResearches} selectedId={selectedResearchId} onSelect={(id) => selectBusinessRecord('researches', id)} search={search} setSearch={setSearch} onNew={() => { clearPendingAttachments(); setResearchEditor(emptyResearch()); }} onEdit={(research) => { clearPendingAttachments(); setResearchEditor(research); }} onDelete={deleteResearch} />;
    if (tab === 'seals') return <SealView seals={filteredSeals} selectedId={selectedSealId} onSelect={(id) => selectBusinessRecord('seals', id)} search={search} setSearch={setSearch} onNew={() => { clearPendingAttachments(); setSealEditor(emptySeal()); }} onEdit={(seal) => { clearPendingAttachments(); setSealEditor(seal); }} onDelete={deleteSeal} />;
    if (tab === 'materials') return <MaterialView materials={filteredMaterials} allMaterials={materials} selectedId={selectedMaterialId} onSelect={(id) => selectBusinessRecord('materials', id)} search={search} setSearch={setSearch} onNew={() => { clearPendingAttachments(); setMaterialEditor(emptyMaterial()); }} onEdit={(material) => { clearPendingAttachments(); setMaterialEditor(material); }} onDelete={deleteMaterial} />;
    if (tab === 'directory') return <DirectoryManager directory={directory} onSave={replaceDirectory} setToast={setToast} />;
    if (tab === 'writing') return <WritingStudio draft={draft} setDraft={setDraft} customTemplates={customTemplates} onSaveCustomTemplate={saveCustomTemplate} onAiAssist={openAiAssistant} setToast={setToast} />;
    if (tab === 'weekly') return <WeeklyView tasks={tasks} meetings={meetings} documents={documents} researches={researches} seals={seals} materials={materials} reports={weeklyReports} templates={weeklyTemplates} onSave={saveWeeklyReport} onDelete={deleteWeeklyReport} onSaveTemplate={saveWeeklyTemplate} onDeleteTemplate={deleteWeeklyTemplate} onAiAssist={openAiAssistant} setToast={setToast} />;
    if (tab === 'stats') return <StatsView tasks={tasks} meetings={meetings} documents={documents} researches={researches} seals={seals} materials={materials} categoryTints={categoryTints} onSetCategoryTint={setCategoryTint} />;
    if (tab === 'ai') return null;
    if (tab === 'archive') return <ArchiveView archives={archives} settings={legacySettings} attachments={attachments} onCopy={copyArchiveToEditable} />;
    if (tab === 'migration') return <MigrationView onImport={importLegacy} onRestore={restoreSnapshot} onReload={reload} setToast={setToast} />;
    return <AboutView desktop={isDesktop} distribution={distributionMode} weeklyReports={weeklyReports} onNavigate={navigate} />;
  };

  const activeNavIndex = navItems.findIndex((item) => item.id === tab);
  const modeLabel = distributionMode === 'internet' ? '互联网版' : distributionMode === 'intranet' ? '内网版' : '公开演示版';
  const connectionLabel = distributionMode === 'internet' ? 'INTERNET AI ON DEMAND' : distributionMode === 'intranet' ? 'INTRANET + MANUAL SYNC' : 'PAGES LOCAL + AI ON DEMAND';
  const connectionDetail = distributionMode === 'intranet' ? '本机存储 · 同步需手动触发' : '用户 Key 仅保留在当前会话';
  return <div className={`shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} data-tab={tab}>
    <KineticBackdrop />
    <aside className="sidebar" aria-label="应用导航">
      <div className="sidebar-header">
        <div className="brand-lockup"><span className="brand-mark" aria-hidden="true"><Orbit size={21} strokeWidth={1.5} /></span><div><strong>HxHwang Gw</strong><span>GOVERNANCE WORKSPACE</span></div></div>
        <button type="button" className="sidebar-toggle" aria-label={sidebarCollapsed ? '展开左侧导航' : '收起左侧导航，仅显示图标'} aria-expanded={!sidebarCollapsed} title={sidebarCollapsed ? '展开左侧导航' : '收起左侧导航'} onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}>{sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button>
      </div>
      <div className="mode-label" title={isDesktop ? `桌面${modeLabel}` : modeLabel}><span className="status-dot" /><span>{isDesktop ? `桌面${modeLabel}` : modeLabel}</span></div>
      <nav className="nav-list" aria-label="主导航">
        {navItems.map(({ id, label, icon: Icon }, index) => <button aria-label={label} title={sidebarCollapsed ? label : undefined} className={`nav-button ${tab === id ? 'active' : ''}`} key={id} onClick={() => navigate(id)}><span className="nav-index">{String(index + 1).padStart(2, '0')}</span><Icon size={17} strokeWidth={1.6} /><span>{label}</span>{tab === id && <ArrowUpRight size={14} />}</button>)}
      </nav>
      <div className="sidebar-bottom"><button aria-label="关于与设置" title={sidebarCollapsed ? '关于与设置' : undefined} className={`nav-button ${tab === 'about' ? 'active' : ''}`} onClick={() => navigate('about')}><span className="nav-index">{String(navItems.length + 1).padStart(2, '0')}</span><Info size={17} /><span>关于与设置</span>{tab === 'about' && <ArrowUpRight size={14} />}</button><div className="sidebar-credit"><span>ORIGIN / LOCAL</span><strong>© HaoXiangHwang</strong><a href="mailto:Rays688888@Gmail.com">Rays688888@Gmail.com</a></div></div>
    </aside>
    <main className="main-area" ref={mainAreaRef}>
      <header className="topbar"><div className="mobile-brand"><Menu size={18} /><span>HxHwang Gw</span></div><div className="topbar-context"><span>HX / {String(activeNavIndex >= 0 ? activeNavIndex + 1 : navItems.length + 1).padStart(2, '0')}</span><strong>{navItems.find((item) => item.id === tab)?.label ?? '关于与设置'}</strong></div><div className="breadcrumbs">本地优先 <span>/</span> 外发必须逐次确认</div><div className="topbar-actions"><button ref={globalSearchTriggerRef} type="button" className="global-search-trigger" aria-label="打开全局查找" aria-haspopup="dialog" aria-expanded={globalSearchOpen} title={globalSearchBlocked ? '当前有编辑或 AI 面板，暂不可用' : '全局查找（Ctrl 或 Command + K）'} disabled={globalSearchBlocked} onClick={() => changeGlobalSearchOpen(true)}><Search size={16} /><span>全局查找</span><kbd>Ctrl K</kbd></button><span className="connection"><Activity size={15} /><span>{connectionLabel}</span><strong>{connectionDetail}</strong></span><button className="icon-button" title="刷新本地数据" onClick={() => void reload()}><RefreshCw size={17} /></button></div></header>
      <div className={`content-wrap ${businessDetail ? 'has-detail-panel' : ''}`}><div className="primary-content" ref={primaryContentRef}>{renderContent()}<div className={`ai-keepalive ${aiOverlayOpen ? 'ai-context-overlay' : ''}`} hidden={tab !== 'ai' && !aiOverlayOpen} role={aiOverlayOpen ? 'dialog' : undefined} aria-modal={aiOverlayOpen || undefined} aria-label={aiOverlayOpen ? '当前页面 AI 协作面板' : undefined}>{aiOverlayOpen && <div className="ai-context-toolbar"><div><span className="eyebrow">当前页面</span><strong>AI 协作面板</strong></div><button type="button" className="icon-button" title="关闭当前页 AI 面板" onClick={() => setAiOverlayOpen(false)}><X size={18} /></button></div>}<AiHub distribution={distributionMode} compact={aiOverlayOpen} workspace={aiWorkspace} attachments={attachments} prefill={aiPrefill} skills={aiSkills} history={aiHistory} onSaveHistory={saveAiHistory} onDeleteHistory={deleteAiHistory} onClearHistory={clearAiHistory} onSaveSkill={saveAiSkill} onDeleteSkill={deleteAiSkill} onReload={reload} setToast={setToast} /></div></div>{businessDetail && <BusinessDetailPanel detail={businessDetail} attachments={attachments} panelRef={businessDetailRef} onBackToList={() => scrollToBusinessRegion(primaryContentRef.current)} onEdit={() => editBusinessDetail(businessDetail)} />}</div>
      <footer className="page-footer"><span>HXHWANG GW / {__APP_VERSION__}</span><span>© HaoXiangHwang · <a href="mailto:Rays688888@Gmail.com">Rays688888@Gmail.com</a> · <a href="https://nextweb4.github.io/" target="_blank" rel="noreferrer">nextweb4.github.io</a></span></footer>
    </main>
    <GlobalSearch open={globalSearchOpen} groups={globalSearchGroups} onOpenChange={changeGlobalSearchOpen} onSelectItem={selectGlobalSearchItem} />
    {taskEditor && <TaskEditor task={taskEditor} isNew={!tasks.some((task) => task.id === taskEditor.id)} directory={directory} attachments={editorAttachments} attachmentBusy={pendingAttachmentJobs > 0} partnerGroups={partnerGroups} onSaveGroup={savePartnerGroup} onDeleteGroup={deletePartnerGroup} onRemember={rememberDirectoryValue} onChange={setTaskEditor} onAttach={(files) => void addAttachments(files, taskEditor.files, (ids) => setTaskEditor({ ...taskEditor, files: ids }))} onSave={() => void saveTask(taskEditor)} onClose={() => { clearPendingAttachments(); setTaskEditor(null); }} setToast={setToast} />}
    {meetingEditor && <MeetingEditor meeting={meetingEditor} isNew={!meetings.some((meeting) => meeting.id === meetingEditor.id)} directory={directory} attachments={editorAttachments} attachmentBusy={pendingAttachmentJobs > 0} onRemember={rememberDirectoryValue} onChange={setMeetingEditor} onAttach={(files) => void addAttachments(files, meetingEditor.files, (ids) => setMeetingEditor({ ...meetingEditor, files: ids }))} onSave={() => void saveMeeting(meetingEditor)} onClose={() => { clearPendingAttachments(); setMeetingEditor(null); }} />}
    {documentEditor && <DocumentEditor document={documentEditor} isNew={!documents.some((document) => document.id === documentEditor.id)} directory={directory} attachments={editorAttachments} attachmentBusy={pendingAttachmentJobs > 0} onRemember={rememberDirectoryValue} onChange={setDocumentEditor} onAttach={(files) => void addAttachments(files, documentEditor.files, (ids) => setDocumentEditor({ ...documentEditor, files: ids }))} onSave={() => void saveDocument(documentEditor)} onClose={() => { clearPendingAttachments(); setDocumentEditor(null); }} />}
    {researchEditor && <ResearchEditor research={researchEditor} isNew={!researches.some((research) => research.id === researchEditor.id)} directory={directory} attachments={editorAttachments} attachmentBusy={pendingAttachmentJobs > 0} onChange={setResearchEditor} onAttach={(files) => void addAttachments(files, researchEditor.files, (ids) => setResearchEditor({ ...researchEditor, files: ids }))} onSave={() => void saveResearch(researchEditor)} onClose={() => { clearPendingAttachments(); setResearchEditor(null); }} />}
    {sealEditor && <SealEditor seal={sealEditor} isNew={!seals.some((seal) => seal.id === sealEditor.id)} directory={directory} attachments={editorAttachments} attachmentBusy={pendingAttachmentJobs > 0} onRemember={rememberDirectoryValue} onChange={setSealEditor} onAttach={(files) => void addAttachments(files, sealEditor.files, (ids) => setSealEditor({ ...sealEditor, files: ids }))} onSave={() => void saveSeal(sealEditor)} onClose={() => { clearPendingAttachments(); setSealEditor(null); }} />}
    {materialEditor && <MaterialEditor material={materialEditor} isNew={!materials.some((material) => material.id === materialEditor.id)} directory={directory} attachments={editorAttachments} attachmentBusy={pendingAttachmentJobs > 0} onRemember={rememberDirectoryValue} onChange={setMaterialEditor} onAttach={(files) => void addAttachments(files, materialEditor.files, (ids) => setMaterialEditor({ ...materialEditor, files: ids }))} onSave={() => void saveMaterial(materialEditor)} onClose={() => { clearPendingAttachments(); setMaterialEditor(null); }} />}
    {toast.text && <div className="toast" role="status"><Check size={16} />{toast.text}</div>}
  </div>;
}

function KineticBackdrop() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const updatePointer = (event: PointerEvent) => {
      document.documentElement.style.setProperty('--pointer-x', `${(event.clientX / window.innerWidth) * 100}%`);
      document.documentElement.style.setProperty('--pointer-y', `${(event.clientY / window.innerHeight) * 100}%`);
    };
    window.addEventListener('pointermove', updatePointer, { passive: true });
    return () => window.removeEventListener('pointermove', updatePointer);
  }, []);
  return <div className="kinetic-field" aria-hidden="true"><span className="kinetic-grid" /><span className="kinetic-glow" /><span className="kinetic-orbit orbit-one" /><span className="kinetic-orbit orbit-two" /><span className="kinetic-noise" /></div>;
}

function PageHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div className="heading-copy"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{detail}</p></div>{action && <div className="heading-action">{action}</div>}<span className="heading-signal" aria-hidden="true">HX</span></div>;
}

function Dashboard({ tasks, meetings, documents, researches, seals, materials, archives, onNavigate }: { tasks: Task[]; meetings: MeetingRecord[]; documents: OfficialDocument[]; researches: ResearchRecord[]; seals: SealRecord[]; materials: MaterialRecord[]; archives: ArchiveRecord[]; onNavigate: (tab: Tab) => void }) {
  const active = tasks.filter((task) => task.status !== 'done').length;
  const dueSoon = tasks.filter((task) => task.deadline && task.deadline <= localDateInput(new Date(Date.now() + 7 * 86400000)) && task.status !== 'done').length;
  const operations = meetings.length + researches.length + seals.length + materials.length;
  return <>
    <section className="dashboard-hero">
      <div className="hero-copy"><span className="eyebrow">今日工作 / LOCAL OPERATIONS</span><h1><span>让事务</span><span className="hero-outline">有迹可循</span></h1><p>把任务、文件与文稿组织成一条可以回看、可以验证、可以继续推进的工作链。</p><button className="primary-button hero-action" onClick={() => onNavigate('tasks')}><Plus size={16} />新建任务<ArrowUpRight size={15} /></button></div>
      <div className="hero-visual" aria-hidden="true"><div className="hero-orbit orbit-a" /><div className="hero-orbit orbit-b" /><div className="hero-orbit orbit-c" /><span className="hero-core"><Orbit size={46} strokeWidth={1} /></span><span className="signal-label signal-one">TASK / {active}</span><span className="signal-label signal-two">DOC / {documents.length}</span><span className="signal-label signal-three">ARCHIVE / {archives.length}</span></div>
      <div className="hero-meta"><span>01 / PRIVATE BY DEFAULT</span><span>02 / DETERMINISTIC RULES</span><span>03 / TRACEABLE RECORDS</span></div>
    </section>
    <section className="metric-grid"><Metric label="进行中任务" value={active} note="未完成事项" accent="rust" /><Metric label="近七日到期" value={dueSoon} note="需要优先处理" accent="gold" /><Metric label="登记文件" value={documents.length} note="本机索引" accent="green" /><Metric label="综合台账" value={operations} note={`会议/外出/用章/物资；历史 ${archives.length}`} accent="ink" /></section>
    <div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">优先事项</span><h2>任务队列</h2></div><button className="text-button" onClick={() => onNavigate('tasks')}>查看全部 <ChevronRight size={15} /></button></div><div className="task-queue">{tasks.slice(0, 5).map((task) => <div className="queue-row" key={task.id}><span className={`priority-bar ${task.status}`} /><div className="queue-main"><strong>{task.name}</strong><span>{task.category} · {task.assigner || '未指定交办人'}</span></div><StatusPill status={task.status} /><span className="queue-date">{task.deadline || '未设截止'}</span></div>)}{!tasks.length && <EmptyState text="还没有任务" />}</div></section><section className="panel paper-panel"><div className="paper-index">公文写作速查</div><h2>先立意，再落笔。</h2><p>将“依据—行动—结果”拆开，把可核验的数据留在句子里。正式规范与写作建议分别标注，不让模型替你做判断。</p><button className="secondary-button" onClick={() => onNavigate('writing')}><Sparkles size={16} />打开写作中心</button></section></div>
    <section className="panel quick-panel"><div className="panel-heading"><div><span className="eyebrow">工作入口</span><h2>继续处理</h2></div></div><div className="quick-actions"><button onClick={() => onNavigate('meetings')}><CalendarDays size={18} /><span>记录会议</span><small>通知、时间、地点</small></button><button onClick={() => onNavigate('documents')}><FileText size={18} /><span>登记新文件</span><small>收文、发文、附件</small></button><button onClick={() => onNavigate('writing')}><BookOpen size={18} /><span>开始写作</span><small>模板、规则、版本</small></button><button onClick={() => onNavigate('migration')}><Upload size={18} /><span>导入旧数据</span><small>支持 JSON 导出文件</small></button></div></section>
  </>;
}

function Metric({ label, value, note, accent }: { label: string; value: number; note: string; accent: string }) { return <div className={`metric metric-${accent}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>; }
function StatusPill({ status }: { status: Status }) { return <span className={`status-pill ${status}`}>{statusLabels[status]}</span>; }
function EmptyState({ text }: { text: string }) { return <div className="empty-state"><FolderOpen size={22} /><span>{text}</span></div>; }
function selectRecordOnKeyboard(event: React.KeyboardEvent<HTMLDivElement>, onSelect: () => void) {
  if (event.target !== event.currentTarget || !['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  onSelect();
}

interface SelectableViewProps { selectedId?: string; onSelect: (id: string) => void; }

function TaskView({ tasks, selectedId, onSelect, search, setSearch, attachments, categoryTints, onNew, onEdit, onDelete }: { tasks: Task[]; search: string; setSearch: (value: string) => void; attachments: Attachment[]; categoryTints: ReadonlyMap<string, CategoryTint>; onNew: () => void; onEdit: (task: Task) => void; onDelete: (id: string) => void } & SelectableViewProps) {
  return <><PageHeading eyebrow="事务管理" title="任务管理" detail="把交办、进度、配合单位和工作小结放在同一条记录里。" action={<button className="primary-button" onClick={onNew}><Plus size={16} />新建任务</button>} /><div className="toolbar"><div className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索任务、类目或交办人" /></div><span className="toolbar-count">{tasks.length} 条任务</span></div><section className="panel table-panel"><div className="table-head task-columns"><span>任务</span><span>来源 / 类目</span><span>截止日期</span><span>状态</span><span /></div>{tasks.map((task) => <div className={`table-row task-columns selectable-row ${selectedId === task.id ? 'selected' : ''}`} key={task.id} tabIndex={0} title={`查看任务详情：${task.name}`} onClick={() => onSelect(task.id)} onKeyDown={(event) => selectRecordOnKeyboard(event, () => onSelect(task.id))}><div className="row-title"><strong>{task.name}</strong><small>{task.assigner || '未指定交办人'} · {task.workSummary || '尚无工作小结'} · 附件 {task.files.length}</small></div><span className="muted-cell">{task.source || '其他'}<br /><span className="category-chip"><span className={`category-dot tint-${resolveCategoryTint(task.category, categoryTints)}`} aria-hidden="true" />{task.category || '未分类'}</span></span><span className="date-cell">{task.deadline || '—'}</span><StatusPill status={task.status} /><RowActions editTitle="编辑任务" deleteTitle="删除任务" onEdit={() => onEdit(task)} onDelete={() => onDelete(task.id)} /></div>)}{!tasks.length && <EmptyState text="没有匹配的任务" />}</section><AttachmentHint count={attachments.length} /></>;
}

function MeetingView({ meetings, selectedId, onSelect, search, setSearch, onNew, onEdit, onDelete }: { meetings: MeetingRecord[]; search: string; setSearch: (value: string) => void; onNew: () => void; onEdit: (meeting: MeetingRecord) => void; onDelete: (id: string) => void } & SelectableViewProps) {
  return <><PageHeading eyebrow="会议台账" title="会议管理" detail="记录通知对象、会议时间、地点和本机附件。" action={<button className="primary-button" onClick={onNew}><Plus size={16} />新建会议</button>} /><div className="toolbar"><div className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索主题、对象、人员或地点" /></div><span className="toolbar-count">{meetings.length} 场会议</span></div><section className="panel table-panel"><div className="table-head business-columns"><span>会议主题</span><span>会议 / 通知时间</span><span>对象与接收方</span><span>地点</span><span /></div>{meetings.map((meeting) => <div className={`table-row business-columns selectable-row ${selectedId === meeting.id ? 'selected' : ''}`} key={meeting.id} tabIndex={0} title={`查看会议详情：${meeting.subject}`} onClick={() => onSelect(meeting.id)} onKeyDown={(event) => selectRecordOnKeyboard(event, () => onSelect(meeting.id))}><div className="row-title"><strong>{meeting.subject}</strong><small>{meeting.remark || '无备注'} · 附件 {meeting.files.length}</small></div><span className="muted-cell">{meeting.meetingTime ? meeting.meetingTime.replace('T', ' ') : '未设会议时间'}<br />通知 {meeting.notifyTime || '—'}</span><span className="muted-cell">{meeting.sendTo || '未填写发送对象'}<br />{meeting.receiver || '未填写接收方'}</span><span className="muted-cell">{meeting.location || '未填写'}</span><RowActions editTitle="编辑会议" deleteTitle="删除会议" onEdit={() => onEdit(meeting)} onDelete={() => onDelete(meeting.id)} /></div>)}{!meetings.length && <EmptyState text="没有匹配的会议记录" />}</section></>;
}

function DocumentView({ documents, selectedId, onSelect, search, setSearch, attachments, onNew, onEdit, onDelete }: { documents: OfficialDocument[]; search: string; setSearch: (value: string) => void; attachments: Attachment[]; onNew: () => void; onEdit: (doc: OfficialDocument) => void; onDelete: (id: string) => void } & SelectableViewProps) {
  return <><PageHeading eyebrow="文件台账" title="文件收发" detail="登记文件来源、文号、承办人和关联工作，附件留在本地。" action={<button className="primary-button" onClick={onNew}><Plus size={16} />登记文件</button>} /><div className="toolbar"><div className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索标题、文号或来源单位" /></div><span className="toolbar-count">{documents.length} 份文件</span></div><section className="panel table-panel"><div className="table-head doc-columns"><span>文件标题</span><span>文号 / 类型</span><span>来源单位</span><span>登记状态</span><span /></div>{documents.map((doc) => <div className={`table-row doc-columns selectable-row ${selectedId === doc.id ? 'selected' : ''}`} key={doc.id} tabIndex={0} title={`查看文件详情：${doc.title}`} onClick={() => onSelect(doc.id)} onKeyDown={(event) => selectRecordOnKeyboard(event, () => onSelect(doc.id))}><div className="row-title"><strong>{doc.title}</strong><small>{doc.docDate || '未设日期'} · {doc.securityLevel || '未分级'} · 附件 {doc.files.length}</small></div><span className="muted-cell">{doc.code || '无文号'}<br />{doc.docType}</span><span className="muted-cell">{doc.fromUnit || '未填写'}</span><span className="status-pill neutral">{doc.receiptStatus || '待登记'}</span><RowActions editTitle="编辑文件" deleteTitle="删除文件" onEdit={() => onEdit(doc)} onDelete={() => onDelete(doc.id)} /></div>)}{!documents.length && <EmptyState text="还没有登记文件" />}</section><AttachmentHint count={attachments.length} /></>;
}

function ResearchView({ researches, selectedId, onSelect, search, setSearch, onNew, onEdit, onDelete }: { researches: ResearchRecord[]; search: string; setSearch: (value: string) => void; onNew: () => void; onEdit: (research: ResearchRecord) => void; onDelete: (id: string) => void } & SelectableViewProps) {
  return <><PageHeading eyebrow="外勤台账" title="外出活动" detail="记录调研、会议、慰问、来访和活动成果。" action={<button className="primary-button" onClick={onNew}><Plus size={16} />新建外出活动</button>} /><div className="toolbar"><div className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索主题、类型、人员、地点或摘要" /></div><span className="toolbar-count">{researches.length} 项活动</span></div><section className="panel table-panel"><div className="table-head business-columns"><span>活动主题</span><span>日期 / 类型</span><span>参与人员</span><span>地点 / 用车</span><span /></div>{researches.map((research) => <div className={`table-row business-columns selectable-row ${selectedId === research.id ? 'selected' : ''}`} key={research.id} tabIndex={0} title={`查看外出活动详情：${research.subject}`} onClick={() => onSelect(research.id)} onKeyDown={(event) => selectRecordOnKeyboard(event, () => onSelect(research.id))}><div className="row-title"><strong>{research.subject}</strong><small>{research.achievements || research.summary || '尚无成果记录'} · 附件 {research.files.length}</small></div><span className="muted-cell">{research.researchTime || '未设日期'}<br />{research.direction}</span><span className="muted-cell">{research.participants || '未填写'}</span><span className="muted-cell">{research.location || '未填写'}<br />用车：{research.useCar || '未选择'}</span><RowActions editTitle="编辑外出活动" deleteTitle="删除外出活动" onEdit={() => onEdit(research)} onDelete={() => onDelete(research.id)} /></div>)}{!researches.length && <EmptyState text="没有匹配的外出活动" />}</section></>;
}

function SealView({ seals, selectedId, onSelect, search, setSearch, onNew, onEdit, onDelete }: { seals: SealRecord[]; search: string; setSearch: (value: string) => void; onNew: () => void; onEdit: (seal: SealRecord) => void; onDelete: (id: string) => void } & SelectableViewProps) {
  return <><PageHeading eyebrow="审批台账" title="用章管理" detail="登记用章文件、经办人、审批人和佐证附件。" action={<button className="primary-button" onClick={onNew}><Plus size={16} />新建用章记录</button>} /><div className="toolbar"><div className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索文件、用章人、审批人或类型" /></div><span className="toolbar-count">{seals.length} 次用章</span></div><section className="panel table-panel"><div className="table-head business-columns"><span>所盖文件</span><span>日期 / 类型</span><span>用章人</span><span>审批人</span><span /></div>{seals.map((seal) => <div className={`table-row business-columns selectable-row ${selectedId === seal.id ? 'selected' : ''}`} key={seal.id} tabIndex={0} title={`查看用章详情：${seal.docName}`} onClick={() => onSelect(seal.id)} onKeyDown={(event) => selectRecordOnKeyboard(event, () => onSelect(seal.id))}><div className="row-title"><strong>{seal.docName}</strong><small>{seal.remark || '无备注'} · 附件 {seal.files.length}</small></div><span className="muted-cell">{seal.sealTime || '未设日期'}<br />{seal.docType || '未分类'}</span><span className="muted-cell">{seal.userName}</span><span className="muted-cell">{seal.approver}</span><RowActions editTitle="编辑用章记录" deleteTitle="删除用章记录" onEdit={() => onEdit(seal)} onDelete={() => onDelete(seal.id)} /></div>)}{!seals.length && <EmptyState text="没有匹配的用章记录" />}</section></>;
}

function MaterialView({ materials, allMaterials, selectedId, onSelect, search, setSearch, onNew, onEdit, onDelete }: { materials: MaterialRecord[]; allMaterials: MaterialRecord[]; search: string; setSearch: (value: string) => void; onNew: () => void; onEdit: (material: MaterialRecord) => void; onDelete: (id: string) => void } & SelectableViewProps) {
  const balances = calculateMaterialStock(allMaterials);
  return <><PageHeading eyebrow="保障台账" title="物资收发" detail="按物资名称和规格汇总入库、领用与当前账面库存。" action={<button className="primary-button" onClick={onNew}><Plus size={16} />新建物资记录</button>} /><div className="toolbar"><div className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索物资、规格、经手人或单位" /></div><span className="toolbar-count">{materials.length} 笔收发</span></div><section className="panel table-panel"><div className="table-head business-columns"><span>物资名称</span><span>收发 / 数量</span><span>经手信息</span><span>账面库存</span><span /></div>{materials.map((material) => <div className={`table-row business-columns selectable-row ${selectedId === material.id ? 'selected' : ''}`} key={material.id} tabIndex={0} title={`查看物资详情：${material.materialName}`} onClick={() => onSelect(material.id)} onKeyDown={(event) => selectRecordOnKeyboard(event, () => onSelect(material.id))}><div className="row-title"><strong>{material.materialName}</strong><small>{material.spec || '无规格'} · {material.fromUnit || '未填写来源/领用单位'} · 附件 {material.files.length}</small></div><span className={`status-pill ${material.type === 'in' ? 'done' : 'pending'}`}>{material.type === 'in' ? '入库' : '领用'} {material.quantity}</span><span className="muted-cell">{material.handlerTime || '未设日期'}<br />{material.handler || '未填写经手人'}</span><span className="stock-balance">{balances.get(`${material.materialName.trim()}|${material.spec.trim()}`) || 0}</span><RowActions editTitle="编辑物资记录" deleteTitle="删除物资记录" onEdit={() => onEdit(material)} onDelete={() => onDelete(material.id)} /></div>)}{!materials.length && <EmptyState text="没有匹配的物资记录" />}</section></>;
}

interface BusinessDetailModel {
  eyebrow: string;
  title: string;
  badge: string;
  badgeClass: string;
  icon: typeof ClipboardList;
  fields: Array<{ label: string; value: string }>;
  sections: Array<{ title: string; content: React.ReactNode }>;
}

function BusinessDetailPanel({ detail, attachments, panelRef, onBackToList, onEdit }: { detail: BusinessDetail; attachments: Attachment[]; panelRef: React.RefObject<HTMLElement | null>; onBackToList: () => void; onEdit: () => void }) {
  const show = (value: string | number | undefined) => String(value ?? '').trim() || '未填写';
  const model: BusinessDetailModel = (() => {
    if (detail.kind === 'task') {
      const task = detail.record;
      return {
        eyebrow: 'TASK DETAIL', title: task.name, badge: statusLabels[task.status], badgeClass: task.status, icon: ClipboardList,
        fields: [
          { label: '工作类目', value: show(task.category) }, { label: '任务来源', value: show(task.source) },
          { label: '交办人', value: show(task.assigner) }, { label: '交办日期', value: show(task.assignDate) },
          { label: '截止日期', value: show(task.deadline) }, { label: '最近更新', value: show(task.updatedAt.replace('T', ' ').slice(0, 16)) }
        ],
        sections: [
          { title: '工作小结', content: show(task.workSummary) },
          { title: '配合单位', content: task.partnerStatus.length ? <div className="detail-tag-list">{task.partnerStatus.map((partner, index) => <span key={`${partner.name}:${index}`}><strong>{partner.name}</strong>{partnerStatusLabels[partner.status]}</span>)}</div> : '未登记配合单位' },
          { title: '任务阶段', content: task.stages.length ? <div className="detail-step-list">{task.stages.map((stage, index) => <div key={`${stage.name}:${index}`}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{stage.name}</strong><small>配合单位 {stage.partnerStatus.length}</small></div></div>)}</div> : '未登记任务阶段' },
          { title: '备注', content: show(task.remark) }
        ]
      };
    }
    if (detail.kind === 'meeting') {
      const meeting = detail.record;
      return {
        eyebrow: 'MEETING DETAIL', title: meeting.subject, badge: '会议', badgeClass: 'neutral', icon: CalendarDays,
        fields: [
          { label: '会议时间', value: show(meeting.meetingTime.replace('T', ' ')) }, { label: '通知日期', value: show(meeting.notifyTime) },
          { label: '发送对象', value: show(meeting.sendTo) }, { label: '接收方', value: show(meeting.receiver) },
          { label: '会议地点', value: show(meeting.location) }, { label: '最近更新', value: show(meeting.updatedAt.replace('T', ' ').slice(0, 16)) }
        ],
        sections: [{ title: '备注', content: show(meeting.remark) }]
      };
    }
    if (detail.kind === 'document') {
      const document = detail.record;
      return {
        eyebrow: 'DOCUMENT DETAIL', title: document.title, badge: show(document.receiptStatus), badgeClass: 'neutral', icon: FileText,
        fields: [
          { label: '发文字号', value: show(document.code) }, { label: '文件类型', value: show(document.docType) },
          { label: '文件日期', value: show(document.docDate) }, { label: '密级', value: show(document.securityLevel) },
          { label: '来源单位', value: show(document.fromUnit) }, { label: '承办人', value: show(document.handler) },
          { label: '文件归类', value: show(document.fileCategory) }, { label: '工作归类', value: show(document.workCategory) },
          { label: '发送范围', value: show(document.sendScope) }, { label: '最近更新', value: show(document.updatedAt.replace('T', ' ').slice(0, 16)) }
        ],
        sections: [{ title: '备注', content: show(document.remark) }]
      };
    }
    if (detail.kind === 'research') {
      const research = detail.record;
      return {
        eyebrow: 'FIELD DETAIL', title: research.subject, badge: research.direction, badgeClass: 'neutral', icon: MapPin,
        fields: [
          { label: '活动日期', value: show(research.researchTime) }, { label: '活动地点', value: show(research.location) },
          { label: '参与人员', value: show(research.participants) }, { label: '是否用车', value: show(research.useCar) },
          { label: '最近更新', value: show(research.updatedAt.replace('T', ' ').slice(0, 16)) }
        ],
        sections: [
          { title: '活动摘要', content: show(research.summary) },
          { title: '成果记录', content: show(research.achievements) },
          { title: '备注', content: show(research.remark) }
        ]
      };
    }
    if (detail.kind === 'seal') {
      const seal = detail.record;
      return {
        eyebrow: 'SEAL DETAIL', title: seal.docName, badge: show(seal.docType), badgeClass: 'neutral', icon: Stamp,
        fields: [
          { label: '用章日期', value: show(seal.sealTime) }, { label: '文件类型', value: show(seal.docType) },
          { label: '用章人', value: show(seal.userName) }, { label: '审批人', value: show(seal.approver) },
          { label: '最近更新', value: show(seal.updatedAt.replace('T', ' ').slice(0, 16)) }
        ],
        sections: [{ title: '备注', content: show(seal.remark) }]
      };
    }
    const material = detail.record;
    return {
      eyebrow: 'MATERIAL DETAIL', title: material.materialName, badge: material.type === 'in' ? '入库' : '领用', badgeClass: material.type === 'in' ? 'done' : 'pending', icon: Package,
      fields: [
        { label: '规格', value: show(material.spec) }, { label: '数量', value: show(material.quantity) },
        { label: '经手日期', value: show(material.handlerTime) }, { label: '经手人', value: show(material.handler) },
        { label: '来源 / 领用单位', value: show(material.fromUnit) }, { label: '最近更新', value: show(material.updatedAt.replace('T', ' ').slice(0, 16)) }
      ],
      sections: [{ title: '备注', content: show(material.remark) }]
    };
  })();
  const linkedAttachments = detail.record.files.map((id) => attachments.find((attachment) => attachment.id === id)).filter((attachment): attachment is Attachment => Boolean(attachment));
  const Icon = model.icon;
  return <aside className="panel business-detail-panel" aria-label="记录详情" ref={panelRef}>
    <div className="detail-panel-header"><span className="detail-icon"><Icon size={18} /></span><div><span className="eyebrow">{model.eyebrow}</span><h2><span className="sr-only">记录详情：</span>{model.title}</h2></div><span className={`status-pill ${model.badgeClass}`}>{model.badge}</span></div>
    <div className="detail-panel-actions"><button type="button" className="secondary-button mobile-detail-back" onClick={onBackToList}><ClipboardList size={15} />返回记录列表</button><button type="button" className="secondary-button" onClick={onEdit}><Pencil size={15} />编辑此记录</button></div>
    <dl className="detail-fields">{model.fields.map((field) => <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl>
    {model.sections.map((section) => <section className="detail-section" key={section.title}><h3>{section.title}</h3><div>{section.content}</div></section>)}
    <section className="detail-section detail-attachments"><h3>本机附件 <span>{linkedAttachments.length}</span></h3>{linkedAttachments.length ? <div>{linkedAttachments.map((attachment) => <button type="button" key={attachment.id} disabled={attachment.data === undefined} title={attachment.data === undefined ? '附件内容不可用' : `下载附件 ${attachment.name}`} onClick={() => downloadStoredAttachment(attachment)}><FileText size={14} /><span>{attachment.name}</span><small>{formatBytes(attachment.size)}</small><ArrowDownToLine size={13} /></button>)}</div> : <p>当前记录没有附件</p>}</section>
  </aside>;
}

function DirectoryManager({ directory, onSave, setToast }: { directory: ContactDirectory; onSave: (people: string[], units: string[]) => Promise<boolean>; setToast: (text: string) => void }) {
  const [people, setPeople] = useState(directory.people);
  const [units, setUnits] = useState(directory.units);
  const [newPerson, setNewPerson] = useState('');
  const [newUnit, setNewUnit] = useState('');
  useEffect(() => { setPeople(directory.people); setUnits(directory.units); }, [directory.updatedAt]);
  const dirty = JSON.stringify(people) !== JSON.stringify(directory.people) || JSON.stringify(units) !== JSON.stringify(directory.units);
  const addValue = (kind: 'people' | 'units') => {
    const value = (kind === 'people' ? newPerson : newUnit).trim();
    if (!value) return setToast(kind === 'people' ? '请填写人员姓名' : '请填写单位或处室名称');
    const current = kind === 'people' ? people : units;
    if (current.some((item) => item.trim() === value)) return setToast(`「${value}」已在${kind === 'people' ? '人员' : '单位'}常用项中`);
    if (kind === 'people') { setPeople([...people, value]); setNewPerson(''); }
    else { setUnits([...units, value]); setNewUnit(''); }
  };
  const updateValue = (kind: 'people' | 'units', index: number, value: string) => {
    if (kind === 'people') setPeople(people.map((item, itemIndex) => itemIndex === index ? value : item));
    else setUnits(units.map((item, itemIndex) => itemIndex === index ? value : item));
  };
  const removeValue = (kind: 'people' | 'units', index: number) => {
    if (kind === 'people') setPeople(people.filter((_, itemIndex) => itemIndex !== index));
    else setUnits(units.filter((_, itemIndex) => itemIndex !== index));
  };
  const save = async () => { await onSave(people, units); };
  const renderSection = (kind: 'people' | 'units') => {
    const isPeople = kind === 'people';
    const values = isPeople ? people : units;
    const pending = isPeople ? newPerson : newUnit;
    const setPending = isPeople ? setNewPerson : setNewUnit;
    const label = isPeople ? '人员' : '单位与处室';
    const Icon = isPeople ? UsersRound : Building2;
    return <section className="panel directory-panel">
      <div className="panel-heading"><div><span className="eyebrow">{isPeople ? 'PEOPLE' : 'ORGANIZATIONS'}</span><h2>{label}</h2></div><span className="directory-count"><Icon size={15} />{values.length}</span></div>
      <div className="directory-add-row"><input aria-label={`新增${label}`} value={pending} onChange={(event) => setPending(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addValue(kind); }} placeholder={isPeople ? '输入人员姓名' : '输入省直单位或机关处室'} /><button type="button" className="secondary-button" onClick={() => addValue(kind)}><Plus size={15} />添加</button></div>
      <div className="directory-list">{values.map((value, index) => <div className="directory-row" key={`${kind}:${index}`}><span className="directory-row-index">{String(index + 1).padStart(2, '0')}</span><input aria-label={`${label}常用项 ${index + 1}`} value={value} onChange={(event) => updateValue(kind, index, event.target.value)} /><button type="button" className="icon-button danger-icon" title={`删除${label}常用项 ${value || index + 1}`} onClick={() => removeValue(kind, index)}><X size={14} /></button></div>)}{!values.length && <EmptyState text={`暂无${label}常用项`} />}</div>
    </section>;
  };
  return <>
    <PageHeading eyebrow="本机目录" title="常用项管理" detail="单位、机关处室与人员分开维护，供各业务台账快速选择。" action={<button type="button" className="primary-button" disabled={!dirty} onClick={() => void save()}><Save size={16} />保存全部修改</button>} />
    <div className="directory-summary"><span>单位与处室 <strong>{units.length}</strong></span><span>人员 <strong>{people.length}</strong></span><small>修改常用项不会改写已经保存的业务记录</small></div>
    <div className="directory-grid">{renderSection('units')}{renderSection('people')}</div>
  </>;
}

const statusChartOrder: Status[] = ['pending', 'progress', 'done', 'overdue'];

const categoryTintOptions: Array<{ tint: CategoryTint; label: string }> = [
  { tint: 'acid', label: '荧光黄' },
  { tint: 'green', label: '草绿' },
  { tint: 'violet', label: '紫色' },
  { tint: 'neutral', label: '中性灰' }
];

function StatsView({ tasks, meetings, documents, researches, seals, materials, categoryTints, onSetCategoryTint }: { tasks: Task[]; meetings: MeetingRecord[]; documents: OfficialDocument[]; researches: ResearchRecord[]; seals: SealRecord[]; materials: MaterialRecord[]; categoryTints: ReadonlyMap<string, CategoryTint>; onSetCategoryTint: (name: string, tint: CategoryTint | null) => Promise<void> }) {
  const input: WorkStatisticsInput = useMemo(() => ({ tasks, meetings, documents, researches, seals, materials }), [tasks, meetings, documents, researches, seals, materials]);
  const currentMonth = localDateInput(new Date()).slice(0, 7);
  const [monthKey, setMonthKey] = useState(currentMonth);
  const [category, setCategory] = useState('');
  const monthOptions = useMemo(() => {
    const keys = new Set<string>(listStatisticsMonths(input));
    keys.add(currentMonth);
    return [...keys].sort((left, right) => right.localeCompare(left));
  }, [input, currentMonth]);
  const categoryOptions = useMemo(() => [...new Set(tasks.map((task) => task.category.trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right, 'zh-CN')), [tasks]);
  const stats = useMemo(() => buildWorkStatistics(input, { monthKey, category, today: localDateInput(new Date()) }), [input, monthKey, category]);
  const monthLabel = (key: string) => `${key.slice(0, 4)} 年 ${Number(key.slice(5, 7))} 月`;
  const periodLabel = monthKey ? monthLabel(monthKey) : '全部时间';
  const visibleCategories = stats.categoryBreakdown.slice(0, 9).map((entry) => ({ ...entry, tint: resolveCategoryTint(entry.name, categoryTints) }));
  const foldedCategories = stats.categoryBreakdown.slice(9);
  const categoryRows = foldedCategories.length
    ? [...visibleCategories, { name: `其他（${foldedCategories.length} 类）`, count: foldedCategories.reduce((total, entry) => total + entry.count, 0), tint: 'neutral' as CategoryTint }]
    : visibleCategories;
  const maxCategoryCount = Math.max(1, ...categoryRows.map((entry) => entry.count));
  const statusEntries = statusChartOrder
    .map((status) => ({ status, count: stats.statusBreakdown.find((entry) => entry.status === status)?.count || 0 }));
  const statusTotal = Math.max(1, statusEntries.reduce((total, entry) => total + entry.count, 0));
  const statusSummary = statusEntries.map((entry) => `${statusLabels[entry.status]} ${entry.count} 项`).join('，');
  return <>
    <PageHeading eyebrow="数据洞察" title="统计分析" detail="按月份和类目汇总本机台账，全部数字来自已录入的记录，不联网、不估算。" />
    <div className="toolbar stats-toolbar">
      <label className="field stats-filter"><span>统计月份</span><select aria-label="统计月份" value={monthKey} onChange={(event) => setMonthKey(event.target.value)}><option value="">全部时间</option>{monthOptions.map((key) => <option value={key} key={key}>{monthLabel(key)}</option>)}</select></label>
      <label className="field stats-filter"><span>任务类目</span><select aria-label="任务类目" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">全部类目</option>{categoryOptions.map((name) => <option value={name} key={name}>{name}</option>)}</select></label>
      <span className="toolbar-count">{periodLabel}{category ? ` · ${category}` : ''}</span>
    </div>
    <section className="metric-grid">
      <Metric label="本期任务" value={stats.taskTotal} note={`进行中 ${stats.taskProgress} · 未启动 ${stats.taskPending}`} accent="ink" />
      <Metric label="本期新建" value={stats.taskNew} note="按创建时间统计" accent="gold" />
      <Metric label="已完成" value={stats.taskDone} note="状态为已完成" accent="green" />
      <Metric label="已超期" value={stats.taskOverdue} note="含超过截止仍未完成" accent="rust" />
    </section>
    <div className="stats-grid">
      <section className="panel stats-panel">
        <div className="panel-heading"><div><span className="eyebrow">任务分布</span><h2>类目对比</h2></div><span className="toolbar-count">{stats.categoryBreakdown.reduce((total, entry) => total + entry.count, 0)} 条任务</span></div>
        <div className="stat-bar-list">
          {categoryRows.map((entry) => <div className="stat-bar-row" key={entry.name} title={`${entry.name}：${entry.count} 条任务`}><span className="stat-bar-name">{entry.name}</span><span className="stat-bar-track" aria-hidden="true"><span className={`stat-bar-fill tint-${entry.tint}`} style={{ width: `${Math.round((entry.count / maxCategoryCount) * 100)}%` }} /></span><strong className="stat-bar-value">{entry.count}</strong></div>)}
          {!categoryRows.length && <EmptyState text="本期没有任务记录" />}
        </div>
        {categoryOptions.length > 0 && <details className="category-style-manager">
          <summary>类目配色（{categoryOptions.length} 个类目）</summary>
          <p className="stats-note">默认按类目名称自动分配色板；点击色块可固定颜色，任务列表和统计条同步生效。</p>
          <div className="category-style-list">{categoryOptions.map((name) => { const resolved = resolveCategoryTint(name, categoryTints); const overridden = categoryTints.has(name); return <div className="category-style-row" key={name}><span className="category-chip"><span className={`category-dot tint-${resolved}`} aria-hidden="true" />{name}</span><div className="category-style-actions">{categoryTintOptions.map((option) => <button type="button" className={`tint-swatch tint-${option.tint} ${overridden && resolved === option.tint ? 'selected' : ''}`} title={`${name} 使用${option.label}`} aria-label={`${name} 使用${option.label}`} key={option.tint} onClick={() => void onSetCategoryTint(name, option.tint)} />)}<button type="button" className="text-button" aria-label={`${name} 恢复自动配色`} onClick={() => void onSetCategoryTint(name, null)}>自动</button></div></div>; })}</div>
        </details>}
      </section>
      <section className="panel stats-panel">
        <div className="panel-heading"><div><span className="eyebrow">任务状态</span><h2>完成情况</h2></div></div>
        <div className="stat-status-body">
          <div className="stat-segments" role="img" aria-label={`任务状态构成：${statusSummary}`}>
            {statusEntries.filter((entry) => entry.count > 0).map((entry) => <span className={`stat-segment stat-segment-${entry.status}`} style={{ flexGrow: entry.count }} key={entry.status} title={`${statusLabels[entry.status]}：${entry.count} 项`} />)}
            {statusEntries.every((entry) => entry.count === 0) && <span className="stat-segment stat-segment-empty" style={{ flexGrow: 1 }} />}
          </div>
          <div className="stat-legend">
            {statusEntries.map((entry) => <span className="stat-legend-item" key={entry.status}><span className={`stat-swatch stat-segment-${entry.status}`} aria-hidden="true" /><span>{statusLabels[entry.status]}</span><strong>{entry.count}</strong><small>{Math.round((entry.count / statusTotal) * 100)}%</small></span>)}
          </div>
          <p className="stats-note">状态构成按记录的当前状态统计；“已超期”指标另含超过截止日期仍未完成的任务。</p>
        </div>
        <div className="stats-ledger">
          <div className="stats-ledger-heading"><span className="eyebrow">同期台账</span></div>
          <div className="stats-ledger-grid"><span>会议</span><strong>{stats.meetings}</strong><span>文件</span><strong>{stats.documents}</strong><span>外出</span><strong>{stats.researches}</strong><span>用章</span><strong>{stats.seals}</strong><span>物资入库</span><strong>{stats.materialIn}</strong><span>物资领用</span><strong>{stats.materialOut}</strong></div>
        </div>
      </section>
    </div>
  </>;
}

function RowActions({ editTitle, deleteTitle, onEdit, onDelete }: { editTitle: string; deleteTitle: string; onEdit: () => void; onDelete: () => void }) {
  return <div className="row-actions" onClick={(event) => event.stopPropagation()}><button className="icon-button" title={editTitle} onClick={onEdit}><Pencil size={15} /></button><button className="icon-button danger-icon" title={deleteTitle} onClick={onDelete}><X size={15} /></button></div>;
}

const taskStatusOptions = (Object.entries(statusLabels) as Array<[Status, string]>).map(([value, label]) => ({ value, label }));

function TaskEditor({ task, isNew, directory, attachments, attachmentBusy, partnerGroups, onSaveGroup, onDeleteGroup, onRemember, onChange, onAttach, onSave, onClose, setToast }: { task: Task; isNew: boolean; directory: ContactDirectory; attachments: Attachment[]; attachmentBusy: boolean; partnerGroups: PartnerGroup[]; onSaveGroup: (name: string, members: string[]) => Promise<void>; onDeleteGroup: (group: PartnerGroup) => Promise<void>; onRemember: (kind: 'people' | 'units', value: string) => Promise<void>; onChange: (task: Task) => void; onAttach: (files: FileList) => void; onSave: () => void; onClose: () => void; setToast: (text: string) => void }) {
  const update = <K extends keyof Task,>(key: K, value: Task[K]) => onChange({ ...task, [key]: value });
  const [summaryTemplate, setSummaryTemplate] = useState<WorkSummaryTemplateId>('progress');
  const [importText, setImportText] = useState('');
  const closeGuard = useUnsavedChangesGuard({ task, importText, attachmentBusy }, onClose);
  const applySmartImport = () => {
    const result = extractTaskFromText(importText, localDateInput(new Date()));
    if (!result.recognized.length) return setToast('未识别出可填字段，请检查文字或手工填写');
    const next: Task = { ...task };
    if (result.fields.name) next.name = result.fields.name;
    if (result.fields.assigner) next.assigner = result.fields.assigner;
    if (result.fields.assignDate) next.assignDate = result.fields.assignDate;
    if (result.fields.deadline) next.deadline = result.fields.deadline;
    if (result.fields.source) next.source = result.fields.source;
    onChange(next);
    setToast(`已按本机规则填入：${result.recognized.join('、')}，请人工核对`);
  };
  return <Drawer title={isNew ? '新建任务' : '编辑任务'} dirty={closeGuard.dirty} onClose={closeGuard.requestClose}>
    <details className="smart-import">
      <summary><WandSparkles size={14} />智能识别填单（粘贴通知文字）</summary>
      <textarea aria-label="待识别文字" value={importText} placeholder={'例如：2026-07-21 张主任要求：整理台账，7月28日前完成'} onChange={(event) => setImportText(event.target.value)} />
      <div className="smart-import-actions"><small>纯本机规则识别日期、交办人、来源，不联网；识别结果会覆盖对应字段，请核对后再保存。</small><button type="button" className="secondary-button" onClick={applySmartImport}><WandSparkles size={14} />识别并填入</button></div>
    </details>
    <Field label="任务名称" value={task.name} onChange={(v) => update('name', v)} placeholder="例如：推进年度重点工作总结" />
    <div className="form-grid"><SelectField label="状态" value={task.status} options={taskStatusOptions} onChange={(v) => update('status', v as Status)} /><DateField label="截止日期" value={task.deadline} onChange={(v) => update('deadline', v)} allowEmpty /></div>
    <div className="form-grid"><Field label="工作类目" value={task.category} onChange={(v) => update('category', v)} /><ReusableField label="交办人" value={task.assigner} suggestions={directory.people} onChange={(v) => update('assigner', v)} onRemember={() => void onRemember('people', task.assigner)} /></div>
    <div className="form-grid"><Field label="任务来源" value={task.source} onChange={(v) => update('source', v)} /><DateField label="交办日期" value={task.assignDate} onChange={(v) => update('assignDate', v)} /></div>
    <PartnerStatusEditor label="配合单位" partners={task.partnerStatus} unitSuggestions={directory.units} groups={partnerGroups} manageGroups onSaveGroup={onSaveGroup} onDeleteGroup={onDeleteGroup} setToast={setToast} onChange={(partners) => update('partnerStatus', partners)} />
    <TaskStageEditor stages={task.stages} unitSuggestions={directory.units} groups={partnerGroups} setToast={setToast} onChange={(stages) => update('stages', stages)} />
    <div className="summary-generator"><SelectField label="小结模板" value={summaryTemplate} options={(Object.entries(workSummaryTemplateLabels) as Array<[WorkSummaryTemplateId, string]>).map(([value, label]) => ({ value, label }))} onChange={(value) => setSummaryTemplate(value as WorkSummaryTemplateId)} /><button type="button" className="secondary-button" onClick={() => update('workSummary', generateTaskWorkSummary(task, summaryTemplate))}><WandSparkles size={15} />一键生成小结</button></div>
    <TextArea label="工作小结" value={task.workSummary} onChange={(v) => update('workSummary', v)} placeholder="生成周报时可引用" />
    <TextArea label="备注" value={task.remark} onChange={(v) => update('remark', v)} />
    <LegacyPayloadView payload={task.legacyPayload} />
    <AttachmentField ids={task.files} attachments={attachments} onAttach={onAttach} onRemove={(id) => update('files', task.files.filter((fileId) => fileId !== id))} />
    <div className="drawer-actions"><button className="secondary-button" onClick={closeGuard.requestClose}>取消</button><button className="primary-button" disabled={attachmentBusy} onClick={onSave}>{attachmentBusy ? <RefreshCw size={16} className="attachment-save-spinner" /> : <Save size={16} />}{attachmentBusy ? '正在处理附件' : '保存任务'}</button></div>
  </Drawer>;
}

function MeetingEditor({ meeting, isNew, directory, attachments, attachmentBusy, onRemember, onChange, onAttach, onSave, onClose }: { meeting: MeetingRecord; isNew: boolean; directory: ContactDirectory; attachments: Attachment[]; attachmentBusy: boolean; onRemember: (kind: 'people' | 'units', value: string) => Promise<void>; onChange: (meeting: MeetingRecord) => void; onAttach: (files: FileList) => void; onSave: () => void; onClose: () => void }) {
  const update = <K extends keyof MeetingRecord,>(key: K, value: MeetingRecord[K]) => onChange({ ...meeting, [key]: value });
  const closeGuard = useUnsavedChangesGuard({ meeting, attachmentBusy }, onClose);
  return <Drawer title={isNew ? '新建会议' : '编辑会议'} dirty={closeGuard.dirty} onClose={closeGuard.requestClose}>
    <Field label="会议主题" value={meeting.subject} onChange={(value) => update('subject', value)} placeholder="例如：重点工作部署会" />
    <div className="form-grid"><ReusableField label="发送对象" value={meeting.sendTo} suggestions={directory.units} onChange={(value) => update('sendTo', value)} onRemember={() => void onRemember('units', meeting.sendTo)} /><ReusableField label="接收方" value={meeting.receiver} suggestions={directory.people} onChange={(value) => update('receiver', value)} onRemember={() => void onRemember('people', meeting.receiver)} /></div>
    <div className="form-grid"><DateField label="通知日期" value={meeting.notifyTime} onChange={(value) => update('notifyTime', value)} allowEmpty /><DateTimeField label="会议时间" value={meeting.meetingTime} onChange={(value) => update('meetingTime', value)} allowEmpty /></div>
    <Field label="会议地点" value={meeting.location} onChange={(value) => update('location', value)} />
    <TextArea label="备注" value={meeting.remark} onChange={(value) => update('remark', value)} />
    <LegacyPayloadView payload={meeting.legacyPayload} />
    <AttachmentField ids={meeting.files} attachments={attachments} onAttach={onAttach} onRemove={(id) => update('files', meeting.files.filter((fileId) => fileId !== id))} />
    <div className="drawer-actions"><button className="secondary-button" onClick={closeGuard.requestClose}>取消</button><button className="primary-button" disabled={attachmentBusy} onClick={onSave}>{attachmentBusy ? <RefreshCw size={16} className="attachment-save-spinner" /> : <Save size={16} />}{attachmentBusy ? '正在处理附件' : '保存会议'}</button></div>
  </Drawer>;
}

function DocumentEditor({ document, isNew, directory, attachments, attachmentBusy, onRemember, onChange, onAttach, onSave, onClose }: { document: OfficialDocument; isNew: boolean; directory: ContactDirectory; attachments: Attachment[]; attachmentBusy: boolean; onRemember: (kind: 'people' | 'units', value: string) => Promise<void>; onChange: (document: OfficialDocument) => void; onAttach: (files: FileList) => void; onSave: () => void; onClose: () => void }) {
  const update = <K extends keyof OfficialDocument,>(key: K, value: OfficialDocument[K]) => onChange({ ...document, [key]: value });
  const closeGuard = useUnsavedChangesGuard({ document, attachmentBusy }, onClose);
  return <Drawer title={isNew ? '登记文件' : '编辑文件'} dirty={closeGuard.dirty} onClose={closeGuard.requestClose}>
    <Field label="文件标题" value={document.title} onChange={(v) => update('title', v)} placeholder="例如：关于做好年度重点工作的通知" />
    <div className="form-grid"><SelectField label="文件类型" value={document.docType} options={['收文', '发文', '其他']} onChange={(v) => update('docType', v as OfficialDocument['docType'])} /><DateField label="成文日期" value={document.docDate} onChange={(v) => update('docDate', v)} /></div>
    <div className="form-grid"><Field label="发文字号" value={document.code} onChange={(v) => update('code', v)} /><ReusableField label="来源单位" value={document.fromUnit} suggestions={directory.units} onChange={(v) => update('fromUnit', v)} onRemember={() => void onRemember('units', document.fromUnit)} /></div>
    <div className="form-grid"><ReusableField label="承办人" value={document.handler} suggestions={directory.people} onChange={(v) => update('handler', v)} onRemember={() => void onRemember('people', document.handler)} /><SelectField label="登记状态" value={document.receiptStatus} options={['待登记', '已登记', '已办结', '归档']} onChange={(v) => update('receiptStatus', v)} /></div>
    <div className="form-grid"><Field label="安全级别" value={document.securityLevel} onChange={(v) => update('securityLevel', v)} /><Field label="工作类目" value={document.workCategory} onChange={(v) => update('workCategory', v)} /></div>
    <div className="form-grid"><Field label="文件归类" value={document.fileCategory} onChange={(v) => update('fileCategory', v)} /><Field label="发送范围" value={document.sendScope} onChange={(v) => update('sendScope', v)} /></div>
    <TextArea label="备注" value={document.remark} onChange={(v) => update('remark', v)} />
    <LegacyPayloadView payload={document.legacyPayload} />
    <AttachmentField ids={document.files} attachments={attachments} onAttach={onAttach} onRemove={(id) => update('files', document.files.filter((fileId) => fileId !== id))} />
    <div className="drawer-actions"><button className="secondary-button" onClick={closeGuard.requestClose}>取消</button><button className="primary-button" disabled={attachmentBusy} onClick={onSave}>{attachmentBusy ? <RefreshCw size={16} className="attachment-save-spinner" /> : <Save size={16} />}{attachmentBusy ? '正在处理附件' : '保存文件'}</button></div>
  </Drawer>;
}

const researchDirections: ResearchDirection[] = ['外出调研', '外出开会', '外出活动', '慰问活动', '上级来访'];

function ResearchEditor({ research, isNew, directory, attachments, attachmentBusy, onChange, onAttach, onSave, onClose }: { research: ResearchRecord; isNew: boolean; directory: ContactDirectory; attachments: Attachment[]; attachmentBusy: boolean; onChange: (research: ResearchRecord) => void; onAttach: (files: FileList) => void; onSave: () => void; onClose: () => void }) {
  const update = <K extends keyof ResearchRecord,>(key: K, value: ResearchRecord[K]) => onChange({ ...research, [key]: value });
  const closeGuard = useUnsavedChangesGuard({ research, attachmentBusy }, onClose);
  const appendParticipant = (person: string) => {
    const current = research.participants.split(/[、，,;；\n]/).map((value) => value.trim()).filter(Boolean);
    update('participants', [...new Set([...current, person])].join('、'));
  };
  return <Drawer title={isNew ? '新建外出活动' : '编辑外出活动'} dirty={closeGuard.dirty} onClose={closeGuard.requestClose}>
    <div className="form-grid"><DateField label="活动日期" value={research.researchTime} onChange={(value) => update('researchTime', value)} allowEmpty /><SelectField label="活动类型" value={research.direction} options={researchDirections} onChange={(value) => update('direction', value as ResearchDirection)} /></div>
    <Field label="活动主题" value={research.subject} onChange={(value) => update('subject', value)} placeholder="例如：基层治理调研" />
    <div className="form-grid"><Field label="活动地点" value={research.location} onChange={(value) => update('location', value)} /><SelectField label="是否用车" value={research.useCar} options={[{ value: '', label: '未选择' }, '是', '否']} onChange={(value) => update('useCar', value as ResearchRecord['useCar'])} /></div>
    <div className="field"><span>参与人员</span><textarea aria-label="参与人员" value={research.participants} onChange={(event) => update('participants', event.target.value)} placeholder="多人使用顿号分隔" /><CommonValuePicker ariaLabel="选择常用参与人员" suggestions={directory.people} onSelect={appendParticipant} /></div>
    <TextArea label="活动内容摘要" value={research.summary} onChange={(value) => update('summary', value)} />
    <TextArea label="成果记录" value={research.achievements} onChange={(value) => update('achievements', value)} />
    <TextArea label="备注" value={research.remark} onChange={(value) => update('remark', value)} />
    <LegacyPayloadView payload={research.legacyPayload} />
    <AttachmentField ids={research.files} attachments={attachments} onAttach={onAttach} onRemove={(id) => update('files', research.files.filter((fileId) => fileId !== id))} />
    <div className="drawer-actions"><button className="secondary-button" onClick={closeGuard.requestClose}>取消</button><button className="primary-button" disabled={attachmentBusy} onClick={onSave}>{attachmentBusy ? <RefreshCw size={16} className="attachment-save-spinner" /> : <Save size={16} />}{attachmentBusy ? '正在处理附件' : '保存活动'}</button></div>
  </Drawer>;
}

function SealEditor({ seal, isNew, directory, attachments, attachmentBusy, onRemember, onChange, onAttach, onSave, onClose }: { seal: SealRecord; isNew: boolean; directory: ContactDirectory; attachments: Attachment[]; attachmentBusy: boolean; onRemember: (kind: 'people' | 'units', value: string) => Promise<void>; onChange: (seal: SealRecord) => void; onAttach: (files: FileList) => void; onSave: () => void; onClose: () => void }) {
  const update = <K extends keyof SealRecord,>(key: K, value: SealRecord[K]) => onChange({ ...seal, [key]: value });
  const closeGuard = useUnsavedChangesGuard({ seal, attachmentBusy }, onClose);
  return <Drawer title={isNew ? '新建用章记录' : '编辑用章记录'} dirty={closeGuard.dirty} onClose={closeGuard.requestClose}>
    <DateField label="用章日期" value={seal.sealTime} onChange={(value) => update('sealTime', value)} allowEmpty />
    <div className="form-grid"><ReusableField label="用章人" value={seal.userName} suggestions={directory.people} onChange={(value) => update('userName', value)} onRemember={() => void onRemember('people', seal.userName)} /><ReusableField label="审批人" value={seal.approver} suggestions={directory.people} onChange={(value) => update('approver', value)} onRemember={() => void onRemember('people', seal.approver)} /></div>
    <Field label="所盖文件名称" value={seal.docName} onChange={(value) => update('docName', value)} />
    <SelectField label="文件类型" value={seal.docType} options={['', '请示', '报告', '通知', '函', '合同', '证明', '申请', '其他'].map((value) => ({ value, label: value || '请选择' }))} onChange={(value) => update('docType', value)} />
    <TextArea label="备注说明" value={seal.remark} onChange={(value) => update('remark', value)} />
    <LegacyPayloadView payload={seal.legacyPayload} />
    <AttachmentField ids={seal.files} attachments={attachments} onAttach={onAttach} onRemove={(id) => update('files', seal.files.filter((fileId) => fileId !== id))} />
    <div className="drawer-actions"><button className="secondary-button" onClick={closeGuard.requestClose}>取消</button><button className="primary-button" disabled={attachmentBusy} onClick={onSave}>{attachmentBusy ? <RefreshCw size={16} className="attachment-save-spinner" /> : <Save size={16} />}{attachmentBusy ? '正在处理附件' : '保存用章'}</button></div>
  </Drawer>;
}

function MaterialEditor({ material, isNew, directory, attachments, attachmentBusy, onRemember, onChange, onAttach, onSave, onClose }: { material: MaterialRecord; isNew: boolean; directory: ContactDirectory; attachments: Attachment[]; attachmentBusy: boolean; onRemember: (kind: 'people' | 'units', value: string) => Promise<void>; onChange: (material: MaterialRecord) => void; onAttach: (files: FileList) => void; onSave: () => void; onClose: () => void }) {
  const update = <K extends keyof MaterialRecord,>(key: K, value: MaterialRecord[K]) => onChange({ ...material, [key]: value });
  const closeGuard = useUnsavedChangesGuard({ material, attachmentBusy }, onClose);
  return <Drawer title={isNew ? '新建物资记录' : '编辑物资记录'} dirty={closeGuard.dirty} onClose={closeGuard.requestClose}>
    <div className="form-grid"><Field label="物资名称" value={material.materialName} onChange={(value) => update('materialName', value)} /><Field label="规格" value={material.spec} onChange={(value) => update('spec', value)} /></div>
    <div className="form-grid"><NumberField label="数量" value={material.quantity} min={1} onChange={(value) => update('quantity', value)} /><SelectField label="收发类型" value={material.type} options={[{ value: 'in', label: '入库' }, { value: 'out', label: '领用' }]} onChange={(value) => update('type', value as MaterialRecord['type'])} /></div>
    <div className="form-grid"><DateField label="经手日期" value={material.handlerTime} onChange={(value) => update('handlerTime', value)} allowEmpty /><ReusableField label="经手人" value={material.handler} suggestions={directory.people} onChange={(value) => update('handler', value)} onRemember={() => void onRemember('people', material.handler)} /></div>
    <ReusableField label="来源/领用单位" value={material.fromUnit} suggestions={directory.units} onChange={(value) => update('fromUnit', value)} onRemember={() => void onRemember('units', material.fromUnit)} />
    <TextArea label="备注" value={material.remark} onChange={(value) => update('remark', value)} />
    <LegacyPayloadView payload={material.legacyPayload} />
    <AttachmentField ids={material.files} attachments={attachments} onAttach={onAttach} onRemove={(id) => update('files', material.files.filter((fileId) => fileId !== id))} />
    <div className="drawer-actions"><button className="secondary-button" onClick={closeGuard.requestClose}>取消</button><button className="primary-button" disabled={attachmentBusy} onClick={onSave}>{attachmentBusy ? <RefreshCw size={16} className="attachment-save-spinner" /> : <Save size={16} />}{attachmentBusy ? '正在处理附件' : '保存物资'}</button></div>
  </Drawer>;
}

const partnerStatuses: PartnerStatus['status'][] = ['notified', 'pending', 'progress', 'done'];
const partnerStatusLabels: Record<PartnerStatus['status'], string> = { notified: '已通知', pending: '待反馈', progress: '进行中', done: '已完成' };

function PartnerStatusEditor({ label, partners, unitSuggestions, groups, manageGroups = false, onSaveGroup, onDeleteGroup, setToast, onChange }: { label: string; partners: PartnerStatus[]; unitSuggestions: string[]; groups: PartnerGroup[]; manageGroups?: boolean; onSaveGroup?: (name: string, members: string[]) => Promise<void>; onDeleteGroup?: (group: PartnerGroup) => Promise<void>; setToast: (text: string) => void; onChange: (partners: PartnerStatus[]) => void }) {
  const update = (index: number, patch: Partial<PartnerStatus>) => onChange(partners.map((partner, partnerIndex) => partnerIndex === index ? { ...partner, ...patch } : partner));
  const listId = useId();
  const applyGroup = (groupId: string) => {
    const group = groups.find((candidate) => candidate.id === groupId);
    if (!group) return;
    const result = mergePartnerGroupMembers(partners, group.members);
    onChange(result.partners);
    setToast(result.added ? `已从分组「${group.name}」加入 ${result.added} 个单位${result.skipped ? `，跳过已存在 ${result.skipped} 个` : ''}` : `分组「${group.name}」的单位都已在名单中`);
  };
  const saveCurrentAsGroup = () => {
    if (!onSaveGroup) return;
    const members = partners.map((partner) => partner.name.trim()).filter(Boolean);
    if (!members.length) return setToast('请先在名单中填写至少一个单位');
    const name = window.prompt('分组名称（保存当前名单，供以后一键加入）：');
    if (name === null) return;
    void onSaveGroup(name, members);
  };
  return <section className="form-section">
    <div className="form-section-heading"><span>{label}</span><button type="button" className="text-button" aria-label={`添加${label}`} onClick={() => onChange([...partners, { name: '', status: 'pending', files: [] }])}><Plus size={13} />添加单位</button></div>
    <div className="partner-group-row"><select className="common-value-picker" aria-label={`按分组添加${label}`} value="" disabled={!groups.length} onChange={(event) => { if (event.target.value) applyGroup(event.target.value); }}><option value="">{groups.length ? '按分组添加（追加合并，不覆盖）' : '暂无分组'}</option>{groups.map((group) => <option value={group.id} key={group.id}>{group.name}（{group.members.length} 个单位）</option>)}</select>{manageGroups && <button type="button" className="text-button partner-group-save" onClick={saveCurrentAsGroup}><Library size={13} />存为分组</button>}</div>
    <datalist id={listId}>{unitSuggestions.map((unit) => <option value={unit} key={unit} />)}</datalist>
    <div className="compact-rows">{partners.map((partner, index) => <div className="compact-row" key={`${label}:${index}`}><div className="compact-name-fields"><input aria-label={`${label}名称 ${index + 1}`} list={listId} value={partner.name} placeholder="输入或选择常用单位" onChange={(event) => update(index, { name: event.target.value })} /><CommonValuePicker ariaLabel={`选择${label}常用单位 ${index + 1}`} suggestions={unitSuggestions} onSelect={(name) => update(index, { name })} compact /></div><select aria-label={`${label}状态 ${index + 1}`} value={partner.status} onChange={(event) => update(index, { status: event.target.value as PartnerStatus['status'] })}>{partnerStatuses.map((status) => <option value={status} key={status}>{partnerStatusLabels[status]}</option>)}</select>{partner.files?.length ? <small>{partner.files.length} 个附件</small> : <span />}<button type="button" className="icon-button danger-icon" title={`删除${label} ${index + 1}`} onClick={() => onChange(partners.filter((_, partnerIndex) => partnerIndex !== index))}><X size={14} /></button></div>)}{!partners.length && <small className="form-empty">尚未添加；保存任务后单位会进入常用项</small>}</div>
    {manageGroups && groups.length > 0 && onDeleteGroup && <details className="partner-group-manage"><summary>分组管理（{groups.length}）</summary><div className="partner-group-list">{groups.map((group) => <div className="partner-group-item" key={group.id}><div className="skill-row-main"><strong>{group.name}</strong><small>{group.members.join('、')}</small></div><button type="button" className="icon-button danger-icon" title={`删除分组 ${group.name}`} onClick={() => void onDeleteGroup(group)}><X size={14} /></button></div>)}</div></details>}
  </section>;
}

function TaskStageEditor({ stages, unitSuggestions, groups, setToast, onChange }: { stages: TaskStage[]; unitSuggestions: string[]; groups: PartnerGroup[]; setToast: (text: string) => void; onChange: (stages: TaskStage[]) => void }) {
  const update = (index: number, patch: Partial<TaskStage>) => onChange(stages.map((stage, stageIndex) => stageIndex === index ? { ...stage, ...patch } : stage));
  return <section className="form-section">
    <div className="form-section-heading"><span>任务阶段</span><button type="button" className="text-button" onClick={() => onChange([...stages, { id: createId('stage'), name: '', partnerStatus: [] }])}><Plus size={13} />添加阶段</button></div>
    <div className="stage-list">{stages.map((stage, index) => <div className="stage-editor" key={`${stage.id}:${index}`}><div className="stage-title"><input aria-label={`阶段名称 ${index + 1}`} value={stage.name} placeholder={`阶段 ${index + 1}`} onChange={(event) => update(index, { name: event.target.value })} /><button type="button" className="icon-button danger-icon" title={`删除阶段 ${index + 1}`} onClick={() => onChange(stages.filter((_, stageIndex) => stageIndex !== index))}><X size={14} /></button></div><PartnerStatusEditor label={`阶段 ${index + 1} 配合单位`} partners={stage.partnerStatus} unitSuggestions={unitSuggestions} groups={groups} setToast={setToast} onChange={(partners) => update(index, { partnerStatus: partners })} /></div>)}{!stages.length && <small className="form-empty">尚未设置阶段</small>}</div>
  </section>;
}

function LegacyPayloadView({ payload }: { payload?: Record<string, unknown> }) {
  if (!payload || !Object.keys(payload).length) return null;
  return <details className="legacy-payload"><summary>查看迁移原始字段</summary><pre>{JSON.stringify(payload, null, 2)}</pre></details>;
}

function useUnsavedChangesGuard(value: unknown, onDiscard: () => void) {
  const initialSnapshotRef = useRef(JSON.stringify(value));
  const dirty = initialSnapshotRef.current !== JSON.stringify(value);
  useEffect(() => {
    if (!dirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);
  const requestClose = () => {
    if (dirty && !window.confirm('当前抽屉有未保存修改。确认放弃并关闭？暂存附件也会被丢弃。')) return;
    onDiscard();
  };
  return { dirty, requestClose };
}
function Drawer({ title, dirty = false, onClose, children }: { title: string; dirty?: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key !== 'Escape') return; event.preventDefault(); onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  return <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside className="drawer" role="dialog" aria-modal="true" aria-label={title}><div className="drawer-header"><div className="drawer-title"><h2>{title}</h2>{dirty && <span className="drawer-unsaved-status" aria-live="polite">未保存修改</span>}</div><button className="icon-button" title="关闭" onClick={onClose}><X size={18} /></button></div><div className="drawer-body">{children}</div></aside></div>;
}
function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) { return <label className="field"><span>{label}</span><input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>; }
function NumberField({ label, value, min, onChange }: { label: string; value: number; min?: number; onChange: (value: number) => void }) {
  const [inputValue, setInputValue] = useState(String(value));
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setInputValue(String(value)); }, [editing, value]);
  const isAcceptable = (raw: string) => { const parsed = Number(raw); return raw.trim() !== '' && Number.isInteger(parsed) && (min === undefined || parsed >= min); };
  const valid = isAcceptable(inputValue);
  return <label className={`field ${valid ? '' : 'field-invalid'}`}><span>{label}</span><input type="number" min={min} step="1" value={inputValue} aria-invalid={!valid}
    onFocus={() => setEditing(true)}
    onChange={(event) => { const raw = event.target.value; setInputValue(raw); if (isAcceptable(raw)) onChange(Number(raw)); }}
    onBlur={() => { setEditing(false); if (!isAcceptable(inputValue)) setInputValue(String(value)); }} />{!valid && <small>请输入不小于 {min ?? 0} 的整数</small>}</label>;
}
function DateField({ label, value, onChange, allowEmpty = false }: { label: string; value: string; onChange: (value: string) => void; allowEmpty?: boolean }) {
  const [inputValue, setInputValue] = useState(value);
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setInputValue(value); }, [editing, value]);
  const valid = isValidIsoDate(inputValue, allowEmpty);
  const updateInput = (next: string) => {
    setInputValue(next);
    if (isValidIsoDate(next, allowEmpty)) onChange(next);
  };
  const finishEditing = () => {
    setEditing(false);
    if (!isValidIsoDate(inputValue, allowEmpty)) setInputValue(value);
  };
  return <label className={`field date-field ${valid ? '' : 'field-invalid'}`}><span>{label}</span><input type="date" min="1900-01-01" max="9999-12-31" value={inputValue} aria-invalid={!valid} onFocus={() => setEditing(true)} onChange={(event) => updateInput(event.target.value)} onBlur={finishEditing} />{!valid && <small>请输入 1900-01-01 至 9999-12-31 之间的日期</small>}</label>;
}
function DateTimeField({ label, value, onChange, allowEmpty = false }: { label: string; value: string; onChange: (value: string) => void; allowEmpty?: boolean }) {
  const [inputValue, setInputValue] = useState(value);
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setInputValue(value); }, [editing, value]);
  const valid = isValidIsoDateTime(inputValue, allowEmpty);
  const updateInput = (next: string) => { setInputValue(next); if (isValidIsoDateTime(next, allowEmpty)) onChange(next); };
  const finishEditing = () => { setEditing(false); if (!isValidIsoDateTime(inputValue, allowEmpty)) setInputValue(value); };
  return <label className={`field date-field ${valid ? '' : 'field-invalid'}`}><span>{label}</span><input type="datetime-local" min="1900-01-01T00:00" max="9999-12-31T23:59" step="60" value={inputValue} aria-invalid={!valid} onFocus={() => setEditing(true)} onChange={(event) => updateInput(event.target.value)} onBlur={finishEditing} />{!valid && <small>请输入有效的四位年份日期和时间</small>}</label>;
}
function CommonValuePicker({ ariaLabel, suggestions, onSelect, compact = false }: { ariaLabel: string; suggestions: string[]; onSelect: (value: string) => void; compact?: boolean }) {
  return <select className={`common-value-picker ${compact ? 'compact' : ''}`} aria-label={ariaLabel} value="" disabled={!suggestions.length} onChange={(event) => { if (event.target.value) onSelect(event.target.value); }}><option value="">{suggestions.length ? '从全部常用项选择' : '暂无常用项'}</option>{suggestions.map((suggestion) => <option value={suggestion} key={suggestion}>{suggestion}</option>)}</select>;
}
function ReusableField({ label, value, suggestions, onChange, onRemember }: { label: string; value: string; suggestions: string[]; onChange: (value: string) => void; onRemember: () => void }) {
  const listId = useId();
  return <div className="field reusable-field"><span>{label}</span><div className="reusable-input"><input aria-label={label} list={listId} value={value} placeholder="输入或选择常用项" onChange={(event) => onChange(event.target.value)} /><button type="button" className="icon-button" title={`将${label}加入常用项`} onClick={onRemember}><Plus size={14} /></button></div><CommonValuePicker ariaLabel={`选择常用${label}`} suggestions={suggestions} onSelect={onChange} /><datalist id={listId}>{suggestions.map((suggestion) => <option value={suggestion} key={suggestion} />)}</datalist></div>;
}
function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) { return <label className="field"><span>{label}</span><textarea value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>; }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<string | { value: string; label: string }>; onChange: (value: string) => void }) { return <label className="field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => { const normalized = typeof option === 'string' ? { value: option, label: option } : option; return <option value={normalized.value} key={normalized.value}>{normalized.label}</option>; })}</select></label>; }
function useLatestRequest() {
  const runIdRef = useRef(0);
  const controllerRef = useRef<AbortController | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  useEffect(() => () => { runIdRef.current += 1; controllerRef.current?.abort(); controllerRef.current = undefined; }, []);
  const invalidate = () => { runIdRef.current += 1; const controller = controllerRef.current; controllerRef.current = undefined; setLoading(false); controller?.abort(); };
  const begin = () => { const runId = ++runIdRef.current; controllerRef.current?.abort(); const controller = new AbortController(); controllerRef.current = controller; setLoading(true); return { runId, signal: controller.signal }; };
  const isCurrent = (runId: number) => runId === runIdRef.current;
  const finish = (runId: number) => { if (isCurrent(runId)) { controllerRef.current = undefined; setLoading(false); } };
  const cancel = () => { if (!controllerRef.current) return false; invalidate(); return true; };
  return { loading, invalidate, begin, isCurrent, finish, cancel };
}
function ModelCatalogField({ label, value, models, onChange }: { label: string; value: string; models: string[]; onChange: (value: string) => void }) {
  const [query, setQuery] = useState('');
  const searchable = models.length > 8;
  useEffect(() => { if (!searchable) setQuery(''); }, [searchable]);
  const keyword = searchable ? query.trim().toLowerCase() : '';
  const matches = keyword ? models.filter((item) => item.toLowerCase().includes(keyword)) : models;
  const selectedOutsideFilter = Boolean(value && !matches.includes(value));
  const options: Array<string | { value: string; label: string }> = [
    ...(selectedOutsideFilter ? [{ value, label: `当前 · ${value}` }] : []),
    ...matches
  ];
  return <div className="model-catalog-field">
    <div className="model-catalog-heading"><span>MODEL CATALOG</span><strong>{models.length} 个模型</strong></div>
    {searchable && <div className="model-filter-field"><Search size={14} /><input aria-label="筛选模型" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入模型 ID 关键词" />{query && <button type="button" className="icon-button" aria-label="清除模型筛选" onClick={() => setQuery('')}><X size={13} /></button>}</div>}
    <SelectField label={label} value={value} options={options} onChange={onChange} />
    {value.length > 36 && <small className="model-current-selection"><span>当前模型</span><code>{value}</code></small>}
    {searchable && <small className={`model-filter-status ${matches.length ? '' : 'empty'}`}>{matches.length ? `匹配 ${matches.length} / ${models.length}` : '没有匹配项；当前模型仍保留，可清除筛选后重新选择'}</small>}
  </div>;
}
function ModelRequestControl({ loading, modelCount, initialLabel, refreshLabel, onRequest, onCancel, compact = false, disabled = false }: { loading: boolean; modelCount: number; initialLabel: string; refreshLabel: string; onRequest: () => void; onCancel: () => void; compact?: boolean; disabled?: boolean }) {
  const activeLabel = modelCount ? '正在刷新模型' : '正在获取模型';
  return <div className={`model-request-control ${compact ? 'compact' : ''}`}>
    <button type="button" className="secondary-button" aria-busy={loading} disabled={disabled || loading} onClick={onRequest}>{loading ? <RefreshCw size={16} className="model-request-spinner" /> : <Bot size={16} />}{loading ? activeLabel : modelCount ? refreshLabel : initialLabel}</button>
    {loading && <button type="button" className="text-button model-request-stop" onClick={onCancel}><X size={14} />停止等待</button>}
    {loading && modelCount > 0 && <small role="status">当前 {modelCount} 个模型继续可用，成功后再更新</small>}
  </div>;
}
function AiGenerationControl({ loading, disabled, idleLabel, onRequest, onCancel }: { loading: boolean; disabled: boolean; idleLabel: string; onRequest: () => void; onCancel: () => void }) {
  return <div className="ai-generation-control">
    <button type="button" className="primary-button" aria-busy={loading} disabled={disabled || loading} onClick={onRequest}>{loading ? <RefreshCw size={16} className="model-request-spinner" /> : <Sparkles size={16} />}{loading ? '正在生成结果' : idleLabel}</button>
    {loading && <button type="button" className="text-button model-request-stop" onClick={onCancel}><X size={14} />停止等待生成结果</button>}
    {loading && <small role="status">请求完成前保留上次成功结果；停止等待后迟到响应不会写入结果或历史。</small>}
  </div>;
}
function AttachmentField({ ids, attachments, onAttach, onRemove }: { ids: string[]; attachments: Attachment[]; onAttach: (files: FileList) => void; onRemove: (id: string) => void }) { const selected = ids.map((id) => attachments.find((attachment) => attachment.id === id)).filter((attachment): attachment is Attachment => Boolean(attachment)); return <div className="attachment-field"><div className="attachment-heading"><span>附件</span><small>单个文件不超过 8 MB，仅保存在本机</small></div>{selected.length > 0 && <div className="attachment-list">{selected.map((attachment) => <div className="attachment-row" key={attachment.id}><FileText size={14} /><span>{attachment.name}</span><small>{formatBytes(attachment.size)}</small><button type="button" className="icon-button" title={`下载附件 ${attachment.name}`} disabled={attachment.data === undefined} onClick={() => downloadStoredAttachment(attachment)}><ArrowDownToLine size={14} /></button><button type="button" className="icon-button danger-icon" title={`解除关联 ${attachment.name}`} onClick={() => onRemove(attachment.id)}><X size={14} /></button></div>)}</div>}<label className="attachment-picker"><Upload size={15} /><span>选择附件</span><input type="file" multiple onChange={(event) => { if (event.target.files?.length) onAttach(event.target.files); event.currentTarget.value = ''; }} /></label></div>; }
function AttachmentHint({ count }: { count: number }) { return <div className="attachment-hint"><ShieldCheck size={15} /><span>{`本机附件库 ${count} 项；打开任务或文件编辑器可继续添加。`}</span></div>; }
function bytesToBase64(bytes: Uint8Array) { let binary = ''; for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)); return btoa(binary); }
function formatBytes(size: number) { if (size < 1024) return `${size} B`; if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`; return `${(size / 1024 / 1024).toFixed(1)} MB`; }
function downloadStoredAttachment(attachment: Attachment) { if (attachment.data === undefined) return; const binary = atob(attachment.data); const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); downloadBlob(new Blob([bytes], { type: attachment.mimeType }), attachment.name); }

function WritingStudio({ draft, setDraft, customTemplates, onSaveCustomTemplate, onAiAssist, setToast }: { draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>>; customTemplates: CustomWritingTemplate[]; onSaveCustomTemplate: (template: CustomWritingTemplate) => Promise<void>; onAiAssist: (request?: AiAssistRequest) => void; setToast: (text: string) => void }) {
  const pack = knowledgePack as KnowledgePack;
  const templates: Array<WritingTemplate | CustomWritingTemplate> = [...customTemplates, ...(pack.templates as WritingTemplate[])];
  const [templateQuery, setTemplateQuery] = useState('');
  const editor = useEditor({ extensions: [StarterKit, Placeholder.configure({ placeholder: '从第一段开始，把事实、数据和动作写下来……' })], content: draft.contentHtml || `<p>一、基本情况</p><p>围绕年度重点工作，系统梳理工作进展、主要做法和实际成效。</p><p>二、主要做法</p><p>坚持目标导向，细化任务清单，明确责任分工和完成时限。</p><p>三、下一步安排</p><p>持续跟踪重点事项，及时补充数据和佐证材料。</p>`, onUpdate: ({ editor: current }) => setDraft((currentDraft) => ({ ...currentDraft, contentHtml: current.getHTML(), contentText: current.getText(), updatedAt: nowIso() })) });
  useEffect(() => { if (editor && draft.contentHtml && editor.getHTML() !== draft.contentHtml) editor.commands.setContent(draft.contentHtml); }, [editor, draft.contentHtml]);
  const selectedTemplate = templates.find((template) => template.id === draft.templateId) || templates[0];
  const lines = (draft.contentText || editor?.getText() || '').split(/\r?\n/).filter(Boolean);
  const longLines = lines.filter((line) => line.length > 45);
  const visibleTemplates = templates.filter((template) => `${template.name} ${template.documentType}`.toLowerCase().includes(templateQuery.trim().toLowerCase()));
  const saveDraft = async () => { const next = { ...draft, contentHtml: editor?.getHTML() || draft.contentHtml, contentText: editor?.getText() || draft.contentText, updatedAt: nowIso(), version: draft.version + 1 }; await putRecord('draft', next.id, next); setDraft(next); setToast('文稿版本已保存'); };
  const applyTemplate = (template: WritingTemplate | CustomWritingTemplate) => {
    if ('custom' in template) {
      editor?.commands.setContent(template.contentHtml);
      setDraft((currentDraft) => ({ ...currentDraft, title: template.name, documentType: template.documentType, templateId: template.id, contentHtml: template.contentHtml, contentText: template.contentText, updatedAt: nowIso() }));
      return;
    }
    const [outlineTitle, ...outlineBody] = template.outline; const title = outlineTitle && outlineTitle !== '标题' ? outlineTitle : template.name; const content = outlineBody.map((item, index) => `${['一', '二', '三', '四', '五'][index] || index + 1}、${item}`).join('\n'); const contentHtml = content.split('\n').map((line) => `<p>${line}</p>`).join(''); editor?.commands.setContent(contentHtml); setDraft((currentDraft) => ({ ...currentDraft, title, documentType: template.documentType, templateId: template.id, contentHtml, contentText: content, updatedAt: nowIso() }));
  };
  const importDocument = async (file?: File) => {
    if (!file) return;
    try {
      const imported = await importWritingDocument(file);
      editor?.commands.setContent(imported.contentHtml);
      setDraft((currentDraft) => ({ ...currentDraft, title: imported.title, documentType: imported.documentType, templateId: `imported:${file.name}`, contentHtml: imported.contentHtml, contentText: imported.contentText, updatedAt: nowIso() }));
      setToast(imported.warnings.length ? `文档已导入，转换器提示 ${imported.warnings.length} 项，请复核版式` : '文档已导入，可继续编辑');
    } catch (error) { setToast(error instanceof Error ? error.message : '文档导入失败'); }
  };
  const saveAsCustomTemplate = async () => {
    const contentHtml = editor?.getHTML() || draft.contentHtml;
    const contentText = editor?.getText() || draft.contentText;
    if (!draft.title.trim() || !contentText.trim()) return setToast('请先填写标题和正文');
    const timestamp = nowIso();
    const template: CustomWritingTemplate = { id: createId('custom-template'), name: draft.title.trim(), documentType: draft.documentType || '自定义文稿', outline: [draft.title.trim(), ...contentText.split(/\r?\n/).filter(Boolean)], custom: true, contentHtml, contentText, createdAt: timestamp, updatedAt: timestamp, sourceId: 'local-custom-template', sourceVersion: '本机自定义' };
    await onSaveCustomTemplate(template);
    setDraft((currentDraft) => ({ ...currentDraft, templateId: template.id }));
  };
  const downloadWord = async () => { const next = { ...draft, contentText: editor?.getText() || draft.contentText, contentHtml: editor?.getHTML() || draft.contentHtml }; downloadBlob(await exportDraftDocx(next), `${next.title || '公文文稿'}.docx`); setToast('DOCX 已生成'); };
  const downloadPdf = async () => { const next = { ...draft, contentText: editor?.getText() || draft.contentText, contentHtml: editor?.getHTML() || draft.contentHtml }; const printable = buildPrintableDocument(next); const handled = await (window as HxWindow).hxhwang?.printPdf(printable, next.title || '公文文稿'); if (!handled) { document.body.classList.add('printing-draft'); window.print(); window.setTimeout(() => document.body.classList.remove('printing-draft'), 500); } };
  const sourceLabel = (sourceId: string) => { const source = pack.sources.find((item) => item.id === sourceId); const kinds: Record<string, string> = { 'official-standard': '官方规范', 'unit-template': '单位模板', 'licensed-material': '授权教材建议' }; return { title: source?.title || sourceId, kind: kinds[source?.kind || ''] || source?.kind || '未知来源', version: source?.version || '未标版本' }; };
  const severityLabel: Record<string, string> = { advisory: '建议', warning: '警告', error: '确定性规则' };
  return <>
    <PageHeading
      eyebrow="写作中心"
      title="公文写作"
      detail="模板负责结构，规则负责提醒，事实仍由你确认。"
      action={<div className="button-row"><label className="secondary-button document-import-button"><FileUp size={16} />导入文档<input type="file" accept=".docx,.txt,.html,.htm,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/html" onChange={(event) => { void importDocument(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label><button className="secondary-button" onClick={() => { const body = editor?.getText() || draft.contentText; onAiAssist({ custom: `${draft.title}\n\n${body}`.trim(), purpose: '公文润色', changeContext: { targetLabel: '当前公文草稿', fields: [{ field: 'title', label: '标题', before: draft.title }, { field: 'contentText', label: '正文', before: body }] } }); }}><Sparkles size={16} />AI 润色</button><button className="secondary-button" onClick={() => void saveAsCustomTemplate()}><Library size={16} />保存自定义格式</button><button className="secondary-button" onClick={() => void saveDraft()}><Save size={16} />保存版本</button><button className="primary-button" onClick={() => void downloadWord()}><ArrowDownToLine size={16} />导出 DOCX</button><button className="secondary-button" onClick={() => void downloadPdf()}><FileOutput size={16} />导出 PDF</button></div>}
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
            const custom = 'custom' in template;
            const source = custom ? { kind: '本机自定义', version: template.sourceVersion || '本机' } : sourceLabel(template.sourceId || 'unit-template-demo');
            return <button className={`template-option ${selectedTemplate?.id === template.id ? 'selected' : ''}`} key={template.id} onClick={() => applyTemplate(template)}><span>{template.name}</span><small>{source.kind} · {template.sourceVersion || source.version}</small></button>;
          })}
          {!visibleTemplates.length && <div className="template-empty">未找到匹配模板</div>}
        </div>
        <div className="source-note"><ShieldCheck size={15} /><span>规则包 v{pack.version}<br />导入内容仅在本机转换，格式与事实需人工复核。</span></div>
      </aside>
      <section className="editor-panel panel">
        <div className="editor-toolbar"><div className="editor-mode"><span className="mode-dot" />离线编辑</div><div className="toolbar-hint">第 {draft.version} 个版本 · {draft.updatedAt.slice(0, 10)}</div></div>
        <div className="editor-paper"><input className="draft-title-input" aria-label="文稿标题" value={draft.title} onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, title: event.target.value, updatedAt: nowIso() }))} placeholder="请输入文稿标题" /><EditorContent editor={editor} /></div>
      </section>
      <aside className="writing-sidebar panel">
        <div className="panel-heading"><div><span className="eyebrow">校核提醒</span><h2>落笔检查</h2></div></div>
        <div className="check-list"><CheckItem ok={Boolean(draft.title)} title="文稿标题" detail={draft.title || '请先确定标题'} /><CheckItem ok={lines.length >= 3} title="结构完整" detail={`${lines.length} 行有效内容`} /><CheckItem ok={longLines.length === 0} title="句子节奏" detail={longLines.length ? `${longLines.length} 行超过建议长度` : '未发现过长句'} /><CheckItem ok={Boolean(draft.contentText)} title="事实待核" detail="数据、时间和单位需人工确认" /></div>
        <div className="advice-list">{pack.rules.map((rule) => { const source = sourceLabel(rule.sourceId); return <div className="advice" key={rule.id}><span className={`advice-level ${rule.severity}`} /> <div><strong>{rule.title}</strong><p>{rule.description}</p><small>{source.kind} · {source.title}<br />版本：{rule.sourceVersion || source.version} · 严重程度：{severityLabel[rule.severity]}</small></div></div>; })}</div>
      </aside>
    </div>
    <div className="print-only"><h1>{draft.title}</h1><div>{draftBodyLines(draft).map((line, index) => <p key={`${index}:${line}`}>{line}</p>)}</div></div>
  </>;
}

function CheckItem({ ok, title, detail }: { ok: boolean; title: string; detail: string }) { return <div className="check-item"><span className={`check-icon ${ok ? 'ok' : 'pending'}`}>{ok ? <Check size={13} /> : <AlertTriangle size={13} />}</span><div><strong>{title}</strong><small>{detail}</small></div></div>; }

function localDateInput(date: Date) { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; }
function defaultWeekRange() { const end = new Date(); const start = new Date(end); start.setDate(end.getDate() - ((end.getDay() + 6) % 7)); return { startDate: localDateInput(start), endDate: localDateInput(end) }; }
function composeWeeklyReport(tasks: Task[], meetings: MeetingRecord[], documents: OfficialDocument[], researches: ResearchRecord[], seals: SealRecord[], materials: MaterialRecord[], startDate: string, endDate: string, template: WeeklyTemplate = DEFAULT_WEEKLY_TEMPLATE): WeeklyReport {
  const summary = buildWeeklyReportSummary(tasks, documents, startDate, endDate, { meetings, researches, seals, materials }, template);
  return { id: '', title: `工作周报（${startDate}至${endDate}）`, startDate, endDate, contentText: summary.contentText, taskIds: summary.taskIds, documentIds: summary.documentIds, meetingIds: summary.meetingIds, researchIds: summary.researchIds, sealIds: summary.sealIds, materialIds: summary.materialIds, version: 0, createdAt: '', updatedAt: nowIso() };
}
function weeklyAsDraft(report: WeeklyReport): Draft { return { id: `draft:${report.id || 'weekly'}`, title: report.title, documentType: '工作周报', contentHtml: '', contentText: report.contentText, templateId: 'weekly-report', version: report.version, updatedAt: report.updatedAt }; }

function WeeklyView({ tasks, meetings, documents, researches, seals, materials, reports, templates, onSave, onDelete, onSaveTemplate, onDeleteTemplate, onAiAssist, setToast }: { tasks: Task[]; meetings: MeetingRecord[]; documents: OfficialDocument[]; researches: ResearchRecord[]; seals: SealRecord[]; materials: MaterialRecord[]; reports: WeeklyReport[]; templates: WeeklyTemplate[]; onSave: (report: WeeklyReport) => Promise<WeeklyReport>; onDelete: (id: string) => Promise<void>; onSaveTemplate: (name: string, sections: WeeklyTemplateSection[], id?: string) => Promise<string | null>; onDeleteTemplate: (template: WeeklyTemplate) => Promise<void>; onAiAssist: (request?: AiAssistRequest) => void; setToast: (text: string) => void }) {
  const initialRange = useMemo(defaultWeekRange, []);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [templateId, setTemplateId] = useState('');
  const selectedTemplate = templates.find((template) => template.id === templateId) || DEFAULT_WEEKLY_TEMPLATE;
  const current = report ?? composeWeeklyReport(tasks, meetings, documents, researches, seals, materials, initialRange.startDate, initialRange.endDate, selectedTemplate);
  const update = <K extends keyof WeeklyReport,>(key: K, value: WeeklyReport[K]) => setReport({ ...current, [key]: value, updatedAt: nowIso() });
  const regenerate = () => { try { setReport({ ...composeWeeklyReport(tasks, meetings, documents, researches, seals, materials, current.startDate, current.endDate, selectedTemplate), id: current.id, createdAt: current.createdAt, version: current.version }); setToast(selectedTemplate.id === DEFAULT_WEEKLY_TEMPLATE.id ? '已按日期重新汇总全部业务模块' : `已按模板「${selectedTemplate.name}」重新汇总`); } catch (error) { setToast(error instanceof Error ? error.message : '周报生成失败'); } };
  const save = async () => { try { setReport(await onSave(current)); } catch (error) { setToast(error instanceof Error ? error.message : '周报保存失败'); } };
  const remove = async (id: string) => { await onDelete(id); if (current.id === id) setReport(null); };
  const downloadWord = async () => { downloadBlob(await exportDraftDocx(weeklyAsDraft(current)), `${current.title || '工作周报'}.docx`); setToast('周报 DOCX 已生成'); };
  const downloadPdf = async () => { const printable = buildPrintableDocument(weeklyAsDraft(current)); const handled = await desktopBridge()?.printPdf(printable, current.title || '工作周报'); if (!handled) { document.body.classList.add('printing-draft'); window.print(); window.setTimeout(() => document.body.classList.remove('printing-draft'), 500); } };
  return <>
    <PageHeading eyebrow="阶段汇总" title="周报生成" detail="按日期汇总本地任务和文件，保存后可继续编辑和导出。" action={<div className="button-row"><button className="secondary-button" onClick={() => setReport(null)}><Plus size={16} />新建</button><button className="secondary-button" onClick={() => onAiAssist({ custom: `${current.title}\n\n${current.contentText}`.trim(), purpose: '周报润色', changeContext: { targetLabel: '当前周报', fields: [{ field: 'title', label: '标题', before: current.title }, { field: 'contentText', label: '正文', before: current.contentText }] } })}><Sparkles size={16} />AI 润色</button><button className="secondary-button" onClick={() => void save()}><Save size={16} />保存版本</button><button className="primary-button" onClick={() => void downloadWord()}><ArrowDownToLine size={16} />导出 DOCX</button><button className="secondary-button" onClick={() => void downloadPdf()}><FileOutput size={16} />导出 PDF</button></div>} />
    <div className="weekly-layout">
      <aside className="panel weekly-controls">
        <div className="panel-heading"><div><span className="eyebrow">素材范围</span><h2>汇总设置</h2></div></div>
        <div className="weekly-control-body"><DateField label="开始日期" value={current.startDate} onChange={(value) => update('startDate', value)} /><DateField label="结束日期" value={current.endDate} onChange={(value) => update('endDate', value)} /><SelectField label="周报模板" value={templates.some((template) => template.id === templateId) ? templateId : ''} options={[{ value: '', label: '默认周报结构' }, ...templates.map((template) => ({ value: template.id, label: template.name }))]} onChange={setTemplateId} /><button className="primary-button weekly-generate" onClick={regenerate}><RefreshCw size={15} />重新汇总</button><div className="weekly-source-count"><span>任务</span><strong>{current.taskIds.length}</strong><span>文件</span><strong>{current.documentIds.length}</strong><span>会议</span><strong>{current.meetingIds?.length || 0}</strong><span>外出</span><strong>{current.researchIds?.length || 0}</strong><span>用章</span><strong>{current.sealIds?.length || 0}</strong><span>物资</span><strong>{current.materialIds?.length || 0}</strong></div></div>
        <div className="weekly-history-heading"><span>已保存周报</span><small>{reports.length} 份</small></div>
        <div className="weekly-history">{[...reports].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).map((saved) => <div className={`weekly-history-row ${saved.id === current.id ? 'selected' : ''}`} key={saved.id}><button className="weekly-history-open" onClick={() => setReport(saved)}><strong>{saved.title}</strong><small>{saved.startDate} 至 {saved.endDate} · v{saved.version}</small></button><button className="icon-button danger-icon" title={`删除周报 ${saved.title}`} onClick={() => void remove(saved.id)}><X size={14} /></button></div>)}{!reports.length && <small className="form-empty weekly-empty">暂无已保存周报</small>}</div>
      </aside>
      <section className="panel weekly-editor-panel">
        <div className="weekly-editor-toolbar"><span>{current.id ? `已保存版本 v${current.version}` : '未保存草稿'}</span><button className="text-button" onClick={() => { void navigator.clipboard?.writeText(current.contentText); setToast('周报正文已复制'); }}><ClipboardList size={14} />复制正文</button></div>
        <div className="weekly-paper"><textarea className="draft-title-input weekly-title-input" rows={1} aria-label="周报标题" value={current.title} onChange={(event) => update('title', event.target.value)} /><textarea aria-label="周报正文" value={current.contentText} onChange={(event) => update('contentText', event.target.value)} /></div>
      </section>
    </div>
    <WeeklyTemplateManager templates={templates} onUse={setTemplateId} onSaveTemplate={onSaveTemplate} onDeleteTemplate={onDeleteTemplate} setToast={setToast} />
    <div className="print-only"><h1>{current.title}</h1><div>{splitWeeklyLines(current.contentText).map((line, index) => <p key={`${index}:${line}`}>{line}</p>)}</div></div>
  </>;
}
function splitWeeklyLines(content: string) { return content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean); }

const weeklySourceOptions = (Object.entries(weeklySectionSourceLabels) as Array<[WeeklySectionSource, string]>).map(([value, label]) => ({ value, label }));

function WeeklyTemplateManager({ templates, onUse, onSaveTemplate, onDeleteTemplate, setToast }: { templates: WeeklyTemplate[]; onUse: (id: string) => void; onSaveTemplate: (name: string, sections: WeeklyTemplateSection[], id?: string) => Promise<string | null>; onDeleteTemplate: (template: WeeklyTemplate) => Promise<void>; setToast: (text: string) => void }) {
  const cloneSections = (sections: WeeklyTemplateSection[]) => sections.map((section) => ({ ...section }));
  const [editingId, setEditingId] = useState('');
  const [name, setName] = useState('');
  const [sections, setSections] = useState<WeeklyTemplateSection[]>(cloneSections(DEFAULT_WEEKLY_TEMPLATE.sections));
  const [sampleText, setSampleText] = useState('');
  const updateSection = (index: number, patch: Partial<WeeklyTemplateSection>) => setSections(sections.map((section, sectionIndex) => sectionIndex === index ? { ...section, ...patch } : section));
  const moveSection = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next);
  };
  const loadTemplate = (template: WeeklyTemplate) => { setEditingId(template.id); setName(template.name); setSections(cloneSections(template.sections)); };
  const resetDefault = () => { setEditingId(''); setName(''); setSections(cloneSections(DEFAULT_WEEKLY_TEMPLATE.sections)); };
  const save = async () => { const id = await onSaveTemplate(name, sections, editingId || undefined); if (id) setEditingId(id); };
  const extract = () => {
    try {
      const result = extractWeeklyTemplateFromSample(sampleText);
      setEditingId(''); setName(result.name); setSections(result.sections);
      setToast(`已从范文提取 ${result.sections.length} 个章节，请检查后保存`);
    } catch (error) { setToast(error instanceof Error ? error.message : '范文结构提取失败'); }
  };
  const importJson = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = parseWeeklyTemplate(JSON.parse(await file.text()));
      setEditingId(''); setName(parsed.name); setSections(parsed.sections);
      setToast(`模板 JSON 已载入 ${parsed.sections.length} 个章节，请检查后保存`);
    } catch (error) { setToast(error instanceof Error ? `模板导入失败：${error.message}` : '模板导入失败'); }
  };
  const exportJson = () => {
    downloadBlob(new Blob([JSON.stringify({ format: 'hxhwang-gw-weekly-template-v1', name: name.trim() || '周报模板', sections }, null, 2)], { type: 'application/json' }), `${name.trim() || '周报模板'}.json`);
    setToast('模板 JSON 已导出');
  };
  return <section className="panel weekly-template-panel">
    <div className="panel-heading"><div><span className="eyebrow">周报模板</span><h2>章节结构管理</h2></div><span className="toolbar-count">{templates.length} 个自定义模板</span></div>
    <div className="weekly-template-body">
      <p className="skill-note">模板只决定章节顺序、标题和数据来源；自动章节仍由本机记录确定性汇总，“手工填写”章节只插入占位提示，不会编造事实。模板保存在本机设置库并进入快照备份。</p>
      {templates.length > 0 && <div className="weekly-template-list">{templates.map((template) => <div className="weekly-template-row" key={template.id}><div className="skill-row-main"><strong>{template.name}</strong><small>{template.sections.length} 个章节 · {template.updatedAt?.slice(0, 10) || '—'}</small></div><div className="weekly-template-row-actions"><button type="button" className="text-button" onClick={() => onUse(template.id)}>使用</button><button type="button" className="text-button" onClick={() => loadTemplate(template)}>编辑</button><button type="button" className="icon-button danger-icon" title={`删除模板 ${template.name}`} onClick={() => void onDeleteTemplate(template)}><X size={14} /></button></div></div>)}</div>}
      <div className="weekly-template-editor">
        <div className="weekly-template-editor-head"><Field label="模板名称" value={name} onChange={setName} placeholder={editingId ? '正在编辑已保存模板' : '例如：科室周报（亮点版）'} /><div className="weekly-template-head-actions"><button type="button" className="secondary-button" onClick={resetDefault}><RefreshCw size={14} />载入默认结构</button><button type="button" className="secondary-button" onClick={exportJson}><ArrowDownToLine size={14} />导出 JSON</button><label className="secondary-button document-import-button"><FileUp size={14} />导入 JSON<input type="file" accept="application/json,.json" onChange={(event) => { void importJson(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label></div></div>
        <div className="weekly-template-sections">
          {sections.map((section, index) => <div className="weekly-template-section" key={index}>
            <span className="weekly-template-ordinal">{index + 1}</span>
            <input aria-label={`章节标题 ${index + 1}`} value={section.heading} placeholder="章节标题" onChange={(event) => updateSection(index, { heading: event.target.value })} />
            <select aria-label={`章节来源 ${index + 1}`} value={section.source} onChange={(event) => updateSection(index, { source: event.target.value as WeeklySectionSource })}>{weeklySourceOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select>
            {section.source === 'manual' ? <input aria-label={`章节占位 ${index + 1}`} value={section.note || ''} placeholder="占位提示（可空）" onChange={(event) => updateSection(index, { note: event.target.value })} /> : <span className="weekly-template-auto">自动</span>}
            <div className="weekly-template-section-actions"><button type="button" className="icon-button" title={`上移章节 ${index + 1}`} disabled={index === 0} onClick={() => moveSection(index, -1)}><ChevronRight size={14} className="rotate-up" /></button><button type="button" className="icon-button" title={`下移章节 ${index + 1}`} disabled={index === sections.length - 1} onClick={() => moveSection(index, 1)}><ChevronRight size={14} className="rotate-down" /></button><button type="button" className="icon-button danger-icon" title={`删除章节 ${index + 1}`} onClick={() => setSections(sections.filter((_, sectionIndex) => sectionIndex !== index))}><X size={14} /></button></div>
          </div>)}
        </div>
        <div className="weekly-template-editor-actions">
          <button type="button" className="text-button" onClick={() => { if (sections.length >= 20) return setToast('最多 20 个章节'); setSections([...sections, { heading: '', source: 'manual' }]); }}><Plus size={13} />添加章节</button>
          <button type="button" className="primary-button" onClick={() => void save()}><Save size={15} />{editingId ? '更新模板' : '保存模板'}</button>
        </div>
        <details className="weekly-sample-extract">
          <summary><WandSparkles size={14} />从范文提取结构（本机识别，不联网）</summary>
          <textarea aria-label="范文内容" value={sampleText} placeholder={'粘贴一篇结构好的范文，识别“一、……”“（一）……”样式的章节标题'} onChange={(event) => setSampleText(event.target.value)} />
          <div className="smart-import-actions"><small>识别标题层级并推断数据来源；无法对应自动汇总的章节会设为“手工填写”，并附范文该节开头作占位提示。</small><button type="button" className="secondary-button" onClick={extract}><WandSparkles size={14} />提取结构</button></div>
        </details>
      </div>
    </div>
  </section>;
}
function ArchiveView({ archives, settings, attachments, onCopy }: { archives: ArchiveRecord[]; settings: Array<Record<string, unknown>>; attachments: Attachment[]; onCopy: (record: ArchiveRecord) => void }) {
  return <><PageHeading eyebrow="历史保留" title="历史档案" detail="迁移原件保持只读；会议、外出、用章和物资可复制为新的可编辑记录。" /><section className="panel table-panel"><div className="table-head archive-columns"><span>类型</span><span>记录标题</span><span>日期</span><span>来源版本</span></div>{archives.map((record) => { const linkedAttachments = record.files.map((id) => attachments.find((attachment) => attachment.id === id)).filter((attachment): attachment is Attachment => Boolean(attachment)); const copyable = ['meeting', 'research', 'seal', 'material'].includes(record.type); return <div className="table-row archive-columns" key={record.id}><span className="archive-type">{record.type}</span><div className="row-title"><strong>{record.title}</strong><small>{record.summary || '无摘要'}</small>{linkedAttachments.length > 0 && <div className="archive-attachments">{linkedAttachments.map((attachment) => { const available = attachment.data !== undefined && Boolean(attachment.sha256); return <button key={attachment.id} aria-label={`下载附件 ${attachment.name}`} title={available ? '下载本地附件' : '附件内容不可用'} disabled={!available} onClick={() => downloadStoredAttachment(attachment)}><ArrowDownToLine size={13} /><span>{attachment.name}</span></button>; })}</div>}{copyable && <button className="text-button archive-copy" onClick={() => onCopy(record)}><Plus size={13} />复制为新记录</button>}<LegacyPayloadView payload={record.legacyPayload} /></div><span className="muted-cell">{record.date || '—'}</span><span className="muted-cell">{record.sourceVersion}</span></div>; })}{!archives.length && <EmptyState text="暂无历史业务档案，可从数据迁移导入" />}</section>
    <section className="panel legacy-settings-panel"><div className="panel-heading"><div><span className="eyebrow">只读保留</span><h2>历史 Skill 与配置</h2></div><span className="toolbar-count">{settings.length} 项</span></div><div className="legacy-setting-list">{settings.map((setting, index) => { const skill = setting.type === 'legacy-skill'; const title = String(skill ? setting.name || setting.id || '未命名 Skill' : setting.id || '未命名配置'); const content = skill ? String(setting.content || '') : stringifyLegacyValue(setting.value); return <details className="legacy-setting" key={`${title}:${index}`}><summary><span>{skill ? 'Skill' : '配置'}</span><strong>{title}</strong><small>{String(setting.sourceVersion || '未标来源')}</small></summary><pre>{content}</pre>{skill && Boolean(setting.legacyPayload) && <pre>{JSON.stringify(setting.legacyPayload, null, 2)}</pre>}</details>; })}{!settings.length && <EmptyState text="暂无历史 Skill 或配置" />}</div></section>
  </>;
}
function stringifyLegacyValue(value: unknown) { if (typeof value === 'string') return value; const serialized = JSON.stringify(value, null, 2); return serialized === undefined ? String(value) : serialized; }

function MigrationView({ onImport, onRestore, onReload, setToast }: {
  onImport: (bundle: MigrationBundle) => Promise<MigrationReport>;
  onRestore: (snapshot: unknown) => Promise<MigrationReport>;
  onReload: () => Promise<void>;
  setToast: (text: string) => void;
}) {
  const [report, setReport] = useState<MigrationReport | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const importFile = async (file?: File) => {
    if (!file) return;
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
    downloadBlob(blob, `hxhwang-gw-本地快照-${localDateInput(new Date())}.json`);
    setSnapshot('已导出当前本地快照');
  };
  return <>
    <PageHeading eyebrow="数据边界" title="数据迁移" detail="旧版导出和本地快照都只在本机解析，不会上传或清空现有数据。" />
    <div className="migration-grid">
      <section className="panel migration-card">
        <div className="migration-icon"><Upload size={22} /></div>
        <h2>导入 JSON / 快照</h2>
        <p>自动识别两版历史导出与 HxHwang Gw 本地快照；同 ID 记录以导入内容更新。</p>
        <label className={`file-drop ${dragActive ? 'drag-active' : ''}`} onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setDragActive(true); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragActive(false); }} onDrop={(event) => { event.preventDefault(); setDragActive(false); const file = event.dataTransfer.files[0]; if (file) void importFile(file); }}><input aria-label="选择 JSON 文件" type="file" accept="application/json,.json" onChange={(event) => { void importFile(event.target.files?.[0]); event.currentTarget.value = ''; }} /><Upload size={18} /><span>{dragActive ? '松开即可导入' : '拖拽 JSON 到这里，或点击选择'}</span><small>文件选择与拖拽使用同一套本机解析和校验</small></label>
      </section>
      <section className="panel migration-card">
        <div className="migration-icon"><FileArchive size={22} /></div>
        <h2>导出本地快照</h2>
        <p>将任务、文件、草稿、周报、历史档案和附件导出为可恢复快照。</p>
        <button className="secondary-button" onClick={() => void exportSnapshot()}><ArrowDownToLine size={16} />导出快照</button>
        {snapshot && <small className="success-text">{snapshot}</small>}
      </section>
    </div>
    {report && <section className="panel report-panel"><div className="panel-heading"><div><span className="eyebrow">迁移报告</span><h2>{report.sourceVersion}</h2></div><button className="icon-button" title="刷新数据" onClick={() => void onReload()}><RefreshCw size={16} /></button></div><div className="report-metrics">{Object.entries(report.imported).map(([key, value]) => <div key={key}><strong>{value}</strong><span>{key}</span></div>)}<div><strong>{report.attachments}</strong><span>附件</span></div></div>{report.warnings.map((warning) => <p className="warning-line" key={warning}><AlertTriangle size={14} />{warning}</p>)}</section>}
  </>;
}

interface AiWorkspaceData {
  tasks: Task[];
  meetings: MeetingRecord[];
  documents: OfficialDocument[];
  researches: ResearchRecord[];
  seals: SealRecord[];
  materials: MaterialRecord[];
  weeklyReports: WeeklyReport[];
  draft: Draft;
}

const aiPurposeOptions = ['任务总结', '综合工作总结', '周报润色', '公文润色', '提纲生成', '自定义处理'];
const aiSourceOptions = [
  { value: 'draft', label: '当前公文草稿' },
  { value: 'tasks', label: '全部未完成任务' },
  { value: 'weekly', label: '最近保存的周报' },
  { value: 'workspace', label: '全部业务台账摘要' },
  { value: 'custom', label: '自定义材料' }
];

function buildAiWorkspaceMaterial(source: string, data: AiWorkspaceData) {
  if (source === 'draft') return `${data.draft.title}\n\n${data.draft.contentText}`.trim();
  if (source === 'tasks') return data.tasks.filter((task) => task.status !== 'done').map((task, index) => `${index + 1}. ${task.name}｜状态：${statusLabels[task.status]}｜交办人：${task.assigner || '未填写'}｜截止：${task.deadline || '未设置'}｜小结：${task.workSummary || '未填写'}`).join('\n');
  if (source === 'weekly') {
    const latest = [...data.weeklyReports].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
    return latest ? `${latest.title}\n\n${latest.contentText}` : '';
  }
  if (source === 'workspace') {
    return [
      '【任务】', ...data.tasks.map((task) => `${task.name}｜${statusLabels[task.status]}｜${task.workSummary || task.remark || '无小结'}`),
      '【会议】', ...data.meetings.map((meeting) => `${meeting.subject}｜${meeting.meetingTime || meeting.notifyTime || '未设日期'}｜${meeting.location || '未设地点'}`),
      '【文件】', ...data.documents.map((document) => `${document.title}｜${document.docType}｜${document.receiptStatus || '未登记'}`),
      '【外出活动】', ...data.researches.map((research) => `${research.direction}：${research.subject}｜${research.achievements || research.summary || '无成果记录'}`),
      '【用章】', ...data.seals.map((seal) => `${seal.docName}｜用章人${seal.userName}｜审批人${seal.approver}`),
      '【物资】', ...data.materials.map((material) => `${material.type === 'in' ? '入库' : '领用'}：${material.materialName}${material.spec ? `（${material.spec}）` : ''}×${material.quantity}`)
    ].join('\n');
  }
  return '';
}

function AboutView({ desktop, distribution, weeklyReports, onNavigate }: { desktop: boolean; distribution: 'public' | 'intranet' | 'internet'; weeklyReports: WeeklyReport[]; onNavigate: (tab: Tab) => void }) {
  const modeName = distribution === 'internet' ? '互联网版' : distribution === 'intranet' ? '内网版' : '公开演示版';
  const description = distribution === 'internet'
    ? '互联网版仅在你明确配置兼容 API、选择模型并确认脱敏内容后发起请求，API Key 只保留在当前会话。'
    : distribution === 'intranet'
      ? '内网版只连接单位内部部署的同步服务和 AI 网关，模型密钥始终保存在服务端。'
      : '公开 Pages 将业务数据保存在当前浏览器；只有在你填写会话级 API Key、检查脱敏预览并逐次确认后，才会请求所选模型服务。';
  return <>
    <PageHeading eyebrow="系统信息" title="关于 HxHwang Gw" detail="一个面向公文事务和写作工作的本地优先工作台。" action={<a className="primary-button" href="#download-center"><ArrowDownToLine size={16} />下载安装包</a>} />
    <section className="about-grid"><div className="panel about-hero"><span className="about-mark" aria-hidden="true"><Orbit size={28} strokeWidth={1.2} /></span><span className="eyebrow">HxHwang Gw · v{__APP_VERSION__}</span><h2>让材料有来源，让事项有去处。</h2><p>{description}</p><div className="about-links"><a href="mailto:Rays688888@Gmail.com"><Info size={15} />Rays688888@Gmail.com</a><a href="https://nextweb4.github.io/" target="_blank" rel="noreferrer"><BookOpen size={15} />nextweb4.github.io</a></div></div><div className="panel about-list"><div><span>作者</span><strong>HaoXiangHwang</strong></div><div><span>版本</span><strong>{__APP_VERSION__}</strong></div><div><span>构建时间</span><strong>{new Date(__BUILD_TIME__).toLocaleString('zh-CN')}</strong></div><div><span>运行模式</span><strong>{desktop ? `桌面${modeName}` : modeName}</strong></div><div><span>数据位置</span><strong>浏览器 IndexedDB</strong></div><div><span>已保存周报</span><strong>{weeklyReports.length}</strong></div><div><span>项目许可</span><strong>保留全部权利</strong></div><div><span>版权</span><strong>Copyright (c) 2026 HaoXiangHwang</strong></div><div><span>规则包</span><strong>v{(knowledgePack as KnowledgePack).version} · 来源已标注</strong></div></div></section>
    <DownloadCenter />
    <section className="panel about-pointer"><div className="panel-heading"><div><span className="eyebrow">{distribution === 'intranet' ? '内部服务入口' : 'AI 服务入口'}</span><h2>{distribution === 'intranet' ? '同步与内部 AI 在「AI 助手」' : 'AI 配置与独立工作台'}</h2></div><Sparkles size={20} /></div><p className="about-pointer-note">{distribution === 'intranet' ? '内网同步和内部模型配置集中在「AI 助手」；从写作或周报发起时，同一会话会在当前页面侧栏完成脱敏、确认和结果展示。' : '服务商、模型与会话级 API Key 在「AI 助手」配置；从写作或周报发起时，同一会话会在当前页面侧栏完成脱敏、确认和结果展示。'}</p><div className="about-pointer-actions"><button className="secondary-button" onClick={() => onNavigate('ai')}><Sparkles size={16} />打开 AI 助手</button></div></section>
  </>;
}

function DownloadCenter() {
  const [edition, setEdition] = useState<'internet' | 'intranet'>('internet');
  const releaseBase = `https://github.com/NextWeb4/gw/releases/download/v${__APP_VERSION__}`;
  const editionLabel = edition === 'internet' ? '互联网版' : '内网版';
  const downloads = [
    { platform: 'Windows', architecture: 'x64', note: '多数 Intel / AMD 电脑', file: `HxHwang-Gw-${__APP_VERSION__}-${edition}-x64-setup.exe` },
    { platform: 'Windows', architecture: 'ARM64', note: 'Windows on ARM 设备', file: `HxHwang-Gw-${__APP_VERSION__}-${edition}-arm64-setup.exe` },
    { platform: 'Linux DEB', architecture: 'amd64', note: 'Debian / Ubuntu Intel 或 AMD', file: `HxHwang-Gw-${__APP_VERSION__}-${edition}-amd64.deb` },
    { platform: 'Linux DEB', architecture: 'arm64', note: 'Debian / Ubuntu ARM', file: `HxHwang-Gw-${__APP_VERSION__}-${edition}-arm64.deb` },
    { platform: 'Linux AppImage', architecture: 'x86_64', note: '免安装 Intel / AMD', file: `HxHwang-Gw-${__APP_VERSION__}-${edition}-x86_64.AppImage` },
    { platform: 'Linux AppImage', architecture: 'arm64', note: '免安装 ARM', file: `HxHwang-Gw-${__APP_VERSION__}-${edition}-arm64.AppImage` }
  ];
  return <section className="panel download-center" id="download-center">
    <div className="panel-heading"><div><span className="eyebrow">DESKTOP DOWNLOADS</span><h2>下载桌面客户端</h2></div><a className="text-button" href={`${releaseBase}/SHA256SUMS.txt`}><ShieldCheck size={14} />校验文件</a></div>
    <div className="download-edition-switch" role="group" aria-label="选择安装包版本"><button type="button" className={edition === 'internet' ? 'active' : ''} onClick={() => setEdition('internet')}><Globe2 size={15} />互联网版</button><button type="button" className={edition === 'intranet' ? 'active' : ''} onClick={() => setEdition('intranet')}><Server size={15} />内网版</button></div>
    <p className="download-note">当前选择：<strong>{editionLabel}</strong>。系统无法可靠判断 CPU 架构，请在 Windows“系统类型”或 Linux `dpkg --print-architecture` 中确认后下载。安装包从空业务库启动，不内置模拟记录。</p>
    <div className="download-grid">{downloads.map((item) => <a href={`${releaseBase}/${item.file}`} key={`${item.platform}:${item.architecture}`}><span>{item.platform}</span><strong>{item.architecture}</strong><small>{item.note}</small><ArrowDownToLine size={16} /></a>)}</div>
  </section>;
}

const guidancePresetSource = guidancePresetData as { sourceId: string; sourceFiles: string[]; presets: Array<Omit<AiGuidancePreset, 'sourceId' | 'sourceFiles'>> };
const guidancePresets: AiGuidancePreset[] = guidancePresetSource.presets.map((preset) => ({ ...preset, sourceId: guidancePresetSource.sourceId, sourceFiles: guidancePresetSource.sourceFiles }));

function guidanceOptions(skills: AiSkill[]) {
  return [
    { value: '', label: '无（默认）' },
    ...guidancePresets.map((preset) => ({ value: preset.id, label: `预制 · ${preset.name}` })),
    ...skills.map((skill) => ({ value: skill.id, label: `本机 · ${skill.name}` }))
  ];
}

function resolveGuidance(id: string, skills: AiSkill[]) {
  const preset = guidancePresets.find((item) => item.id === id);
  if (preset) return { id: preset.id, name: preset.name, content: preset.content, preset: true };
  const skill = skills.find((item) => item.id === id);
  return skill ? { id: skill.id, name: skill.name, content: skill.content, preset: false } : undefined;
}

function historyExcerpt(value: string) {
  const normalized = value.trim();
  return normalized.length > 4_000 ? `${normalized.slice(0, 4_000)}\n……（字段预览截断）` : normalized;
}

function buildAiFieldChanges(context: AiChangeContext | undefined, input: string, answer: string): AiFieldChange[] {
  if (!answer.trim()) return [];
  if (!context?.fields.length) return [{ field: 'generatedAnswer', label: '生成结果', before: historyExcerpt(input), after: historyExcerpt(answer) }];
  const nonEmptyLines = answer.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const titleField = context.fields.find((field) => field.field === 'title');
  const bodyField = context.fields.find((field) => field.field === 'contentText');
  const firstLine = nonEmptyLines[0]?.replace(/^#{1,6}\s*/, '') || '';
  const inferredTitle = titleField && bodyField && nonEmptyLines.length > 1 && firstLine.length <= 100 && !/[。；，]$/.test(firstLine) ? firstLine : titleField?.before;
  const inferredBody = inferredTitle !== titleField?.before ? nonEmptyLines.slice(1).join('\n') : answer.trim();
  return context.fields.flatMap((field) => {
    const after = field.field === 'title' ? inferredTitle || field.before : field.field === 'contentText' ? inferredBody : answer.trim();
    if (field.before.trim() === after.trim()) return [];
    return [{ field: field.field, label: field.label, before: historyExcerpt(field.before), after: historyExcerpt(after) }];
  });
}

function createAiHistoryEntry(input: Omit<AiHistoryEntry, 'id' | 'createdAt'>): AiHistoryEntry {
  return { ...input, id: createId('ai-history'), createdAt: nowIso() };
}

function AiSectionNav() {
  return <nav className="ai-section-nav" aria-label="AI 页面分区">
    <a href="#ai-workflow"><Sparkles size={14} />本次协作</a>
    <a href="#ai-history"><Archive size={14} />历史回答</a>
    <a href="#ai-guidance"><BookOpen size={14} />写作指引</a>
  </nav>;
}

function AiWorkflowProgress({ connectionReady, materialReady, redactionReady, resultReady }: { connectionReady: boolean; materialReady: boolean; redactionReady: boolean; resultReady: boolean }) {
  const readiness = [connectionReady, materialReady, redactionReady, resultReady];
  const currentIndex = readiness.findIndex((ready) => !ready);
  const steps = [
    { label: '连接', detail: '服务与模型' },
    { label: '材料', detail: '选择或粘贴' },
    { label: '脱敏', detail: '预览并确认' },
    { label: '结果', detail: '只读返回' }
  ];
  return <ol className="ai-workflow-progress" aria-label="AI 协作流程">
    {steps.map((step, index) => {
      const state = readiness[index] ? 'complete' : index === currentIndex ? 'current' : 'pending';
      return <li className={state} key={step.label} aria-current={state === 'current' ? 'step' : undefined}><span>{readiness[index] ? <Check size={13} /> : String(index + 1).padStart(2, '0')}</span><div><strong>{step.label}</strong><small>{step.detail}</small></div></li>;
    })}
  </ol>;
}

function AiHub({ distribution, compact, workspace, attachments, prefill, skills, history, onSaveHistory, onDeleteHistory, onClearHistory, onSaveSkill, onDeleteSkill, onReload, setToast }: { distribution: 'public' | 'intranet' | 'internet'; compact: boolean; workspace: AiWorkspaceData; attachments: Attachment[]; prefill: AiPrefill | null; skills: AiSkill[]; history: AiHistoryEntry[]; onSaveHistory: (entry: AiHistoryEntry, isCurrent?: () => boolean) => Promise<boolean>; onDeleteHistory: (entry: AiHistoryEntry) => Promise<void>; onClearHistory: () => Promise<void>; onSaveSkill: (name: string, content: string) => Promise<boolean>; onDeleteSkill: (skill: AiSkill) => Promise<void>; onReload: () => Promise<void>; setToast: (text: string) => void }) {
  const detail = distribution === 'intranet'
    ? '通过单位内部网关同步业务数据并调用内部模型；密钥始终保存在服务端，每次发送前都需脱敏确认。'
    : '内置常用服务商地址，填入自己的 API Key 即可总结、提纲与润色；Key 只保留在当前会话，发送前逐次脱敏确认。';
  return <>
    {!compact && <PageHeading eyebrow={distribution === 'intranet' ? '内部服务' : 'AI 工作台'} title="AI 助手" detail={detail} />}
    {!compact && <AiSectionNav />}
    {distribution === 'intranet'
      ? <IntranetServices compact={compact} workspace={workspace} attachments={attachments} prefill={prefill} skills={skills} onSaveHistory={onSaveHistory} onReload={onReload} setToast={setToast} />
      : <InternetAiServices compact={compact} workspace={workspace} publicMode={distribution === 'public'} prefill={prefill} skills={skills} onSaveHistory={onSaveHistory} setToast={setToast} />}
    {!compact && <AiHistoryPanel history={history} onDelete={onDeleteHistory} onClear={onClearHistory} />}
    {!compact && <SkillManager skills={skills} onSaveSkill={onSaveSkill} onDeleteSkill={onDeleteSkill} setToast={setToast} />}
  </>;
}

function AiHistoryPanel({ history, onDelete, onClear }: { history: AiHistoryEntry[]; onDelete: (entry: AiHistoryEntry) => Promise<void>; onClear: () => Promise<void> }) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return history;
    return history.filter((entry) => `${entry.purpose} ${entry.provider} ${entry.model} ${entry.skillName} ${entry.targetLabel} ${entry.input} ${entry.answer} ${entry.changes.map((change) => change.label).join(' ')}`.toLowerCase().includes(keyword));
  }, [history, query]);
  const selected = filtered.find((entry) => entry.id === selectedId) || filtered[0];
  useEffect(() => { if (selected && selected.id !== selectedId) setSelectedId(selected.id); }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return <section className="panel ai-history-panel" id="ai-history">
    <div className="panel-heading"><div><span className="eyebrow">LOCAL AI HISTORY</span><h2>历史生成与回答查询</h2></div><div className="button-row"><span className="toolbar-count">{history.length} 条</span><button type="button" className="text-button" disabled={!history.length} onClick={() => void onClear()}><X size={14} />清空历史</button></div></div>
    <div className="ai-history-search"><Search size={15} /><input aria-label="搜索 AI 历史" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索用途、模型、指引、请求或回答" /></div>
    <div className="ai-history-layout">
      <div className="ai-history-list">{filtered.map((entry) => <button type="button" className={`ai-history-row ${entry.id === selected?.id ? 'selected' : ''}`} key={entry.id} onClick={() => setSelectedId(entry.id)}><span>{new Date(entry.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span><strong>{entry.purpose}</strong><small>{entry.provider || entry.source} · {entry.model || '默认模型'}{entry.skillName ? ` · ${entry.skillName}` : ''}</small></button>)}{!filtered.length && <EmptyState text={history.length ? '没有匹配的 AI 历史' : '暂无 AI 生成历史'} />}</div>
      <div className="ai-history-detail">{selected ? <><div className="ai-history-detail-head"><div><span className="eyebrow">{selected.targetLabel || 'AI 请求'}</span><h3>{selected.purpose}</h3><small>{new Date(selected.createdAt).toLocaleString('zh-CN')} · {selected.provider || selected.source} · {selected.model || '默认模型'}</small></div><button type="button" className="icon-button danger-icon" title="删除本条 AI 历史" onClick={() => void onDelete(selected)}><X size={15} /></button></div><section><h4>已确认脱敏的请求</h4><pre>{selected.input}</pre></section><AiFieldChanges changes={selected.changes} /><section><h4>AI 回答</h4><pre>{selected.answer}</pre>{selected.answerTruncated && <small className="warning-line"><AlertTriangle size={13} />回答过长，本机历史只保留前 200,000 字符</small>}</section></> : <EmptyState text="选择一条历史查看请求与回答" />}</div>
    </div>
  </section>;
}

function SkillManager({ skills, onSaveSkill, onDeleteSkill, setToast }: { skills: AiSkill[]; onSaveSkill: (name: string, content: string) => Promise<boolean>; onDeleteSkill: (skill: AiSkill) => Promise<void>; setToast: (text: string) => void }) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const save = async () => { if (await onSaveSkill(name, content)) { setName(''); setContent(''); } };
  const importFiles = async (files: FileList) => {
    for (const file of Array.from(files)) {
      if (file.size > 512_000) { setToast(`${file.name} 超过 500 KB，未导入`); continue; }
      const text = await file.text();
      await onSaveSkill(file.name.replace(/\.(md|markdown|txt)$/i, ''), text);
    }
  };
  return <section className="panel skill-panel" id="ai-guidance">
    <div className="panel-heading"><div><span className="eyebrow">润色指引 / SKILL</span><h2>公文写作指引库</h2></div><span className="toolbar-count">预制 {guidancePresets.length} · 本机 {skills.length}</span></div>
    <div className="skill-body">
      <p className="skill-note">默认不附加任何指引。预制版本从已授权 Markdown 蒸馏并保持只读；本机指引进入快照备份但不参与内网同步。选择指引不会绕过脱敏和逐次确认。</p>
      <div className="preset-skill-grid">{guidancePresets.map((preset) => <article className="preset-skill-card" key={preset.id}><span>只读预制</span><h3>{preset.name}</h3><p>{preset.description}</p><details><summary>查看提示词</summary><pre>{preset.content}</pre></details><small>来源：公文写作算法授权 Markdown</small></article>)}</div>
      <div className="skill-list">
        {skills.map((skill) => <div className="skill-row" key={skill.id}><div className="skill-row-main"><strong>{skill.name}</strong><small>{skill.content.length} 字 · {skill.updatedAt.slice(0, 10)}</small></div><details className="skill-preview"><summary>预览</summary><pre>{skill.content.length > 2000 ? `${skill.content.slice(0, 2000)}\n……（预览截断，完整内容会随请求发送）` : skill.content}</pre></details><button type="button" className="icon-button danger-icon" title={`删除指引 ${skill.name}`} onClick={() => void onDeleteSkill(skill)}><X size={14} /></button></div>)}
        {!skills.length && <small className="form-empty skill-empty">暂无保存的指引；可在下方新建，或导入 .md / .txt 文件</small>}
      </div>
      <div className="skill-form">
        <Field label="指引名称" value={name} onChange={setName} placeholder="例如：公文写作算法（蒸馏版）" />
        <TextArea label="指引内容" value={content} onChange={setContent} placeholder="粘贴写作方法论、格式要求或语言风格约束……" />
        <div className="skill-form-actions">
          <label className="secondary-button document-import-button"><FileUp size={15} />导入 .md / .txt<input type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" multiple onChange={(event) => { if (event.target.files?.length) void importFiles(event.target.files); event.currentTarget.value = ''; }} /></label>
          <button type="button" className="primary-button" onClick={() => void save()}><Save size={15} />保存指引</button>
        </div>
      </div>
    </div>
  </section>;
}

function IntranetServices({ compact, workspace, attachments, prefill, skills, onSaveHistory, onReload, setToast }: { compact: boolean; workspace: AiWorkspaceData; attachments: Attachment[]; prefill: AiPrefill | null; skills: AiSkill[]; onSaveHistory: (entry: AiHistoryEntry, isCurrent?: () => boolean) => Promise<boolean>; onReload: () => Promise<void>; setToast: (text: string) => void }) {
  const [baseUrl, setBaseUrl] = useState('http://127.0.0.1:8787');
  const [accessCode, setAccessCode] = useState('');
  const [client, setClient] = useState<PrivateSyncClient | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState('');
  const [materialSource, setMaterialSource] = useState('draft');
  const [redactionSource, setRedactionSource] = useState(workspace.draft.contentText);
  const [redactedContent, setRedactedContent] = useState('');
  const [purpose, setPurpose] = useState('提纲生成');
  const [skillId, setSkillId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [aiResult, setAiResult] = useState<unknown>();
  const modelRequest = useLatestRequest();
  const generationRequest = useLatestRequest();
  const effectiveGuidanceId = resolveGuidance(skillId, skills)?.id || '';
  const selectedGuidance = resolveGuidance(effectiveGuidanceId, skills);
  useEffect(() => {
    if (!prefill) return;
    const content = prefill.custom !== undefined ? prefill.custom : buildAiWorkspaceMaterial(prefill.source, workspace);
    setMaterialSource(prefill.custom !== undefined ? 'custom' : prefill.source);
    setPurpose(prefill.purpose);
    setRedactionSource(content.slice(0, AI_MAX_CONTENT_LENGTH));
    setRedactedContent('');
    setConfirmed(false);
    setAiResult(undefined);
    generationRequest.invalidate();
    setToast(!content ? '所选素材为空，可直接粘贴材料' : content.length > AI_MAX_CONTENT_LENGTH ? `素材已载入并截取前 ${AI_MAX_CONTENT_LENGTH} 个字符` : '素材已载入，请生成脱敏预览并逐次确认');
    // 仅在收到新的 AI 助手请求（nonce 变化）时载入素材
  }, [prefill?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps
  const invalidateAiResult = () => { generationRequest.invalidate(); setConfirmed(false); setAiResult(undefined); };
  const resetModels = () => { modelRequest.invalidate(); setModels([]); setModel(''); invalidateAiResult(); };
  const changeBaseUrl = (value: string) => { setBaseUrl(value); setClient(null); resetModels(); };
  const connect = async () => { resetModels(); setClient(null); try { const next = new PrivateSyncClient({ baseUrl }); await next.createSession(accessCode); setClient(next); setAccessCode(''); setToast('内网会话已建立，访问码未保存'); } catch (error) { setToast(error instanceof Error ? error.message : '连接失败'); } };
  const sync = async () => { if (!client) return setToast('请先建立内网会话'); try { const result = await syncPrivateWorkspace(client, { tasks: workspace.tasks, meetings: workspace.meetings, documents: workspace.documents, researches: workspace.researches, seals: workspace.seals, materials: workspace.materials, drafts: [workspace.draft], weeklyReports: workspace.weeklyReports, attachments }); await onReload(); setToast(`同步完成：拉取 ${result.pulled}，推送 ${result.pushed}，冲突 ${result.conflicts}，附件上传 ${result.attachmentsUploaded}`); } catch (error) { setToast(error instanceof Error ? error.message : '同步失败'); } };
  const loadModels = async () => {
    if (!client) return setToast('请先建立内网会话');
    const previousModels = models;
    const previousModel = model;
    const { runId, signal } = modelRequest.begin();
    invalidateAiResult();
    try {
      const result = await client.listModels(signal);
      if (!modelRequest.isCurrent(runId)) return;
      const nextModel = result.models.includes(previousModel) ? previousModel : result.models.includes(result.defaultModel) ? result.defaultModel : result.models[0] || '';
      setModels(result.models); setModel(nextModel); setToast(`已获取 ${result.models.length} 个内部模型${previousModel && nextModel === previousModel ? '，当前选择已保留' : ''}`);
    } catch (error) {
      if (!modelRequest.isCurrent(runId)) return;
      const message = error instanceof Error ? error.message : '获取模型失败';
      setToast(`${message}${previousModels.length ? '；已保留上次模型目录' : ''}`);
    } finally { modelRequest.finish(runId); }
  };
  const cancelModelRequest = () => { if (modelRequest.cancel()) setToast('已停止等待；当前模型目录保持不变'); };
  const loadMaterial = () => { const content = buildAiWorkspaceMaterial(materialSource, workspace); if (!content) return setToast('所选本机素材为空'); setRedactionSource(content.slice(0, AI_MAX_CONTENT_LENGTH)); setRedactedContent(''); invalidateAiResult(); setToast(content.length > AI_MAX_CONTENT_LENGTH ? `素材已载入并截取前 ${AI_MAX_CONTENT_LENGTH} 个字符` : '本机素材已载入'); };
  const previewRedaction = () => { if (!redactionSource.trim()) return setToast('请先填写待处理材料'); if (redactionSource.length > AI_MAX_CONTENT_LENGTH) return setToast(`待处理材料不能超过 ${AI_MAX_CONTENT_LENGTH} 个字符`); setRedactedContent(redactSensitiveContent(redactionSource)); invalidateAiResult(); };
  const sendAi = async () => {
    if (!client) return setToast('请先建立内网会话');
    if (!redactedContent) return setToast('请先生成并检查脱敏预览');
    if (!confirmed) return setToast('请勾选本次发送确认');
    const requestInput = redactedContent;
    const requestPurpose = purpose;
    const requestModel = model;
    const requestGuidance = selectedGuidance;
    const requestContext = prefill?.changeContext;
    setToast('');
    const { runId, signal } = generationRequest.begin();
    setConfirmed(false);
    try {
      const response = await client.generate({ redactedContent: requestInput, redacted: true, confirmed: true, purpose: requestPurpose, model: requestModel || undefined, guidance: requestGuidance?.content }, signal);
      if (!generationRequest.isCurrent(runId)) return;
      const answer = extractOpenAiText(response);
      const nextChanges = buildAiFieldChanges(requestContext, requestInput, answer);
      if (answer) await onSaveHistory(createAiHistoryEntry({ source: 'intranet', purpose: requestPurpose, provider: '内部 AI 网关', model: response.audit?.model || requestModel || '服务端默认', skillName: requestGuidance?.name || '', targetLabel: requestContext?.targetLabel || '本机材料', input: requestInput, answer, changes: nextChanges }), () => generationRequest.isCurrent(runId));
      if (!generationRequest.isCurrent(runId)) return;
      setAiResult(response);
      setToast(answer ? '内部 AI 结果已返回并保存到本机历史；原稿未被覆盖' : '内部 AI 结果已返回；原稿未被覆盖');
    } catch (error) {
      if (!generationRequest.isCurrent(runId)) return;
      setToast(error instanceof Error ? error.message : 'AI 请求失败');
    } finally { generationRequest.finish(runId); }
  };
  const cancelGeneration = () => { if (generationRequest.cancel()) setToast('已停止等待；上次成功结果保持不变'); };
  const resultText = extractOpenAiText(aiResult);
  const changes = buildAiFieldChanges(prefill?.changeContext, redactedContent, resultText);
  const connectionForm = <><Field label="内部 API 地址" value={baseUrl} onChange={changeBaseUrl} placeholder="https://intranet.example/api" /><Field label="一次性访问码" type="password" value={accessCode} onChange={setAccessCode} /><div className="button-row"><button className="secondary-button" onClick={() => void connect()}><Server size={16} />建立会话</button>{!compact && <button className="primary-button" disabled={!client} onClick={() => void sync()}><RefreshCw size={16} />同步全部业务数据</button>}</div><p className="service-note">模型服务由内网后台配置；访问码只用于当前会话，不会写入本机历史。</p></>;
  return <section className={`desktop-services ${compact ? 'compact-ai-services' : ''}`} id="ai-workflow">
    <details className={`panel ai-advanced-config ${compact ? '' : 'full-ai-connection'}`} open={!client}><summary>{compact ? <><span><Server size={15} />内部连接</span><strong>{client ? '已连接，后台模型配置已接管' : '首次使用需要建立会话'}</strong></> : <><span className="ai-connection-title"><span className="eyebrow">内部服务</span><strong className="ai-connection-heading" role="heading" aria-level={2}>同步连接</strong></span><span className={`status-pill ${client ? 'done' : 'pending'}`}>{client ? '已连接' : '未连接'}</span></>}</summary><div>{connectionForm}</div></details>
    <div className="panel service-panel ai-workbench"><div className="panel-heading"><div><span className="eyebrow">内部 AI</span><h2>{compact ? '本次协作' : '总结与润色'}</h2></div>{compact && client && <span className="status-pill done">后台已配置</span>}</div>
      {!compact && <AiWorkflowProgress connectionReady={Boolean(client)} materialReady={Boolean(redactionSource.trim())} redactionReady={Boolean(redactedContent)} resultReady={aiResult !== undefined} />}
      <ModelRequestControl compact={compact && models.length > 0} disabled={!client} loading={modelRequest.loading} modelCount={models.length} initialLabel="获取内部模型" refreshLabel="刷新内部模型" onRequest={() => void loadModels()} onCancel={cancelModelRequest} />
      {models.length > 0 && (compact ? <p className="ai-ready-summary"><Bot size={14} />{model || '服务端默认模型'}</p> : <ModelCatalogField label="内部模型" value={model} models={models} onChange={(value) => { setModel(value); invalidateAiResult(); }} />)}
      <div className="ai-control-grid"><SelectField label="处理用途" value={purpose} options={aiPurposeOptions} onChange={(value) => { setPurpose(value); invalidateAiResult(); }} /><SelectField label="润色指引" value={effectiveGuidanceId} options={guidanceOptions(skills)} onChange={(value) => { setSkillId(value); invalidateAiResult(); }} /></div>
      {selectedGuidance && <p className="skill-attach-note">将附加「{selectedGuidance.name}」（{selectedGuidance.content.length} 字）作为系统写作指引。</p>}
      {compact && prefill ? <p className="ai-ready-summary"><FileText size={14} />已载入：{prefill.changeContext?.targetLabel || '当前页面材料'}</p> : <div className="material-source-row"><SelectField label="本机素材" value={materialSource} options={aiSourceOptions} onChange={(value) => { setMaterialSource(value); invalidateAiResult(); }} /><button className="secondary-button" onClick={loadMaterial}><FileText size={15} />载入素材</button></div>}
      <TextArea label="待处理材料" value={redactionSource} onChange={(value) => { setRedactionSource(value); setRedactedContent(''); invalidateAiResult(); }} placeholder="粘贴待脱敏材料" />
      <button className="secondary-button" onClick={previewRedaction}><ShieldCheck size={16} />生成脱敏预览</button>
      {redactedContent && <><TextArea label="脱敏预览（可继续修改）" value={redactedContent} onChange={(value) => { setRedactedContent(value); invalidateAiResult(); }} /><ConfirmationCheck checked={confirmed} disabled={generationRequest.loading} onChange={setConfirmed} label="我确认本次材料已脱敏且允许发送到内部模型" /><AiGenerationControl loading={generationRequest.loading} disabled={!client || !confirmed} idleLabel="确认发送到内部 AI" onRequest={() => void sendAi()} onCancel={cancelGeneration} /></>}
      {aiResult !== undefined && <AiResult result={aiResult} text={resultText} changes={changes} setToast={setToast} />}
      <p className="service-note">每次请求仍必须检查脱敏预览并逐次确认；AI 输出只读展示并保存到当前客户端历史，不覆盖原稿。</p>
    </div>
  </section>;
}

function InternetAiServices({ compact, workspace, publicMode, prefill, skills, onSaveHistory, setToast }: { compact: boolean; workspace: AiWorkspaceData; publicMode: boolean; prefill: AiPrefill | null; skills: AiSkill[]; onSaveHistory: (entry: AiHistoryEntry, isCurrent?: () => boolean) => Promise<boolean>; setToast: (text: string) => void }) {
  const defaultPreset = AI_PROVIDER_PRESETS.find((preset) => preset.id === 'deepseek')!;
  const [providerId, setProviderId] = useState(defaultPreset.id);
  const [baseUrl, setBaseUrl] = useState(defaultPreset.baseUrl);
  const [apiKey, setApiKey] = useState('');
  const [relayBaseUrl, setRelayBaseUrl] = useState('http://127.0.0.1:8787');
  const [relayPassword, setRelayPassword] = useState('');
  const [relayClient, setRelayClient] = useState<RelayAiClient | null>(null);
  const [relayProviders, setRelayProviders] = useState<RelayProviderDescriptor[]>([]);
  const [relayRevision, setRelayRevision] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState('');
  const [purpose, setPurpose] = useState('综合工作总结');
  const [skillId, setSkillId] = useState('');
  const [materialSource, setMaterialSource] = useState('workspace');
  const [redactionSource, setRedactionSource] = useState('');
  const [redactedContent, setRedactedContent] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [aiResult, setAiResult] = useState<unknown>();
  const modelRequest = useLatestRequest();
  const generationRequest = useLatestRequest();
  const relayMode = providerId === 'relay' || providerId.startsWith('relay:');
  const selectedRelayProvider = relayProviders.find((provider) => `relay:${provider.id}` === providerId);
  const selectedDirectProvider = AI_PROVIDER_PRESETS.find((preset) => preset.id === providerId) || AI_PROVIDER_PRESETS.at(-1)!;
  const selectedProviderLabel = selectedRelayProvider?.label || (relayMode ? '本机神秘站点' : selectedDirectProvider.label);
  const effectiveGuidanceId = resolveGuidance(skillId, skills)?.id || '';
  const selectedGuidance = resolveGuidance(effectiveGuidanceId, skills);
  useEffect(() => {
    if (!prefill) return;
    const content = prefill.custom !== undefined ? prefill.custom : buildAiWorkspaceMaterial(prefill.source, workspace);
    setMaterialSource(prefill.custom !== undefined ? 'custom' : prefill.source);
    setPurpose(prefill.purpose);
    setRedactionSource(content.slice(0, AI_MAX_CONTENT_LENGTH));
    setRedactedContent('');
    setConfirmed(false);
    setAiResult(undefined);
    generationRequest.invalidate();
    setToast(!content ? '所选素材为空，可直接粘贴材料' : content.length > AI_MAX_CONTENT_LENGTH ? `素材已载入并截取前 ${AI_MAX_CONTENT_LENGTH} 个字符` : '素材已载入，请生成脱敏预览并逐次确认');
  }, [prefill?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps
  const invalidateAiResult = () => { generationRequest.invalidate(); setConfirmed(false); setAiResult(undefined); };
  const resetModels = () => { modelRequest.invalidate(); setModels([]); setModel(''); invalidateAiResult(); };
  const createClient = () => new DirectAiClient({ baseUrl, apiKey });
  const chooseProvider = (id: string) => {
    const provider = AI_PROVIDER_PRESETS.find((preset) => preset.id === id);
    setProviderId(id);
    if (provider && provider.id !== 'custom') setBaseUrl(provider.baseUrl);
    resetModels();
  };
  const changeBaseUrl = (value: string) => { setBaseUrl(value); setProviderId('custom'); resetModels(); };
  const changeRelayBaseUrl = (value: string) => { setRelayBaseUrl(value); setRelayClient(null); setRelayProviders([]); setRelayRevision(''); setProviderId('relay'); resetModels(); };
  const applyRelayDirectory = (directory: { revision: string; providers: RelayProviderDescriptor[] }) => {
    setRelayProviders(directory.providers);
    setRelayRevision(directory.revision);
    const currentId = providerId.startsWith('relay:') ? providerId.slice(6) : '';
    const next = directory.providers.find((provider) => provider.id === currentId) || directory.providers[0];
    setProviderId(next ? `relay:${next.id}` : 'relay');
    resetModels();
    return next;
  };
  const unlockRelay = async () => {
    if (!relayPassword) return setToast('请输入本机中转密码');
    try {
      const nextClient = new RelayAiClient({ baseUrl: relayBaseUrl });
      await nextClient.createSession(relayPassword);
      const directory = await nextClient.listProviders();
      setRelayClient(nextClient);
      setRelayPassword('');
      applyRelayDirectory(directory);
      setToast(directory.providers.length ? `已解锁并载入 ${directory.providers.length} 个神秘站点` : '已解锁，但后台尚未启用站点');
    } catch (error) { setRelayClient(null); setRelayProviders([]); setRelayRevision(''); setToast(error instanceof Error ? error.message : '中转站解锁失败'); }
  };
  const refreshRelay = async () => {
    if (!relayClient) return setToast('请先输入密码解锁本机中转站');
    try { const directory = await relayClient.listProviders(); applyRelayDirectory(directory); setToast(`站点数据已刷新：${directory.providers.length} 个，revision ${directory.revision}`); }
    catch (error) { setToast(error instanceof Error ? error.message : '站点刷新失败'); }
  };
  const loadModels = async () => {
    if (relayMode && (!relayClient || !selectedRelayProvider)) return setToast('请先解锁并选择已启用的神秘站点');
    if (!relayMode && !baseUrl.trim()) return setToast('请填写兼容 API 请求地址');
    const previousModels = models;
    const previousModel = model;
    const { runId, signal } = modelRequest.begin();
    invalidateAiResult();
    try {
      if (relayMode) {
        if (!relayClient || !selectedRelayProvider) return;
        const result = await relayClient.listModels(selectedRelayProvider.id, signal);
        if (!modelRequest.isCurrent(runId)) return;
        const nextModel = result.models.includes(previousModel) ? previousModel : result.models.includes(result.defaultModel) ? result.defaultModel : result.models[0] || '';
        setModels(result.models); setModel(nextModel); setToast(`已从${selectedRelayProvider.label}获取 ${result.models.length} 个模型${previousModel && nextModel === previousModel ? '，当前选择已保留' : ''}`);
      } else {
        const list = desktopBridge()?.listAiModels ? await desktopBridge()!.listAiModels(baseUrl, apiKey) : await createClient().listModels(signal);
        if (!modelRequest.isCurrent(runId)) return;
        const nextModel = list.includes(previousModel) ? previousModel : list[0] || '';
        setModels(list); setModel(nextModel); setToast(`已获取 ${list.length} 个可用模型${previousModel && nextModel === previousModel ? '，当前选择已保留' : ''}`);
      }
    } catch (error) {
      if (!modelRequest.isCurrent(runId)) return;
      const message = error instanceof Error ? error.message : '获取模型失败';
      setToast(`${message}${previousModels.length ? '；已保留上次模型目录' : ''}`);
    } finally { modelRequest.finish(runId); }
  };
  const cancelModelRequest = () => { if (modelRequest.cancel()) setToast('已停止等待；当前模型目录保持不变'); };
  const loadMaterial = () => { const content = buildAiWorkspaceMaterial(materialSource, workspace); if (!content) return setToast('所选本机素材为空'); setRedactionSource(content.slice(0, AI_MAX_CONTENT_LENGTH)); setRedactedContent(''); invalidateAiResult(); setToast(content.length > AI_MAX_CONTENT_LENGTH ? `素材已载入并截取前 ${AI_MAX_CONTENT_LENGTH} 个字符` : '本机素材已载入'); };
  const previewRedaction = () => { if (!redactionSource.trim()) return setToast('请先填写待处理材料'); if (redactionSource.length > AI_MAX_CONTENT_LENGTH) return setToast(`待处理材料不能超过 ${AI_MAX_CONTENT_LENGTH} 个字符`); setRedactedContent(redactSensitiveContent(redactionSource)); invalidateAiResult(); };
  const sendAi = async () => {
    if (!redactedContent) return setToast('请先生成并检查脱敏预览');
    if (!confirmed) return setToast('请勾选本次发送确认');
    if (!model) return setToast('请先获取并选择模型');
    const requestInput = redactedContent;
    const requestPurpose = purpose;
    const requestModel = model;
    const requestGuidance = selectedGuidance;
    const requestContext = prefill?.changeContext;
    const requestProviderLabel = selectedProviderLabel;
    const requestRelayProvider = selectedRelayProvider;
    const requestRelayMode = relayMode;
    setToast('');
    const { runId, signal } = generationRequest.begin();
    setConfirmed(false);
    try {
      const common = { model: requestModel, redactedContent: requestInput, redacted: true as const, confirmed: true as const, purpose: requestPurpose, ...(requestGuidance ? { guidance: requestGuidance.content } : {}) };
      const result = requestRelayMode
        ? relayClient && requestRelayProvider ? await relayClient.generate(requestRelayProvider.id, common, signal) : undefined
        : desktopBridge()?.generateAi ? await desktopBridge()!.generateAi({ baseUrl, apiKey, ...common }) : await createClient().generate(common, signal);
      if (!generationRequest.isCurrent(runId)) return;
      if (result === undefined) return setToast('请重新解锁并选择神秘站点');
      const answer = extractOpenAiText(result);
      const nextChanges = buildAiFieldChanges(requestContext, requestInput, answer);
      if (answer) await onSaveHistory(createAiHistoryEntry({ source: publicMode ? 'public' : 'internet', purpose: requestPurpose, provider: requestProviderLabel, model: requestModel, skillName: requestGuidance?.name || '', targetLabel: requestContext?.targetLabel || '本机材料', input: requestInput, answer, changes: nextChanges }), () => generationRequest.isCurrent(runId));
      if (!generationRequest.isCurrent(runId)) return;
      setAiResult(result);
      setToast(answer ? 'AI 结果已返回并保存到本机历史；原稿未被覆盖' : 'AI 结果已返回；原稿未被覆盖');
    } catch (error) {
      if (!generationRequest.isCurrent(runId)) return;
      setToast(error instanceof Error ? error.message : 'AI 请求失败');
    } finally { generationRequest.finish(runId); }
  };
  const cancelGeneration = () => { if (generationRequest.cancel()) setToast('已停止等待；上次成功结果保持不变'); };
  const resultText = extractOpenAiText(aiResult);
  const changes = buildAiFieldChanges(prefill?.changeContext, redactedContent, resultText);
  const providerOptions = [
    ...AI_PROVIDER_PRESETS.map((provider) => ({ value: provider.id, label: provider.label })),
    { value: 'relay', label: '神秘站点（本机中转 · 需密码）' },
    ...relayProviders.map((provider) => ({ value: `relay:${provider.id}`, label: `神秘 · ${provider.label}` }))
  ];
  const relayForm = <div className="relay-config-box">
    <Field label="本机中转地址" value={relayBaseUrl} onChange={changeRelayBaseUrl} placeholder="http://127.0.0.1:8787" />
    {!relayClient ? <><Field label="中转站密码（仅当前会话）" type="password" value={relayPassword} onChange={setRelayPassword} /><div className="button-row"><button className="secondary-button" onClick={() => void unlockRelay()}><KeyRound size={16} />解锁并刷新站点</button><a className="text-button" href={`${relayBaseUrl.replace(/\/+$/, '')}/relay-admin`} target="_blank" rel="noreferrer"><Server size={14} />打开本机管理页</a></div></> : <div className="button-row"><button className="secondary-button" onClick={() => void refreshRelay()}><RefreshCw size={16} />刷新站点</button><a className="text-button" href={`${relayBaseUrl.replace(/\/+$/, '')}/relay-admin`} target="_blank" rel="noreferrer"><Server size={14} />打开本机管理页</a></div>}
    <p className="provider-note">{relayClient ? `已解锁 ${relayProviders.length} 个站点 · revision ${relayRevision || '—'}` : '密码、会话和站点目录只保留在当前页面内存；真实地址与 API Key 不会从后端返回。'}</p>
    <p className="service-note">可先在本机管理页点击“测试已保存配置”检查模型列表，再回到这里刷新站点；诊断详情不会进入 Pages。</p>
    {!relayClient && <p className="service-note">公开 Pages 首次连接时，Chrome 会询问是否允许“本地网络访问”，请选择“允许”；若曾拒绝，请在地址栏的网站设置中重新开启后刷新页面。</p>}
    {selectedRelayProvider && <><p className="ai-ready-summary"><Server size={14} />当前站点：{selectedRelayProvider.label}</p><ModelRequestControl loading={modelRequest.loading} modelCount={models.length} initialLabel="获取中转站模型" refreshLabel="刷新中转站模型" onRequest={() => void loadModels()} onCancel={cancelModelRequest} />{models.length > 0 && <ModelCatalogField label="选择模型" value={model} models={models} onChange={(value) => { setModel(value); invalidateAiResult(); }} />}</>}
  </div>;
  const directForm = <><Field label="请求地址" value={baseUrl} onChange={changeBaseUrl} placeholder="https://api.example.com/v1" /><Field label="API Key（仅当前会话）" type="password" value={apiKey} onChange={(value) => { setApiKey(value); modelRequest.invalidate(); invalidateAiResult(); }} /><ModelRequestControl loading={modelRequest.loading} modelCount={models.length} initialLabel="获取 AI 模型" refreshLabel="刷新 AI 模型" onRequest={() => void loadModels()} onCancel={cancelModelRequest} />{models.length > 0 && <ModelCatalogField label="选择模型" value={model} models={models} onChange={(value) => { setModel(value); invalidateAiResult(); }} />}<p className="provider-note">{selectedDirectProvider.note}{selectedDirectProvider.officialDocs && <> · <a href={selectedDirectProvider.officialDocs} target="_blank" rel="noreferrer">官方文档</a></>}</p><p className="service-note"><KeyRound size={13} /> API Key 只在当前会话使用，不写入本机历史、IndexedDB、日志或快照。</p></>;
  const configForm = <><SelectField label="服务商预设" value={providerId} options={providerOptions} onChange={chooseProvider} />{relayMode ? relayForm : directForm}</>;
  return <section className={`desktop-services internet-services ${compact ? 'compact-ai-services' : ''}`} id="ai-workflow">
    <details className={`panel ai-advanced-config ${compact ? '' : 'full-ai-connection'}`} open={!model}><summary>{compact ? <><span><Globe2 size={15} />模型连接</span><strong>{model ? `${selectedProviderLabel} · ${model}` : '首次使用需要配置或解锁模型'}</strong></> : <><span className="ai-connection-title"><span className="eyebrow">{publicMode ? '公开 Pages · 用户自备 Key / 本机中转' : '互联网版'}</span><strong className="ai-connection-heading" role="heading" aria-level={2}>兼容 API 配置</strong></span><span className={`status-pill ${model ? 'done' : 'pending'}`}>{model ? '模型已就绪' : '待配置'}</span></>}</summary><div>{configForm}</div></details>
    <div className="panel service-panel ai-workbench"><div className="panel-heading"><div><span className="eyebrow">逐次确认</span><h2>{compact ? '本次协作' : '总结、提纲与润色'}</h2></div>{compact && model && <span className="status-pill done">配置已就绪</span>}</div>
      {!compact && <AiWorkflowProgress connectionReady={Boolean(model)} materialReady={Boolean(redactionSource.trim())} redactionReady={Boolean(redactedContent)} resultReady={aiResult !== undefined} />}
      {compact && model && <p className="ai-ready-summary"><Bot size={14} />{selectedProviderLabel} · {model}</p>}
      <div className="ai-control-grid"><SelectField label="处理用途" value={purpose} options={aiPurposeOptions} onChange={(value) => { setPurpose(value); invalidateAiResult(); }} /><SelectField label="润色指引" value={effectiveGuidanceId} options={guidanceOptions(skills)} onChange={(value) => { setSkillId(value); invalidateAiResult(); }} /></div>
      {selectedGuidance && <p className="skill-attach-note">将附加「{selectedGuidance.name}」（{selectedGuidance.content.length} 字）作为系统写作指引。</p>}
      {compact && prefill ? <p className="ai-ready-summary"><FileText size={14} />已载入：{prefill.changeContext?.targetLabel || '当前页面材料'}</p> : <div className="material-source-row"><SelectField label="本机素材" value={materialSource} options={aiSourceOptions} onChange={(value) => { setMaterialSource(value); invalidateAiResult(); }} /><button className="secondary-button" onClick={loadMaterial}><FileText size={15} />载入素材</button></div>}
      <TextArea label="待处理材料" value={redactionSource} onChange={(value) => { setRedactionSource(value); setRedactedContent(''); invalidateAiResult(); }} placeholder="载入本机素材或粘贴自定义材料" />
      <button className="secondary-button" onClick={previewRedaction}><ShieldCheck size={16} />生成脱敏预览</button>
      {redactedContent && <><TextArea label="脱敏预览（可继续修改）" value={redactedContent} onChange={(value) => { setRedactedContent(value); invalidateAiResult(); }} /><ConfirmationCheck checked={confirmed} disabled={generationRequest.loading} onChange={setConfirmed} label="我确认本次材料已脱敏、非涉密且允许发送到所选服务商" /><AiGenerationControl loading={generationRequest.loading} disabled={!confirmed} idleLabel="确认本次 AI 请求" onRequest={() => void sendAi()} onCancel={cancelGeneration} /></>}
      {aiResult !== undefined && <AiResult result={aiResult} text={resultText} changes={changes} setToast={setToast} />}
      <p className="service-note">AI 输出只读展示并保存到当前客户端历史；直连受服务商 CORS 限制，本机中转由当前设备代为访问上游。</p>
    </div>
  </section>;
}

function ConfirmationCheck({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean }) {
  return <label className={`confirmation-check ${disabled ? 'disabled' : ''}`}><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>;
}

function AiFieldChanges({ changes }: { changes: AiFieldChange[] }) {
  return <section className="ai-field-changes"><div className="ai-change-heading"><span>字段变化</span><strong>{changes.length}</strong></div>{changes.length ? <div className="ai-change-list">{changes.map((change) => <details key={`${change.field}:${change.label}`}><summary><span>{change.label}</span><strong>已修改</strong></summary><div className="ai-change-columns"><div><span>修改前</span><pre>{change.before || '空'}</pre></div><div><span>AI 生成后</span><pre>{change.after || '空'}</pre></div></div></details>)}</div> : <p className="service-note">未检测到可展示的字段变化。</p>}</section>;
}

function AiResult({ result, text, changes, setToast }: { result: unknown; text: string; changes: AiFieldChange[]; setToast: (message: string) => void }) {
  return <div className="ai-result-card"><div className="panel-heading"><div><span className="eyebrow">AI 返回</span><h3>只读结果</h3></div>{text && <button type="button" className="text-button" onClick={() => { void navigator.clipboard?.writeText(text); setToast('AI 结果已复制，可粘贴到需要的位置'); }}><ClipboardList size={14} />复制结果</button>}</div><AiFieldChanges changes={changes} />{text ? <div className="ai-readable-result">{text}</div> : <p className="service-note">服务未返回标准 choices[0].message.content，请展开原始响应检查兼容性。</p>}<details><summary>查看原始响应</summary><pre className="ai-result">{JSON.stringify(result, null, 2)}</pre></details></div>;
}

export default App;
