/* Достаёт массивы данных из index.html и вычисляет их в общей области видимости,
   чтобы работали ссылки вроде o: STYLE_LIST. */
import fs from 'fs';

const NAMES = ['MECHANICS','FEEDBACK','ENGAGEMENT','COMMON_FIELDS','STYLE_GROUPS','VISUAL_FIELDS','PRESETS','EXTRA_PRESETS'];

export function loadData(htmlPath){
  const src = fs.readFileSync(htmlPath, 'utf8');
  const chunks = [];
  for (const name of NAMES) {
    const i = src.indexOf(`const ${name} = `);
    if (i < 0) throw new Error('не найден ' + name);
    const open = src.indexOf(src[src.indexOf('=', i) + 2] === '[' ? '[' : '{', i);
    const closer = src[open] === '[' ? ']' : '}';
    let d = 0, j = open, inStr = false, esc = false, q = '';
    for (; j < src.length; j++) {
      const c = src[j];
      if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === q) inStr = false; continue; }
      if (c === '"' || c === "'") { inStr = true; q = c; continue; }
      if (c === src[open]) d++;
      if (c === closer) { d--; if (d === 0) { j++; break; } }
    }
    chunks.push(`const ${name} = ${src.slice(open, j)};`);
  }
  // STYLE_LIST и STYLE_RECIPES собираются из STYLE_GROUPS в самой странице —
  // повторяем это здесь, чтобы VISUAL_FIELDS могли на них сослаться
  const derive = `
    const STYLE_RECIPES = {}; const STYLE_LIST = [];
    STYLE_GROUPS.forEach(g => g.items.forEach(([n, r]) => { STYLE_RECIPES[n] = r; STYLE_LIST.push(n); }));`;
  const i = chunks.findIndex(c => c.startsWith('const STYLE_GROUPS'));
  chunks.splice(i + 1, 0, derive);
  const body = chunks.join('\n') + `\nreturn {${NAMES.join(',')},STYLE_LIST,STYLE_RECIPES};`;
  return { src, ...new Function(body)() };
}

export const fits = (it, id) =>
  !(it.x || []).includes(id) && (it.m === 'all' || (Array.isArray(it.m) && it.m.includes(id)));
