import { loadData, fits } from './_load.mjs';
const D = loadData(new URL('../index.html', import.meta.url));
const src = D.src;
const {MECHANICS:M,FEEDBACK:F,ENGAGEMENT:E,COMMON_FIELDS:C,VISUAL_FIELDS:V,PRESETS:P,STYLE_LIST,STYLE_RECIPES}=D;
console.log(`Механик ${M.length} · обратной связи ${F.length} · вовлечения ${E.length} · наборов ${P.length}`);

let bad=0;
console.log('\n1) Плейсхолдеры и поля:');
for(const[n,l] of [['MECH',M],['FB',F],['ENG',E]])
  for(const it of l){
    const ph=new Set([...it.p.matchAll(/\{([^}]+)\}/g)].map(m=>m[1]));
    const ks=new Set((it.f||[]).map(f=>f.k));
    const miss=[...ph].filter(k=>!ks.has(k)), un=[...ks].filter(k=>!ph.has(k));
    if(miss.length||un.length){bad++;console.log(`  ${n} ${it.id}: нет поля ${JSON.stringify(miss)}, поле без плейсхолдера ${JSON.stringify(un)}`);}
  }
console.log(bad? '' : '  всё сходится');

console.log('\n2) Ссылки на механики:');
const ids=new Set(M.map(m=>m.id)); let bad2=0;
for(const it of [...F,...E]){
  const refs=[...(Array.isArray(it.m)?it.m:[]),...(it.x||[])].filter(r=>!ids.has(r));
  if(refs.length){bad2++;console.log(`  ${it.id}: ${refs}`);}
}
console.log(bad2? '' : '  всё сходится');

console.log('\n3) Дубли ключей полей внутри блока:');
let bad3=0;
for(const it of [...M,...F,...E,{id:'COMMON',f:C},{id:'VISUAL',f:V}]){
  const ks=(it.f||[]).map(f=>f.k), dup=ks.filter((k,i)=>ks.indexOf(k)!==i);
  if(dup.length){bad3++;console.log(`  ${it.id}: ${dup}`);}
}
console.log(bad3? '' : '  дублей нет');

console.log('\n4) Покрытие блоками:');
const rows=M.map(m=>({n:m.num,t:m.title,fb:F.filter(i=>fits(i,m.id)).length,e:E.filter(i=>fits(i,m.id)).length}));
rows.sort((a,b)=>(a.fb+a.e)-(b.fb+b.e));
console.log('  минимум:');
rows.slice(0,4).forEach(r=>console.log(`    №${r.n} ${r.t}: обр.связь ${r.fb}, вовлечение ${r.e}`));
console.log(`  диапазон обратной связи: ${Math.min(...rows.map(r=>r.fb))}–${Math.max(...rows.map(r=>r.fb))}`);
console.log(`  диапазон вовлечения:     ${Math.min(...rows.map(r=>r.e))}–${Math.max(...rows.map(r=>r.e))}`);

console.log('\n5) «Свой вариант» и примеры:');
const all=[...M.map(x=>['мех',x]),...F.map(x=>['обр',x]),...E.map(x=>['вов',x]),['общ',{id:'COMMON',f:C}],['виз',{id:'VISUAL',f:V}]];
let sel=0,txt=0,txtEx=0,opts=0;
for(const[,it] of all) for(const f of (it.f||[])){
  if(f.t==='sel'){sel++;opts+=(f.o||[]).length;}
  if(f.t==='txt'){txt++;if((f.ex||[]).length)txtEx++;}
}
console.log(`  списков: ${sel} (в них ${opts} готовых вариантов, в каждом дополнительно «✍️ Свой вариант»)`);
console.log(`  текстовых полей: ${txt}, из них с примерами-подсказками: ${txtEx}`);
console.log(`  всего готовых примеров для выбора: ${opts + all.reduce((s,[,it])=>s+(it.f||[]).reduce((q,f)=>q+(f.ex||[]).length,0),0)}`);

console.log('\n6) Наборы (пресеты) ссылаются на существующие блоки:');
let bad6=0;
for(const p of P){
  const b=[...(p.fb==='all'?[]:p.fb).filter(i=>!F.some(f=>f.id===i)),...(p.eng==='all'?[]:p.eng).filter(i=>!E.some(f=>f.id===i))];
  if(b.length){bad6++;console.log(`  ${p.id}: ${b}`);}
}
console.log(bad6? '' : '  всё сходится');

console.log('\n7) Подсказки-плейсхолдеры не записаны в значение:');
let bad7=0;
for(const[,it] of all) for(const f of (it.f||[]))
  if(f.t==='txt'&&/например|введите|впишите/i.test(f.v||'')){bad7++;console.log(`  ${it.id}.${f.k} = "${f.v}"`);}
console.log(bad7? '' : '  ни одного — подсказки только в ph');

console.log('\n8) Стили и рецепты оформления:');
const noRecipe = STYLE_LIST.filter(s => !STYLE_RECIPES[s]);
const orphan = Object.keys(STYLE_RECIPES).filter(s => !STYLE_LIST.includes(s));
console.log(`  стилей в списке: ${STYLE_LIST.length}, рецептов: ${Object.keys(STYLE_RECIPES).length}`);
if (noRecipe.length) console.log('  БЕЗ РЕЦЕПТА: ' + noRecipe.join(', '));
if (orphan.length) console.log('  РЕЦЕПТ БЕЗ СТИЛЯ: ' + orphan.join(', '));
if (!noRecipe.length && !orphan.length) console.log('  у каждого стиля есть рецепт');
const short = STYLE_LIST.filter(s => (STYLE_RECIPES[s]||'').length < 120);
if (short.length) console.log('  СЛИШКОМ КОРОТКИЙ РЕЦЕПТ: ' + short.join(', '));
