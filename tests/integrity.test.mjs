import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const monsters=JSON.parse(readFileSync(new URL('../data/monsters.json',import.meta.url),'utf8')).monsters;
const names=JSON.parse(readFileSync(new URL('../data/nomes-pt-BR.json',import.meta.url),'utf8'));

test('dados do bestiário têm IDs únicos e campos essenciais',()=>{
  assert.equal(monsters.length,322);
  const ids=new Set();
  for(const m of monsters){
    assert.ok(m.id&&m.name&&m.cr!==undefined&&m.stat_block_json,'ficha incompleta: '+JSON.stringify({id:m.id,name:m.name}));
    assert.ok(!ids.has(m.id),'ID duplicado: '+m.id);
    ids.add(m.id);
  }
});

test('todos os monstros têm nome em português cadastrado',()=>{
  const missing=monsters.filter(m=>!names[m.name]).map(m=>m.name);
  assert.deepEqual(missing,[]);
  assert.equal(Object.keys(names).length,monsters.length);
});

test('arquivos locais principais referenciados pelo HTML existem',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const paths=[...html.matchAll(/(?:href|src)="(\/[^"#?]+)"/g)].map(m=>m[1]);
  const checked=paths.filter(p=>!p.startsWith('/manifest.webmanifest')&&!p.startsWith('/icon.svg')?true:true);
  for(const p of checked){
    assert.ok(existsSync(new URL('..'+p,import.meta.url)),'Arquivo ausente: '+p);
  }
});
