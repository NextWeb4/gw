import { describe, expect, it } from 'vitest';
import { A4_PAGE, DOCUMENT_AUTHOR, buildPrintableDocument, draftBodyLines, encodeCsv, splitDraftLines } from './index.js';

describe('document text normalization', () => {
  it('drops blank lines while preserving Chinese headings', () => {
    expect(splitDraftLines('标题\n\n一、基本情况\n正文')).toEqual(['标题', '一、基本情况', '正文']);
  });

  it('keeps the configured Word and PDF output on A4 margins', () => {
    expect(A4_PAGE).toEqual({ width: 11906, height: 16838, margin: { top: 2098, bottom: 1984, left: 1587, right: 1474 } });
    const printable = buildPrintableDocument({ id: 'draft', title: '<测试>', documentType: '通知', contentHtml: '', contentText: '一、事项\n正文', templateId: 'notice', version: 1, updatedAt: '2026-07-22T00:00:00.000Z' });
    expect(printable).toContain('@page { size: A4; margin: 37mm 26mm 35mm 28mm; }');
    expect(printable).toContain('&lt;测试&gt;');
    expect(printable).toContain(`<meta name="author" content="${DOCUMENT_AUTHOR}">`);
  });

  it('keeps the document title out of the exported body', () => {
    const base = { id: 'draft', title: '工作总结', documentType: '工作总结', contentHtml: '', templateId: 'work-summary', version: 1, updatedAt: '2026-07-24T00:00:00.000Z' };
    expect(draftBodyLines({ ...base, contentText: '工作总结\n一、基本情况\n正文' })).toEqual(['一、基本情况', '正文']);
    expect(draftBodyLines({ ...base, contentText: '标题\n一、基本情况\n正文' })).toEqual(['一、基本情况', '正文']);
    expect(draftBodyLines({ ...base, contentText: '一、基本情况\n正文' })).toEqual(['一、基本情况', '正文']);
    const printable = buildPrintableDocument({ ...base, contentText: '工作总结\n正文' });
    expect(printable.match(/工作总结/g)).toHaveLength(1);
  });
});

describe('CSV encoding', () => {
  it('writes an Excel-compatible UTF-8 BOM, quoted cells and CRLF rows', () => {
    const csv = encodeCsv([
      ['标题', '备注'],
      ['全省事项,复盘', '他说“完成”，并写下 "已核对"。'],
      ['多行', '第一行\n第二行'],
    ]);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toBe('\uFEFF"标题","备注"\r\n"全省事项,复盘","他说“完成”，并写下 ""已核对""。"\r\n"多行","第一行\n第二行"\r\n');
    expect(csv.replace(/^\uFEFF/, '').split('\r\n')).toHaveLength(4);
  });

  it('neutralizes ASCII, full-width and control-hidden spreadsheet formulas without mutating input', () => {
    const row = ['=1+1', '+SUM(A1:A2)', '-2+3', '@HYPERLINK("x")', '＝1+1', '＋1', '－1', '＠cmd', '  =trimmed', '\t=tab', '\r=cr', '\n=lf', '普通文本'] as const;
    const rows = [['值'], row];
    const snapshot = structuredClone(rows);
    const csv = encodeCsv(rows);

    for (const value of row.slice(0, -1)) expect(csv).toContain(`"'${value.replace(/"/g, '""')}"`);
    expect(csv).toContain('"普通文本"');
    expect(rows).toEqual(snapshot);
  });

  it('removes NUL characters and serializes primitive empty values deterministically', () => {
    expect(encodeCsv([['a\0b', null, undefined, 0, false]])).toBe('\uFEFF"ab","","","0","false"\r\n');
  });
});
