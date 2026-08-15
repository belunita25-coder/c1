import fs from 'fs';
const src = fs.readFileSync(new URL('../complex.html', import.meta.url), 'utf8');
const pick = (n) => {
  const i = src.indexOf(`const ${n} =`);
  if (i < 0) throw new Error('не найден ' + n);
  let a = src.indexOf('=', i) + 1; while (' \t\r\n'.includes(src[a])) a++;
  const cl = src[a] === '[' ? ']' : '}';
  let d = 0, j = a, S = false, e = false, q = '';
  for (; j < src.length; j++) { const c = src[j];
    if (S) { if (e) e = false; else if (c === '\\') e = true; else if (c === q) S = false; continue; }
    if (c === '"' || c === "'") { S = true; q = c; continue; }
    if (c === src[a]) d++; if (c === cl) { d--; if (d === 0) { j++; break; } } }
  return new Function('STYLE_LIST', 'return ' + src.slice(a, j))(STYLE_LIST_CACHE);
};
let STYLE_LIST_CACHE = [];
const SP0 = pick('STYLE_GROUPS');
STYLE_LIST_CACHE = SP0.flatMap(g => g.items.map(i => i[0]));
const M = pick('MECHANICS'), F = pick('FEEDBACK'), E = pick('ENGAGEMENT'),
      SP = SP0, SCOPE = pick('BLOCK_SCOPE'), SKIP = pick('BLOCK_SKIP'),
      C = pick('COMMON_FIELDS'), V = pick('VISUAL_FIELDS'), P = pick('PRESETS'), PS = pick('STAGE_PROMPTS');

const styles = SP.flatMap(g => g.items);
const blocks = [...F, ...E].filter(b => !SKIP.includes(b.id));
console.log(`Механик ${M.length} · блоков ${blocks.length} · стилей ${styles.length} в ${SP.length} группах · наборов ${P.length}`);

let bad = 0;
console.log('\n1) Этапные тексты механик:');
const noPs = M.filter(m => !PS[m.id]);
if (noPs.length) { bad++; console.log('  НЕТ ЭТАПНОГО ТЕКСТА: ' + noPs.map(m => m.id)); }
for (const m of M) {
  const ps = PS[m.id]; if (!ps) continue;
  const ph = new Set([...ps.matchAll(/\{([^}]+)\}/g)].map(x => x[1]));
  const ks = new Set((m.f || []).map(f => f.k));
  const miss = [...ph].filter(k => !ks.has(k));
  const unused = [...ks].filter(k => !ph.has(k));
  if (miss.length || unused.length) { bad++; console.log(`  ${m.id}: нет поля ${JSON.stringify(miss)}, поле без плейсхолдера ${JSON.stringify(unused)}`); }
  if (/Создай интерактивную HTML-игру|Играть снова|итоговый экран|финальный экран/i.test(ps)) {
    bad++; console.log(`  ${m.id}: в этапном тексте осталась команда создать игру или свой финал`);
  }
}
console.log(bad ? '' : '  у всех 32 механик есть этапный текст, плейсхолдеры сходятся, своих финалов нет');

console.log('\n2) Плейсхолдеры блоков:');
let b2 = 0;
for (const it of blocks) {
  const ph = new Set([...it.p.matchAll(/\{([^}]+)\}/g)].map(x => x[1]));
  const ks = new Set((it.f || []).map(f => f.k));
  const miss = [...ph].filter(k => !ks.has(k)), un = [...ks].filter(k => !ph.has(k));
  if (miss.length || un.length) { b2++; console.log(`  ${it.id}: ${JSON.stringify(miss)} / ${JSON.stringify(un)}`); }
}
console.log(b2 ? '' : '  всё сходится');

console.log('\n3) У каждого блока задан уровень:');
const noScope = blocks.filter(b => !SCOPE[b.id]);
console.log(noScope.length ? '  БЕЗ УРОВНЯ: ' + noScope.map(b => b.id) : '  да, у всех');
const game = blocks.filter(b => SCOPE[b.id] === 'game'), stage = blocks.filter(b => SCOPE[b.id] === 'stage');
console.log(`  для всей игры: ${game.length} — ${game.map(b => b.title).join(', ')}`);
console.log(`  для этапа:     ${stage.length} — ${stage.map(b => b.title).join(', ')}`);

const fits = (it, id) => !(it.x || []).includes(id) && (it.m === 'all' || (Array.isArray(it.m) && it.m.includes(id)));
console.log('\n4) Сколько этапных блоков доступно механике:');
const rows = M.map(m => ({ n: m.num, t: m.title, c: stage.filter(b => fits(b, m.id)).length }));
rows.sort((a, b) => a.c - b.c);
console.log(`  минимум ${rows[0].c} (№${rows[0].n} ${rows[0].t}), максимум ${rows[rows.length - 1].c}`);
rows.filter(r => r.c <= 2).forEach(r => console.log(`    №${r.n} ${r.t}: ${r.c}`));

console.log('\n5) Стили:');
const names = styles.map(s => s[0]);
const dup = names.filter((n, i) => names.indexOf(n) !== i);
console.log(`  дубли названий: ${dup.length ? dup.join(', ') : 'нет'}`);
const short = styles.filter(s => s[1].length < 120);
console.log(`  рецептов короче 120 символов: ${short.length ? short.map(s => s[0]).join(', ') : 'нет'}`);
const lens = styles.map(s => s[1].length);
console.log(`  длина рецепта: ${Math.min(...lens)}–${Math.max(...lens)}, в среднем ${Math.round(lens.reduce((a, b) => a + b, 0) / lens.length)}`);
const lat = names.filter(n => /^[a-z0-9 -]+$/i.test(n));
console.log(`  названия латиницей: ${lat.length ? lat.join(', ') : 'нет'}`);

console.log('\n6) Наборы ссылаются на существующие блоки:');
let b6 = 0;
for (const p of P) { const b = (p.g === 'all' ? [] : p.g).filter(id => !game.some(x => x.id === id));
  if (b.length) { b6++; console.log(`  ${p.id}: ${b}`); } }
console.log(b6 ? '' : '  всё сходится');

console.log('\n7) Подсказки не записаны в значения полей:');
const all = [...M.map(m => ({ id: m.id, f: m.f })), ...blocks, { id: 'COMMON', f: C }, { id: 'VISUAL', f: V }];
let b7 = 0;
for (const it of all) for (const f of (it.f || []))
  if (f.t === 'txt' && /например|введите|впишите/i.test(f.v || '')) { b7++; console.log(`  ${it.id}.${f.k} = "${f.v}"`); }
console.log(b7 ? '' : '  ни одной — подсказки только в ph');
