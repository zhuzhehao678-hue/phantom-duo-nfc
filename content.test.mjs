import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {validateContent,safeUrl,encodeContent,decodeContent,repoPath} from './core.mjs';
const base=JSON.parse(await readFile(new URL('./content.json',import.meta.url),'utf8'));
test('Chinese text and emoji survive GitHub base64 roundtrip',()=>{const data=validateContent({...base,bio:'中文 👋\n第二行'});assert.deepEqual(decodeContent(encodeContent(data)),data);});
test('reject executable and credential-bearing links',()=>{for(const url of ['javascript:alert(1)','data:text/html,test','https://user:secret@example.com','http://example.com'])assert.throws(()=>safeUrl(url));});
test('reject SVG uploads and oversized content',()=>{assert.throws(()=>safeUrl('data:image/svg+xml;base64,AAAA',true));assert.throws(()=>validateContent({...base,cover:'data:image/jpeg;base64,'+'A'.repeat(910000)}));});
test('preserve link order and reject empty link',()=>{const links=[{title:'第一',description:'',url:'https://example.com/a'},{title:'第二',description:'简介',url:'https://example.com/b'}];assert.deepEqual(validateContent({...base,links}).links,links);assert.throws(()=>validateContent({...base,links:[{title:'空',description:'',url:''}]}));});
test('validate repository URL boundaries',()=>{assert.equal(repoPath({owner:'Michael-Zacharie',repo:'phantom-duo-nfc',branch:'main'}),'https://api.github.com/repos/Michael-Zacharie/phantom-duo-nfc/contents/content.json');assert.throws(()=>repoPath({owner:'./other',repo:'test',branch:'main'}));});

