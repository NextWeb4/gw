import { AlignmentType, Document, LineRuleType, Packer, Paragraph, TextRun } from 'docx';
import type { Draft } from '@hxhwang/domain';

export const A4_PAGE = { width: 11906, height: 16838, margin: { top: 2098, bottom: 1984, left: 1587, right: 1474 } } as const;
export const DOCUMENT_AUTHOR = 'HaoXiangHwang';

export const htmlToText = (html: string) => {
  const container = document.createElement('div');
  container.innerHTML = html;
  return (container.textContent ?? '').replace(/\u00a0/g, ' ').trim();
};

export const splitDraftLines = (text: string) => text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

export async function exportDraftDocx(draft: Draft): Promise<Blob> {
  const lines = splitDraftLines(draft.contentText);
  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 560, lineRule: LineRuleType.EXACTLY },
      children: [new TextRun({ text: draft.title || '未命名文稿', font: '方正小标宋简体', size: 44 })]
    }),
    ...lines.map((line) => {
      const heading = /^[一二三四五六七八九十]+、/.test(line);
      const subheading = /^（[一二三四五六七八九十]+）/.test(line);
      return new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { line: 560, lineRule: LineRuleType.EXACTLY },
        indent: { firstLine: heading || subheading ? 0 : 640 },
        children: [new TextRun({
          text: line,
          font: heading ? '黑体' : subheading ? '楷体_GB2312' : '仿宋_GB2312',
          size: 32,
          bold: heading || subheading
        })]
      });
    })
  ];
  const document = new Document({ creator: DOCUMENT_AUTHOR, lastModifiedBy: DOCUMENT_AUTHOR, title: draft.title || '未命名文稿', subject: draft.documentType, description: 'HxHwang Gw 生成文稿', sections: [{ properties: { page: A4_PAGE }, children }] });
  return Packer.toBlob(document);
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function buildPrintableDocument(draft: Draft) {
  const title = escapeHtml(draft.title || '未命名文稿');
  const paragraphs = splitDraftLines(draft.contentText).map((line) => {
    const className = /^[一二三四五六七八九十]+、/.test(line) ? 'print-h1' : /^（[一二三四五六七八九十]+）/.test(line) ? 'print-h2' : 'print-p';
    return `<p class="${className}">${escapeHtml(line)}</p>`;
  }).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="author" content="${DOCUMENT_AUTHOR}"><style>
    @page { size: A4; margin: 37mm 26mm 35mm 28mm; }
    body { color:#111; font-family:'仿宋_GB2312','FangSong','Noto Serif CJK SC',serif; font-size:16pt; line-height:28pt; }
    h1 { font-family:'方正小标宋简体','Noto Serif CJK SC',serif; font-size:22pt; line-height:28pt; text-align:center; margin:0 0 18pt; font-weight:700; }
    p { margin:0; } .print-p { text-indent:2em; } .print-h1 { font-family:'黑体',sans-serif; font-weight:700; text-indent:0; } .print-h2 { font-family:'楷体_GB2312','KaiTi',serif; font-weight:700; text-indent:0; }
  </style></head><body><h1>${title}</h1>${paragraphs}</body></html>`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
