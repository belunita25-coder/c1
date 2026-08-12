import fs from 'fs';
const src = fs.readFileSync(new URL('../index.html', import.meta.url),'utf8');
const pick = (n) => { const i=src.indexOf(`const ${n} = [`), s=src.indexOf('[',i);
  let d=0,j=s,inS=false,e=false,q='';
  for(;j<src.length;j++){const c=src[j];
    if(inS){if(e)e=false;else if(c==='\\')e=true;else if(c===q)inS=false;continue;}
    if(c==='"'||c==="'"){inS=true;q=c;continue;}
    if(c==='[')d++; if(c===']'){d--;if(d===0){j++;break;}}}
  return new Function('return '+src.slice(s,j))(); };

// достаём саму функцию fill из файла
const fi = src.indexOf('function keepSentence');
const fj = src.indexOf('function blockVal');
const fill = new Function(src.slice(fi,fj) + '; return fill;')();

const M=pick('MECHANICS'),F=pick('FEEDBACK'),E=pick('ENGAGEMENT');
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
