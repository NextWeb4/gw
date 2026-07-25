const ALLOWED_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'STRONG', 'B', 'EM', 'I', 'BR']);
const DROP_WITH_CONTENT = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'FORM', 'INPUT', 'BUTTON', 'LINK', 'META']);
const BLOCK_TAGS = 'p,h1,h2,h3,h4,h5,h6,li,blockquote';
const MAX_IMPORT_BYTES = 10_000_000;

export interface ImportedDocumentContent {
  title: string;
  documentType: string;
  contentHtml: string;
  contentText: string;
  warnings: string[];
}

export function sanitizeImportedHtml(input: string) {
  const document = new DOMParser().parseFromString(input, 'text/html');
  for (const element of Array.from(document.body.querySelectorAll('*'))) {
    if (DROP_WITH_CONTENT.has(element.tagName)) {
      element.remove();
      continue;
    }
    if (!ALLOWED_TAGS.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }
    for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
  }
  const blocks = Array.from(document.body.querySelectorAll(BLOCK_TAGS))
    .map((element) => (element.textContent || '').replace(/\u00a0/g, ' ').trim())
    .filter(Boolean);
  const fallback = (document.body.textContent || '').replace(/\u00a0/g, ' ').trim();
  return { html: document.body.innerHTML.trim(), text: blocks.length ? blocks.join('\n') : fallback };
}

export async function importWritingDocument(file: File): Promise<ImportedDocumentContent> {
  if (file.size > MAX_IMPORT_BYTES) throw new Error('导入文档不能超过 10 MB');
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  let sourceHtml = '';
  const warnings: string[] = [];
  if (extension === 'docx') {
    const mammoth = await import('mammoth');
    const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
    sourceHtml = result.value;
    warnings.push(...result.messages.map((message) => message.message).filter(Boolean));
  } else if (extension === 'html' || extension === 'htm') {
    sourceHtml = await file.text();
  } else if (extension === 'txt' || file.type === 'text/plain') {
    sourceHtml = (await file.text()).split(/\r?\n/).filter(Boolean).map((line) => `<p>${escapeHtml(line)}</p>`).join('');
  } else {
    throw new Error('仅支持 DOCX、HTML 和 TXT 文档');
  }
  const sanitized = sanitizeImportedHtml(sourceHtml);
  if (!sanitized.text) throw new Error('文档中没有可导入的文字内容');
  const heading = sanitized.text.split('\n').find(Boolean) || '';
  const baseName = file.name.replace(/\.[^.]+$/, '').trim() || '导入文稿';
  const title = heading.length <= 80 ? heading : baseName;
  return { title, documentType: extension === 'docx' ? '导入 Word' : extension === 'txt' ? '导入文本' : '导入 HTML', contentHtml: sanitized.html, contentText: sanitized.text, warnings };
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
