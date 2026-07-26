// 顺序敏感：邮箱必须先于手机号，否则形如 13812345678@example.com 的地址会被
// 手机号规则先替换成 “[手机号]@example.com” 而暴露域名；手机号使用数字环视
// 边界，避免命中更长数字串中的 11 位子串。
export const redactSensitiveContent = (value: string) => value
  .replace(/\b\d{17}[0-9Xx]\b/g, '[身份证号]')
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[邮箱]')
  .replace(/(?<!\d)1[3-9]\d{9}(?!\d)/g, '[手机号]')
  .replace(/(?:姓名|联系人|承办人|经办人)\s*[：:]\s*[一-鿿·]{2,8}/g, (match) => `${match.split(/[：:]/)[0]}：[姓名]`);
