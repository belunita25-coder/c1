
      /* ==========================================================
         ПРИЛОЖЕНИЕ
         ========================================================== */

      const CUSTOM = '__custom__';
      const CUSTOM_LABEL = '✍️ Свой вариант';
      const STORAGE_KEY = 'iy-prompt-constructor-v2';

      const root = document.getElementById('prompt-constructor-iy');
      const $ = (id) => root.querySelector('#' + id);

      const el = {
        mechanics: $('iy-mechanics'), categories: $('iy-categories'), search: $('iy-search'),
        mechHelp: $('iy-mech-help'), summary: $('iy-summary'),
        basic: $('iy-basic-fields'), mechFields: $('iy-mechanic-fields'), mechFieldsTitle: $('iy-mech-fields-title'),
        visual: $('iy-visual-fields'), feedback: $('iy-feedback-list'), engagement: $('iy-engagement-list'),
        presets: $('iy-presets'), extraPresets: $('iy-extra-presets'), extra: $('iy-extra'),
        output: $('iy-output'), status: $('iy-status'), warnings: $('iy-warnings'), size: $('iy-size'),
        generate: $('iy-generate'), copy: $('iy-copy'), clearOutput: $('iy-clear-output'),
        download: $('iy-download'), share: $('iy-share'), clear: $('iy-clear'),
        stickyMech: $('iy-sticky-mech'), stickyMeta: $('iy-sticky-meta'),
        stickyCopy: $('iy-sticky-copy'), stickyTop: $('iy-sticky-top')
      };

      const state = {
        mechanic: MECHANICS[0].id,
        category: 'Все',
        search: '',
        styleFilter: '',
        values: {},     // path -> строка
        modes: {},      // path -> 'custom', если выбран свой вариант
        checked: { feedback: [], engagement: [] },
        extra: ''
      };

      /* ---------- утилиты ---------- */

      const esc = (v) => String(v == null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

      const norm = (v) => String(v || '').toLowerCase().trim();

      const domId = (path) => 'f_' + path.replace(/[^a-zA-Z0-9_]/g, '_');

      function fits(item, mechanicId){
        if ((item.x || []).includes(mechanicId)) return false;
        if (item.m === 'all') return true;
        return Array.isArray(item.m) && item.m.includes(mechanicId);
      }

      const mechanic = () => MECHANICS.find(m => m.id === state.mechanic) || MECHANICS[0];
      const availableFeedback = () => FEEDBACK.filter(i => fits(i, state.mechanic));
      const availableEngagement = () => ENGAGEMENT.filter(i => fits(i, state.mechanic));

      function getVal(path, field){
        if (Object.prototype.hasOwnProperty.call(state.values, path)) return state.values[path];
        return field && field.v != null ? field.v : '';
      }

      const isCustom = (path) => state.modes[path] === 'custom';

      /* ---------- сохранение ---------- */

      function snapshot(){
        return {
          mechanic: state.mechanic, category: state.category,
          values: state.values, modes: state.modes,
          checked: state.checked, extra: state.extra
        };
      }

      function restore(data){
        if (!data || typeof data !== 'object') return false;
        if (data.mechanic && MECHANICS.some(m => m.id === data.mechanic)) state.mechanic = data.mechanic;
        if (typeof data.category === 'string') state.category = data.category;
        if (data.values && typeof data.values === 'object') state.values = data.values;
        if (data.modes && typeof data.modes === 'object') state.modes = data.modes;
        if (data.checked) {
          state.checked.feedback = Array.isArray(data.checked.feedback) ? data.checked.feedback : [];
          state.checked.engagement = Array.isArray(data.checked.engagement) ? data.checked.engagement : [];
        }
        if (typeof data.extra === 'string') state.extra = data.extra;
        return true;
      }

      function save(){
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot())); } catch (e) {}
      }

      function loadSaved(){
        // приоритет у ссылки-сборки
        const hash = location.hash || '';
        if (hash.indexOf('#c=') === 0) {
          try { if (restore(JSON.parse(decodeURIComponent(hash.slice(3))))) return 'link'; } catch (e) {}
        }
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw && restore(JSON.parse(raw))) return 'storage';
        } catch (e) {}
        return null;
      }

      /* ---------- рендер полей: выбор ИЛИ свой вариант ---------- */

      function controlHtml(path, field){
        const id = domId(path);
        const value = getVal(path, field);

        if (field.t === 'num') {
          const min = field.min != null ? field.min : 1;
          const max = field.max != null ? field.max : 999;
          return `<input id="${id}" type="number" inputmode="numeric" min="${min}" max="${max}"
            data-path="${esc(path)}" value="${esc(value)}" />`;
        }

        if (field.t === 'sel') {
          const custom = isCustom(path);
          let list = field.o || [];
          let head = '';
          if (field.filter) {
            const q = norm(state.styleFilter);
            const shown = q ? list.filter(o => norm(o).includes(q) || norm(STYLE_RECIPES[o] || '').includes(q)) : list;
            if (!shown.includes(value) && !custom && value) shown.unshift(value);
            head = `<input class="iy-search iy-style-filter" type="search" data-style-filter
                value="${esc(state.styleFilter)}" placeholder="Фильтр по названию или описанию" aria-label="Фильтр стилей" />
              <span class="iy-style-count">Показано ${shown.length} из ${list.length}</span>`;
            list = shown;
          }
          const opts = list.map(o =>
            `<option value="${esc(o)}"${!custom && o === value ? ' selected' : ''}>${esc(o)}</option>`
          ).join('');
          return `${head}
            <select id="${id}" data-path="${esc(path)}" data-role="select">
              ${opts}
              <option value="${CUSTOM}"${custom ? ' selected' : ''}>${CUSTOM_LABEL}</option>
            </select>
            <div class="iy-custom${custom ? ' is-on' : ''}" data-custom-for="${esc(path)}">
              <span class="iy-own-tag">Ваш вариант — напишите своими словами</span>
              <input type="text" data-path="${esc(path)}" data-role="custom"
                value="${custom ? esc(value) : ''}" placeholder="Впишите свой вариант" />
            </div>`;
        }

        // текстовое поле с примерами
        const listId = (field.ex && field.ex.length) ? id + '_dl' : '';
        const dl = listId
          ? `<datalist id="${listId}">${field.ex.map(e => `<option value="${esc(e)}"></option>`).join('')}</datalist>`
          : '';
        return `<input id="${id}" type="text" data-path="${esc(path)}" value="${esc(value)}"
          ${listId ? `list="${listId}"` : ''} placeholder="${esc(field.ph || 'Впишите свой вариант')}" />${dl}`;
      }

      function fieldHtml(path, field){
        // подсказку показываем только у текстовых полей: у списков пункт
        // «✍️ Свой вариант» и так виден, когда список раскрыт
        const note = (field.t === 'txt' && field.ex && field.ex.length)
          ? '<div class="iy-combo-note">▾ нажмите, чтобы увидеть примеры — или впишите своё</div>'
          : '';
        return `<div class="iy-field">
          <label for="${domId(path)}">${esc(field.l)}</label>
          ${controlHtml(path, field)}
          ${note}
        </div>`;
      }

      const fieldsHtml = (prefix, fields) => (fields || []).map(f => fieldHtml(prefix + ':' + f.k, f)).join('');

      /* ---------- рендер разделов ---------- */

      function renderCategories(){
        const cats = ['Все', ...Array.from(new Set(MECHANICS.map(m => m.cat)))];
        el.categories.innerHTML = cats.map(c => {
          const n = c === 'Все' ? MECHANICS.length : MECHANICS.filter(m => m.cat === c).length;
          return `<button class="iy-chip${c === state.category ? ' is-active' : ''}" type="button"
            data-cat="${esc(c)}" aria-pressed="${c === state.category}">${esc(c)}<span class="iy-chip-count">${n}</span></button>`;
        }).join('');
      }

      function renderMechanics(keepFocus){
        const q = norm(state.search);
        const list = MECHANICS.filter(m => {
          const byCat = state.category === 'Все' || m.cat === state.category;
          const byQ = !q || norm(`${m.title} ${m.short} ${m.what} ${m.cat}`).includes(q);
          return byCat && byQ;
        });

        el.mechanics.innerHTML = list.length ? list.map(m => {
          const sel = m.id === state.mechanic;
          return `<div class="iy-card${sel ? ' is-selected' : ''}" data-mechanic="${m.id}"
            role="radio" aria-checked="${sel}" tabindex="${sel ? 0 : -1}">
            <div class="iy-card-top">
              <span class="iy-card-number">${m.num}</span>
              <span class="iy-card-tick" aria-hidden="true">✓</span>
            </div>
            <h3>${esc(m.title)}</h3>
            <p>${esc(m.short)}</p>
            <span class="iy-meta">${esc(m.cat)}</span>
          </div>`;
        }).join('') : `<div class="iy-empty">Ничего не найдено. Попробуйте другое слово или снимите фильтр категории.</div>`;

        if (!list.some(m => m.id === state.mechanic) && list.length) {
          const first = el.mechanics.querySelector('[data-mechanic]');
          if (first) first.setAttribute('tabindex', '0');
        }
        if (keepFocus) {
          const sel = el.mechanics.querySelector('.iy-card.is-selected') || el.mechanics.querySelector('[data-mechanic]');
          if (sel) sel.focus();
        }
        el.mechHelp.textContent = `Всего механик: ${MECHANICS.length}. Показано: ${list.length}. Выбрать можно одну — параметры и блоки ниже подстроятся под неё.`;
      }

      function renderSummary(){
        const m = mechanic();
        const fb = state.checked.feedback.length;
        const eng = state.checked.engagement.length;
        el.summary.innerHTML = `Выбрана механика <b>№${m.num} — ${esc(m.title)}</b>
          <span>· обратная связь: <b>${fb}</b> · вовлечение: <b>${eng}</b></span>`;
        el.stickyMech.textContent = `№${m.num} — ${m.title}`;
        el.stickyMeta.textContent = `Обратная связь: ${fb} · вовлечение: ${eng}`;
      }

      function renderBasic(){
        el.basic.innerHTML = fieldsHtml('basic', COMMON_FIELDS);
        const m = mechanic();
        el.mechFieldsTitle.textContent = `Параметры механики «${m.title}»`;
        el.mechFields.innerHTML = fieldsHtml('mech:' + m.id, m.f);
      }

      function renderVisual(){
        el.visual.innerHTML = fieldsHtml('visual', VISUAL_FIELDS);
      }

      function optionHtml(item, scope){
        const on = state.checked[scope].includes(item.id);
        const cid = `chk_${scope}_${item.id}`;
        return `<div class="iy-option${on ? ' is-open' : ''}" data-option="${esc(item.id)}">
          <label class="iy-option-head" for="${cid}">
            <input type="checkbox" id="${cid}" data-check="${esc(item.id)}" data-scope="${scope}"${on ? ' checked' : ''} />
            <span>
              <span class="iy-option-title">${esc(item.title)}</span>
              <span class="iy-option-desc">${esc(item.short)}</span>
            </span>
          </label>
          <div class="iy-option-fields">${fieldsHtml(scope + ':' + item.id, item.f)}</div>
        </div>`;
      }

      function renderOptions(){
        const fb = availableFeedback();
        const eng = availableEngagement();
        state.checked.feedback = state.checked.feedback.filter(id => fb.some(i => i.id === id));
        state.checked.engagement = state.checked.engagement.filter(id => eng.some(i => i.id === id));
        el.feedback.innerHTML = fb.length ? fb.map(i => optionHtml(i, 'feedback')).join('')
          : '<div class="iy-empty">Для этой механики отдельные блоки обратной связи не нужны — реакция уже заложена в саму механику.</div>';
        el.engagement.innerHTML = eng.length ? eng.map(i => optionHtml(i, 'engagement')).join('')
          : '<div class="iy-empty">Для этой механики блоки вовлечения не обязательны.</div>';
      }

      function renderPresets(){
        el.presets.innerHTML = PRESETS.map(p =>
          `<button class="iy-preset" type="button" data-preset="${esc(p.id)}" title="${esc(p.hint)}">${esc(p.title)}</button>`
        ).join('');
        el.extraPresets.innerHTML = EXTRA_PRESETS.map((p, i) =>
          `<button class="iy-preset" type="button" data-extra="${i}">+ ${esc(p.t)}</button>`
        ).join('');
      }

      function renderForm(){
        renderSummary();
        renderBasic();
        renderVisual();
        renderOptions();
        el.extra.value = state.extra;
        update();
      }

      function renderAll(){
        renderCategories();
        renderMechanics(false);
        renderPresets();
        renderForm();
      }
