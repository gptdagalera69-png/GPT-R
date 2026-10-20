import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
const monsterData=JSON.parse(readFileSync(new URL('../data/monsters.json',import.meta.url),'utf8'));
test('SRD com 322 fichas carregado, busca e combate funcionam',async()=>{
 const nodes=new Map(),events={};
 class Node{constructor(){this.innerHTML='';this.textContent='';this.classList={toggle(){}};this.dataset={};}appendChild(){}remove(){}}
 globalThis.document={getElementById(id){if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id)},querySelectorAll(){return[]},addEventListener(name,fn){events[name]=fn},createElement(){return new Node()}};
 const db=new Map();
 globalThis.localStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,v),removeItem:k=>db.delete(k)};
 globalThis.window={scrollTo(){}};
 globalThis.navigator={};
 globalThis.confirm=()=>true;
 globalThis.prompt=()=>null;
 const oldInterval=globalThis.setInterval;
 globalThis.setInterval=()=>0;
 globalThis.fetch=async(url)=>({ok:true,json:async()=>monsterData});
 try{
  await import('../app.js');
  await new Promise(resolve=>setTimeout(resolve,30));
  const get=id=>document.getElementById(id).innerHTML;
  assert.equal(monsterData.monsters.length,322);
  assert.match(get('view'),/322/);
  const click=async(kind, value,qty)=>events.click({target:{closest(sel){if(kind==='view'&&sel==='[data-view]')return{dataset:{view:value}};if(kind==='action'&&sel==='[data-action]')return{dataset:{action:value,id:qty}};return null},matches(){return false}}});
  await click('view','bestiary');
  assert.match(get('view'),/Bestiário/);
  await click('action','add-encounter','srd:goblin');
  await click('view','builder');
  assert.match(get('view'),/Goblin/);
  await click('action','start-combat');
  assert.match(get('view'),/Mesa de combate/);
  assert.match(get('view'),/Iniciativa/);
  assert.match(get('view'),/Goblin/);
  await click('action','next-turn');
  assert.match(get('view'),/RODADA/);
  assert.ok(db.has('central-mestre-state-v2'));
 }finally{globalThis.setInterval=oldInterval}
});
