import {validateContent} from './core.mjs';
const byId=id=>document.getElementById(id);
function render(data) {
  document.title=data.name;
  for (const key of ['name','eyebrow','headline','bio','note']) byId(key).textContent=data[key];
  byId('brand').textContent=data.name;
  for(const key of ['avatar','cover']) {
    const img=byId(key); img.hidden=!data[key];
    if(data[key]) img.src=data[key]; else img.removeAttribute('src');
  }
  byId('cover-wrap').hidden=!data.cover;
  byId('empty').hidden=!!data.links.length;
  byId('links').replaceChildren(...data.links.map(link=>{
    const a=document.createElement('a'); a.className='link-card'; a.href=link.url; a.target='_blank'; a.rel='noopener noreferrer';
    const text=document.createElement('div'), title=document.createElement('h3'), desc=document.createElement('p'), arrow=document.createElement('span');
    title.textContent=link.title; desc.textContent=link.description; arrow.textContent='↗'; arrow.setAttribute('aria-hidden','true');
    text.append(title,desc); a.append(text,arrow); return a;
  }));
}
try {
  const preview=new URLSearchParams(location.search).get('preview')==='1';
  let data;
  if(preview) {
    data=JSON.parse(sessionStorage.getItem('phantom-preview')||'null');
    if(!data) throw new Error('请从编辑页重新打开预览。');
    byId('preview-label').hidden=false;
  } else {
    const response=await fetch('./content.json',{cache:'no-store'});
    if(!response.ok) throw new Error('主页暂时无法读取，请稍后刷新。');
    data=await response.json();
  }
  render(validateContent(data));
} catch(error) { byId('bio').textContent=''; byId('load-error').hidden=false; byId('load-error').textContent=error.message; }
