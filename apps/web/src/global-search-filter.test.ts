import { describe, expect, it } from 'vitest';
import { globalSearchFilter, matchesGlobalSearchQuery } from './global-search-filter';

describe('global search multi-term filter', () => {
  it('requires every whitespace-separated term to match', () => {
    const value = '整理省政府办公厅来文并建立关联';

    expect(matchesGlobalSearchQuery(value, '')).toBe(true);
    expect(matchesGlobalSearchQuery(value, '   ')).toBe(true);
    expect(matchesGlobalSearchQuery(value, '任务 办公厅', ['任务', '日常工作'])).toBe(true);
    expect(matchesGlobalSearchQuery(value, '办公厅 任务', ['任务'])).toBe(true);
    expect(matchesGlobalSearchQuery(value, '任务 缺少词')).toBe(false);
  });

  it('matches terms across values and keywords with case normalization', () => {
    expect(matchesGlobalSearchQuery('Weekly Report', 'report weekly')).toBe(true);
    expect(matchesGlobalSearchQuery('Weekly Report', 'WEEKLY REPORT')).toBe(true);
    expect(globalSearchFilter('Weekly Report', 'weekly missing', ['Report'])).toBe(0);
    expect(globalSearchFilter('Weekly Report', 'weekly report', ['Report'])).toBe(1);
  });
});
