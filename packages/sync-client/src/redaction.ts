export const redactSensitiveContent = (value: string) => value
  .replace(/\b\d{17}[0-9Xx]\b/g, '[身份证号]')
  .replace(/1[3-9]\d{9}/g, '[手机号]')
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[邮箱]')
  .replace(/(?:姓名|联系人|承办人|经办人)\s*[：:]\s*[\u4e00-\u9fff·]{2,8}/g, (match) => `${match.split(/[：:]/)[0]}：[姓名]`);
