export function safeUrl(value, image = false) {
  if (!value) return '';
  if (image && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) return value;
  try {
    const u = new URL(value);
    if (u.protocol === 'https:' && !u.username && !u.password) return u.href;
  } catch {}
  throw new Error(image ? '图片请上传 JPG、PNG、WebP，或使用 HTTPS 图片地址。' : '链接必须是完整的 https:// 网址。');
}
export function validateContent(input) {
  if (!input || input.version !== 1) throw new Error('内容文件格式不正确。');
  const result = {version:1};
  for (const [key, max] of Object.entries({name:50,eyebrow:60,headline:120,bio:2000,note:160})) {
    if (typeof input[key] !== 'string' || input[key].length > max) throw new Error(`${key} 内容过长或格式不正确。`);
    result[key] = input[key].trim();
  }
  if (!result.name || !result.headline) throw new Error('请填写主页名称和开场标题。');
  result.avatar = safeUrl(input.avatar || '', true);
  result.cover = safeUrl(input.cover || '', true);
  if (!Array.isArray(input.links) || input.links.length > 12) throw new Error('最多添加12个链接。');
  result.links = input.links.map(link => {
    if (typeof link.title !== 'string' || !link.title.trim() || link.title.length > 60) throw new Error('每个链接需填写名称（最多60字）。');
    if (typeof link.description !== 'string' || link.description.length > 160) throw new Error('链接说明最多160字。');
    const url = safeUrl(link.url);
    if (!url) throw new Error('请填写链接网址。');
    return {title:link.title.trim(),description:link.description.trim(),url};
  });
  result.updatedAt = typeof input.updatedAt === 'string' ? input.updatedAt : '';
  if (new TextEncoder().encode(JSON.stringify(result)).length > 900000) throw new Error('内容和图片总计需小于900KB，请压缩图片。');
  return result;
}
export function encodeContent(content) {
  const bytes = new TextEncoder().encode(JSON.stringify(content, null, 2) + '\n');
  let binary='';
  for (let i=0;i<bytes.length;i+=8192) binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(binary);
}
export function decodeContent(base64) {
  return validateContent(JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(base64.replace(/\s/g,'')), c=>c.charCodeAt(0)))));
}
export function repoPath(config) {
  if (!/^[A-Za-z0-9-]+$/.test(config.owner) || !/^[A-Za-z0-9_.-]+$/.test(config.repo) || !config.branch?.trim()) throw new Error('请填写正确的 GitHub 用户名、仓库名和分支。');
  return `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/content.json`;
}
