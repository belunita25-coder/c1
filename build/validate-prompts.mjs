import { loadData, fits } from './_load.mjs';
const D = loadData(new URL('../index.html', import.meta.url));
const src = D.src;
// достаём саму функцию fill из файла
const fi = src.indexOf('function keepSentence');
const fj = src.indexOf('function blockVal');
const fill = new Function(src.slice(fi,fj) + '; return fill;')();

const {MECHANICS:M,FEEDBACK:F,ENGAGEMENT:E}=D;
const all=[...M,...F,...E];
let problems=0, dropped=0;

for(const it of all){
  // случай A: все поля пустые
  const empty={}; (it.f||[]).forEach(f=>empty[f.k]='');
  const a = fill(it.p, empty);
  // случай B: все поля заполнены
  const full={}; (it.f||[]).forEach(f=>full[f.k]= f.t==='sel'?(f.o[0]):(f.t==='num'?'7':'ЗНАЧЕНИЕ'));
  const b = fill(it.p, full);

  for(const [name,txt] of [['пусто',a],['заполнено',b]]){
    if(/:\s*\.|«»|\{|\}/.test(txt)){ problems++; console.log(`ОБРУБОК ${it.id} (${name}): ` + txt.split('\n').find(l=>/:\s*\.|«»|\{|\}/.test(l))); }
  }
  // проверяем, что при пустых полях осталась содержательная часть
  if(a.trim().length < 40){ dropped++; console.log(`СЛИШКОМ МАЛО ОСТАЛОСЬ ${it.id}: "${a.trim()}"`); }
  // проверяем, что заполненный вариант содержит все значения
  const missing=(it.f||[]).filter(f=>!b.includes(full[f.k]));
  if(missing.length){ problems++; console.log(`ПОТЕРЯНЫ ЗНАЧЕНИЯ ${it.id}: ${missing.map(f=>f.k)}`); }
}
console.log(`\nПроверено блоков: ${all.length}. Проблем: ${problems}. Слишком сильно урезано: ${dropped}.`);
