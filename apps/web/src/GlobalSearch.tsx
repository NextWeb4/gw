import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { ArrowUpRight, Search, X, type LucideIcon } from 'lucide-react';

export interface GlobalSearchItem<TTab extends string> {
  id: string;
  kind: 'navigation' | 'record' | 'create' | 'recent';
  tab: TTab;
  recordId?: string;
  title: string;
  description: string;
  searchValue: string;
  keywords: string[];
  icon: LucideIcon;
}

export interface GlobalSearchGroup<TTab extends string> {
  id: string;
  label: string;
  emptyQueryOnly?: boolean;
  items: Array<GlobalSearchItem<TTab>>;
}

interface GlobalSearchProps<TTab extends string> {
  open: boolean;
  groups: Array<GlobalSearchGroup<TTab>>;
  onOpenChange: (open: boolean) => void;
  onSelectItem: (item: GlobalSearchItem<TTab>) => void;
}

export function GlobalSearch<TTab extends string>({ open, groups, onOpenChange, onSelectItem }: GlobalSearchProps<TTab>) {
  const [query, setQuery] = useState('');
  const visibleGroups = query.trim() ? groups.filter((group) => !group.emptyQueryOnly) : groups;

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  return <Command.Dialog open={open} onOpenChange={onOpenChange} label="全局查找" contentClassName="global-search-dialog">
    <div className="global-search-heading">
      <span className="global-search-mark" aria-hidden="true"><Search size={19} strokeWidth={1.7} /></span>
      <div><span>LOCAL COMMANDS / CMD K</span><strong>查找与快速新建</strong></div>
      <button type="button" className="icon-button" aria-label="关闭全局查找" title="关闭全局查找" onClick={() => onOpenChange(false)}><X size={18} /></button>
    </div>
    <div className="global-search-input-row">
      <Search size={18} aria-hidden="true" />
      <Command.Input value={query} onValueChange={setQuery} placeholder="查找模块和记录，或输入“新建”执行命令" autoFocus />
      <kbd>Esc</kbd>
    </div>
    <Command.List className="global-search-list">
      <Command.Empty className="global-search-empty"><Search size={24} aria-hidden="true" /><strong>没有找到匹配项</strong><span>换一个模块名称、记录标题或当前台账支持的关键词。</span></Command.Empty>
      {visibleGroups.map((group) => group.items.length > 0 && <Command.Group heading={group.label} key={group.id} className="global-search-group">
        {group.items.map((item) => {
          const Icon = item.icon;
          return <Command.Item
            key={item.id}
            value={item.searchValue}
            keywords={item.keywords}
            className={`global-search-item global-search-item-${item.kind}`}
            onSelect={() => onSelectItem(item)}
          >
            <span className="global-search-item-icon" aria-hidden="true"><Icon size={18} strokeWidth={1.6} /></span>
            <span className="global-search-item-copy"><strong>{item.title}</strong><small>{item.description}</small></span>
            <span className="global-search-item-kind">{item.kind === 'navigation' ? '导航' : item.kind === 'create' ? '新建' : item.kind === 'recent' ? '最近' : '记录'}</span>
            <ArrowUpRight size={15} aria-hidden="true" />
          </Command.Item>;
        })}
      </Command.Group>)}
    </Command.List>
    <div className="global-search-footer"><span>最近访问仅保留在当前会话；新建仍需显式保存</span><span><kbd>上下键</kbd> 选择 <kbd>Enter</kbd> 打开</span></div>
  </Command.Dialog>;
}
