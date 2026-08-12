import io, os

code = io.open('/home/user/c1/index.html', encoding='utf-8').read()
esc = code.replace('&', '&amp;').replace('<', '&lt;')
lines = code.count('\n') + 1
size_kb = round(len(code.encode('utf-8')) / 1024)

NL = chr(10)
frag_rows = []
for fn, what in [
    ('01-head.html', 'Стили оформления конструктора'),
    ('02-body.html', 'Разметка: семь шагов и нижняя панель'),
    ('03-mechanics.js', '32 игровые механики'),
    ('04-blocks.js', '14 блоков обратной связи и 14 вовлечения'),
    ('05-fields.js', 'Общие поля, 28 стилей с рецептами, готовые наборы'),
    ('06-app.js', 'Состояние и отрисовка полей «выбор или своё»'),
    ('07-prompt.js', 'Сборка промпта и проверки перед выдачей'),
    ('08-events.js', 'Кнопки, клавиатура, сохранение'),
]:
    p = '/home/user/c1/build/' + fn
    n = io.open(p, encoding='utf-8').read().count('\n') + 1
    frag_rows.append(
        f'<tr><td><code>{fn}</code></td><td>{what}</td><td class="num">{n}</td></tr>'
    )

# Перевод строки держим ВНУТРИ спана, а сами спаны оставляем строчными.
# Тогда textContent блока в точности равен исходному файлу, включая пустые строки.
_lines = esc.split(NL)
_trailing = _lines and _lines[-1] == ''
if _trailing:
    _lines = _lines[:-1]
code_lines = ''.join(
    '<span class="l">' + ln + (NL if (_trailing or i < len(_lines) - 1) else '') + '</span>'
    for i, ln in enumerate(_lines)
)

html = f'''<title>Код конструктора промптов</title>
<style>
  :root {{
    --ground:#FBFAFD; --surface:#FFFFFF; --code-bg:#F6F3FA;
    --ink:#221B2B; --muted:#6B6076; --line:#E4DEEE;
    --accent:#4C2670; --accent-soft:#EDE4F6; --amber:#8A5B00; --amber-soft:#FDF3DC;
  }}
  @media (prefers-color-scheme: dark) {{
    :root:not([data-theme="light"]) {{
      --ground:#15111B; --surface:#1D1725; --code-bg:#191320;
      --ink:#ECE6F2; --muted:#A79DB4; --line:#332A40;
      --accent:#C6A5E1; --accent-soft:#2A2135; --amber:#FFC845; --amber-soft:#2E2412;
    }}
  }}
  :root[data-theme="dark"] {{
    --ground:#15111B; --surface:#1D1725; --code-bg:#191320;
    --ink:#ECE6F2; --muted:#A79DB4; --line:#332A40;
    --accent:#C6A5E1; --accent-soft:#2A2135; --amber:#FFC845; --amber-soft:#2E2412;
  }}

  * {{ box-sizing:border-box; }}
  body {{
    margin:0; background:var(--ground); color:var(--ink);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
    line-height:1.6; font-size:16px;
  }}
  .wrap {{ max-width:1100px; margin:0 auto; padding:clamp(24px,4vw,56px) clamp(16px,4vw,32px) 80px; }}

  header {{ border-bottom:1px solid var(--line); padding-bottom:28px; margin-bottom:32px; }}
  .eyebrow {{
    font-size:12px; letter-spacing:.14em; text-transform:uppercase;
    color:var(--muted); font-weight:700; margin:0 0 12px;
  }}
  h1 {{
    font-family:ui-serif,Georgia,"Times New Roman",serif;
    font-size:clamp(30px,5vw,46px); line-height:1.1; margin:0 0 14px;
    letter-spacing:-.02em; text-wrap:balance; font-weight:600;
  }}
  .lede {{ margin:0; max-width:62ch; color:var(--muted); font-size:17px; }}

  .stats {{ display:flex; flex-wrap:wrap; gap:10px; margin:24px 0 0; }}
  .stat {{
    background:var(--surface); border:1px solid var(--line); border-radius:10px;
    padding:10px 14px; font-size:14px;
  }}
  .stat b {{ display:block; font-size:20px; color:var(--accent);
    font-variant-numeric:tabular-nums; font-weight:700; }}
  .stat span {{ color:var(--muted); font-size:12.5px; }}

  h2 {{
    font-family:ui-serif,Georgia,serif; font-size:24px; font-weight:600;
    margin:44px 0 14px; letter-spacing:-.01em;
  }}
  p {{ max-width:66ch; }}

  ol.steps {{ max-width:66ch; padding-left:22px; margin:0; }}
  ol.steps li {{ margin-bottom:12px; }}
  ol.steps code {{ font-size:.9em; }}

  code {{
    font-family:ui-monospace,"SF Mono","Cascadia Code",Consolas,monospace;
    background:var(--accent-soft); color:var(--accent);
    padding:2px 6px; border-radius:5px; font-size:.88em;
  }}

  table {{ border-collapse:collapse; width:100%; font-size:14.5px; margin-top:8px; }}
  th, td {{ text-align:left; padding:9px 12px; border-bottom:1px solid var(--line); }}
  th {{ font-size:12px; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); }}
  td code {{ background:none; padding:0; color:var(--ink); }}
  td.num {{ text-align:right; font-variant-numeric:tabular-nums; color:var(--muted); }}
  .scroll {{ overflow-x:auto; }}

  .codebar {{
    position:sticky; top:0; z-index:5;
    display:flex; align-items:center; gap:12px; flex-wrap:wrap;
    background:var(--surface); border:1px solid var(--line); border-bottom:none;
    border-radius:12px 12px 0 0; padding:12px 16px;
  }}
  .codebar .name {{
    font-family:ui-monospace,Consolas,monospace; font-weight:700; font-size:14px;
  }}
  .codebar .meta {{ color:var(--muted); font-size:13px; margin-right:auto;
    font-variant-numeric:tabular-nums; }}
  button {{
    font:inherit; font-size:14px; font-weight:650; cursor:pointer;
    border:1px solid var(--accent); background:var(--accent);
    color:var(--ground); padding:9px 16px; border-radius:9px;
    transition:opacity .15s ease;
  }}
  button.ghost {{ background:transparent; color:var(--accent); }}
  button:hover {{ opacity:.84; }}
  button:focus-visible {{ outline:3px solid var(--amber); outline-offset:2px; }}

  .codewrap {{
    border:1px solid var(--line); border-radius:0 0 12px 12px;
    background:var(--code-bg); overflow:auto; max-height:70vh;
  }}
  .codewrap pre {{
    margin:0; padding:18px 20px 18px 0; counter-reset:l;
    font-family:ui-monospace,"SF Mono","Cascadia Code",Consolas,monospace;
    font-size:12.5px; line-height:1.65; tab-size:2;
  }}
  .codewrap .l {{ display:inline; }}
  .codewrap .l::before {{
    counter-increment:l; content:counter(l);
    display:inline-block; width:5.2em; padding-right:1.4em;
    text-align:right; color:var(--muted); opacity:.55;
    position:sticky; left:0; background:var(--code-bg);
    user-select:none;
  }}

  .note {{
    background:var(--amber-soft); border:1px solid var(--amber);
    border-radius:10px; padding:14px 16px; max-width:66ch; margin:18px 0 0;
    font-size:15px;
  }}
  .note b {{ color:var(--amber); }}

  footer {{ margin-top:56px; padding-top:22px; border-top:1px solid var(--line);
    color:var(--muted); font-size:14px; }}
  a {{ color:var(--accent); }}

  @media (prefers-reduced-motion:reduce) {{ * {{ transition:none !important; }} }}
</style>

<div class="wrap">
  <header>
    <p class="eyebrow">Исходный код · один файл</p>
    <h1>Код конструктора промптов</h1>
    <p class="lede">Полный исходник конструктора: HTML, CSS и JavaScript в одном файле.
      Ничего внешнего не подключается — работает с диска, без сервера и без интернета.</p>
    <div class="stats">
      <div class="stat"><b>{lines}</b><span>строк кода</span></div>
      <div class="stat"><b>{size_kb} КБ</b><span>размер файла</span></div>
      <div class="stat"><b>32</b><span>механики</span></div>
      <div class="stat"><b>28</b><span>блоков обратной связи и вовлечения</span></div>
      <div class="stat"><b>28</b><span>стилей оформления</span></div>
      <div class="stat"><b>0</b><span>внешних зависимостей</span></div>
    </div>
  </header>

  <h2>Как использовать</h2>
  <ol class="steps">
    <li><b>Как готовый файл.</b> Сохраните код в файл с именем <code>index.html</code>
      и откройте двойным щелчком.</li>
    <li><b>Как блок на сайте.</b> Возьмите всё, что внутри
      <code>&lt;style&gt;…&lt;/style&gt;</code>, <code>&lt;main id="prompt-constructor-iy"&gt;…&lt;/main&gt;</code>
      и <code>&lt;script&gt;…&lt;/script&gt;</code>, и вставьте в блок HTML-кода на странице.
      Все стили ограничены идентификатором <code>#prompt-constructor-iy</code>
      и не влияют на остальной сайт.</li>
    <li><b>Чтобы дорабатывать.</b> Редактируйте фрагменты из папки <code>build/</code>
      и пересобирайте файл командой <code>sh build/build.sh</code> — так данные
      не перемешиваются с логикой.</li>
  </ol>

  <div class="note"><b>Где что менять.</b> Списки механик, вариантов ответа и стилей —
    это обычные массивы в начале скрипта: <code>MECHANICS</code>, <code>FEEDBACK</code>,
    <code>ENGAGEMENT</code>, <code>STYLE_LIST</code> и <code>STYLE_RECIPES</code>.
    Чтобы добавить свой вариант в любой список, допишите строку в поле <code>o:</code>.
    Пункт «Свой вариант» подставляется ко всем спискам сам — прописывать его не нужно.</div>

  <h2>Из чего собран файл</h2>
  <div class="scroll">
    <table>
      <thead><tr><th>Фрагмент</th><th>Что внутри</th><th class="num">Строк</th></tr></thead>
      <tbody>{''.join(frag_rows)}</tbody>
    </table>
  </div>

  <h2>Весь код</h2>
  <div class="codebar">
    <span class="name">index.html</span>
    <span class="meta" id="meta">{lines} строк · {size_kb} КБ</span>
    <button class="ghost" id="sel" type="button">Выделить всё</button>
    <button id="copy" type="button">Скопировать код</button>
  </div>
  <div class="codewrap" id="box"><pre id="code">{code_lines}</pre></div>

  <footer>
    Конструктор промптов для интерактивных HTML-игр.
    Исходник и фрагменты — в репозитории
    <a href="https://github.com/belunita25-coder/c1">belunita25-coder/c1</a>,
    ветка <code>claude/constructor-analysis-improvements-u10uyo</code>.
  </footer>
</div>

<script>
  var code = document.getElementById('code');
  var meta = document.getElementById('meta');
  var base = meta.textContent;

  // textContent, а не innerText: он отдаёт файл байт в байт, вместе с пустыми строками
  function text() {{ return code.textContent; }}

  function say(msg) {{
    meta.textContent = msg;
    setTimeout(function () {{ meta.textContent = base; }}, 2600);
  }}

  document.getElementById('copy').addEventListener('click', function () {{
    var t = text();
    if (navigator.clipboard && window.isSecureContext) {{
      navigator.clipboard.writeText(t).then(
        function () {{ say('Код скопирован'); }},
        function () {{ say('Не вышло — нажмите «Выделить всё», затем Ctrl+C'); }}
      );
    }} else {{
      say('Нажмите «Выделить всё», затем Ctrl+C');
    }}
  }});

  document.getElementById('sel').addEventListener('click', function () {{
    var r = document.createRange();
    r.selectNodeContents(code);
    var s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
    say('Код выделен — нажмите Ctrl+C');
  }});
</script>
'''

out = '/home/user/c1/build/code-page.html'
io.open(out, 'w', encoding='utf-8').write(html)
print('готово:', out, round(len(html.encode('utf-8'))/1024), 'КБ')
