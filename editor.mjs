import {validateContent,encodeContent,decodeContent,repoPath} from './core.mjs';
const $=id=>document.getElementById(id), fields=['name','eyebrow','headline','bio','note'];
const draftKey=`phantom-draft:${new URL('./',location.href).pathname}`;
let images={avatar:'',cover:''}, sha=null, connection=null, dirty=false, busy=false;
const status=(text,type='')=>{$('status').textContent=text;$('status').className=`admin-status ${type}`;};
const guard=fn=>async event=>{event?.preventDefault();try{await fn(event);}catch(e){status(e.message,'error');$('status').scrollIntoView({block:'nearest',behavior:'smooth'});}};
const config=()=>({owner:$('owner').value.trim(),repo:$('repo').value.trim(),branch:$('branch').value.trim()});
const connectionKey=()=>JSON.stringify(config());
function addLink(link={title:'',description:'',url:''}) {
  if($('links-editor').children.length>=12) throw new Error('最多添加12个链接。');
  const row=document.createElement('div');row.className='link-editor';
  for(const [key,label,max] of [['title','链接名称',60],['description','简短说明',160],['url','完整网址',2000]]) {
    const wrapper=document.createElement('label');wrapper.textContent=label;
    const input=document.createElement('input');input.dataset.key=key;input.value=link[key];input.maxLength=max;input.required=key!=='description';
    if(key==='url'){input.type='url';input.placeholder='https://';}
    wrapper.append(input);row.append(wrapper);
  }
  const toolbar=document.createElement('div');toolbar.className='toolbar';
  for(const [label,action] of [['上移',()=>{if(row.previousElementSibling)row.parentNode.insertBefore(row,row.previousElementSibling);}],['下移',()=>{if(row.nextElementSibling)row.parentNode.insertBefore(row.nextElementSibling,row);}],['删除链接',()=>row.remove()]]) {
    const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=()=>{action();dirty=true;};toolbar.append(button);
  }
  row.append(toolbar);$('links-editor').append(row);
}
function collect() {
  const data={version:1,...images,links:[],updatedAt:''};
  fields.forEach(key=>data[key]=$(key).value);
  for(const row of $('links-editor').children) {
    const link={};row.querySelectorAll('input').forEach(input=>link[input.dataset.key]=input.value);data.links.push(link);
  }
  return validateContent(data);
}
function populate(data) {
  fields.forEach(key=>$(key).value=data[key]);images={avatar:data.avatar,cover:data.cover};
  $('links-editor').replaceChildren();data.links.forEach(addLink);
  for(const key of ['avatar','cover']) {const img=$(key+'-preview');img.hidden=!images[key];if(images[key])img.src=images[key];else img.removeAttribute('src');}
  dirty=false;
}
async function github(method='GET',body) {
  const token=$('token').value.trim();if(!token)throw new Error('请展开“发布连接”，填写仅限本仓库的 GitHub 令牌。');
  const cfg=config();const url=repoPath(cfg)+(method==='GET'?`?ref=${encodeURIComponent(cfg.branch)}`:'');
  const response=await fetch(url,{method,cache:'no-store',headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  if(!response.ok){const messages={401:'令牌无效或已过期，请重新连接。',403:'没有写入权限，或接口暂时限流。请检查本仓库的 Contents 读写权限。',404:'找不到内容文件，请检查仓库、分支及令牌的仓库访问权限。',409:'线上内容已变化，本次没有覆盖。请先导出本机备份，再读取线上版本合并修改。',422:'发布未通过，请检查内容和分支权限。'};throw new Error(messages[response.status]||`发布服务暂时不可用（${response.status}），请稍后重试。`);}
  return response.json();
}
$('editor').addEventListener('input',event=>{if(!['token','owner','repo','branch'].includes(event.target.id))dirty=true;});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
$('add-link').onclick=guard(()=>{addLink();dirty=true;});
$('save-draft').onclick=guard(()=>{localStorage.setItem(draftKey,JSON.stringify(collect()));dirty=false;status('草稿已保存在本机，访客页面没有变化。','success');});
$('restore').onclick=guard(()=>{const raw=localStorage.getItem(draftKey);if(!raw)throw new Error('当前浏览器没有草稿。');if(dirty&&!confirm('恢复草稿会替换当前未保存的编辑，是否继续？'))return;populate(validateContent(JSON.parse(raw)));dirty=true;status('已恢复本机草稿，尚未发布。');});
$('backup').onclick=guard(()=>{const blob=new Blob([JSON.stringify(collect(),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='幻牌主页-内容备份.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('内容备份已导出，不包含访问令牌。','success');});
$('import').onchange=guard(async()=>{const file=$('import').files[0];if(!file)return;if(file.size>1000000)throw new Error('备份文件不得超过1MB。');const data=validateContent(JSON.parse(await file.text()));if(dirty&&!confirm('导入会替换当前未保存的编辑，是否继续？'))return;populate(data);dirty=true;status('备份已导入，预览后再发布。');$('import').value='';});
$('preview-button').onclick=guard(()=>{sessionStorage.setItem('phantom-preview',JSON.stringify(collect()));$('preview').hidden=false;$('preview').src='./?preview=1';$('preview').scrollIntoView({behavior:'smooth',block:'start'});status('当前为本机预览，访客页面尚未更新。');});
$('connect-button').onclick=guard(async()=>{if(dirty&&!confirm('读取线上版本会替换当前编辑，请先保存草稿或导出备份。继续读取？'))return;status('正在验证连接…');const remote=await github();const data=decodeContent(remote.content);sha=remote.sha;connection=connectionKey();populate(data);status('已连接。现在可以编辑并发布更新。','success');});
$('disconnect').onclick=()=>{$('token').value='';connection=null;sha=null;status('已清除访问令牌。内容仍可预览和保存草稿。');};
$('editor').onsubmit=guard(async()=>{
  if(busy)return;
  if(!sha||connection!==connectionKey()){$('connect').open=true;throw new Error('请先连接并读取线上版本，再编辑发布。你可以先保存本机草稿，连接后恢复草稿。');}
  const data=collect();data.updatedAt=new Date().toISOString();busy=true;$('publish').disabled=true;status('正在提交发布，请不要关闭页面…');
  try{const result=await github('PUT',{message:'更新随身主页内容',content:encodeContent(data),sha,branch:config().branch});sha=result.content.sha;dirty=false;localStorage.setItem(draftKey,JSON.stringify(data));status('已提交发布。GitHub Pages 完成部署后访客即可看到更新，通常需要几分钟。可点“查看访客页面”检查。','success');}
  finally{busy=false;$('publish').disabled=false;}
});
for(const key of ['avatar','cover']) {
  $(key+'-file').onchange=guard(async()=>{
    const file=$(key+'-file').files[0];if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>12000000)throw new Error('请选择12MB以内的 JPG、PNG 或 WebP 图片。');
    const bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>40000000){bitmap.close();throw new Error('图片尺寸过大，请先缩小。');}
    const scale=Math.min(1,(key==='avatar'?320:1200)/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
    const ctx=canvas.getContext('2d');ctx.fillStyle='#191d19';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    const result=canvas.toDataURL('image/jpeg',.78);if(result.length>420000)throw new Error('图片压缩后仍过大，请换一张更小的图片。');images[key]=result;$(key+'-preview').src=result;$(key+'-preview').hidden=false;dirty=true;status('图片已添加到编辑内容，发布后才会公开。');
  });
  $('clear-'+key).onclick=()=>{images[key]='';$(key+'-preview').hidden=true;$(key+'-file').value='';dirty=true;};
}
try{
  const [contentResponse,configResponse]=await Promise.all([fetch('./content.json',{cache:'no-store'}),fetch('./config.json',{cache:'no-store'})]);
  if(!contentResponse.ok)throw new Error('主页内容读取失败，请刷新重试。');populate(validateContent(await contentResponse.json()));
  if(configResponse.ok){const cfg=await configResponse.json();for(const key of ['owner','repo','branch'])$(key).value=cfg[key]||'';}
  status('内容已载入。可以先修改并预览，发布时再连接 GitHub。');
}catch(e){status(e.message,'error');}

