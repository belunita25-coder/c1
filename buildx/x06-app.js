
      /* ==========================================================
         ПРИЛОЖЕНИЕ
         ========================================================== */

      MECHANICS.forEach(m => { m.ps = STAGE_PROMPTS[m.id] || m.p; });

      const ALL_BLOCKS = [...FEEDBACK, ...ENGAGEMENT].filter(b => !BLOCK_SKIP.includes(b.id));
      const GAME_BLOCKS = ALL_BLOCKS.filter(b => BLOCK_SCOPE[b.id] === 'game');
      const STAGE_BLOCKS = ALL_BLOCKS.filter(b => BLOCK_SCOPE[b.id] === 'stage');

      const CUSTOM = '__custom__';
      const CUSTOM_LABEL = '✍️ Свой вариант';
      const STORAGE_KEY = 'iy-complex-constructor-v2';

      const root = document.getElementById('complex-prompt-constructor-iy');
      const $ = (id) => root.querySelector('#' + id);

      const el = {
        basic: $('iy-basic-fields'), visual: $('iy-visual-fields'),
        mechanics: $('iy-mechanics'), categories: $('iy-categories'), search: $('iy-search'),
        count: $('iy-selected-count'), mechStatus: $('iy-mech-status'),
        summary: $('iy-summary'), stages: $('iy-stages'),
        presets: $('iy-presets'), gameBlocks: $('iy-game-blocks'),
        extraPresets: $('iy-extra-presets'), extra: $('iy-extra'),
        warnings: $('iy-warnings'), output: $('iy-output'), size: $('iy-size'), status: $('iy-status'),
        generate: $('iy-generate'), copy: $('iy-copy'), clearOutput: $('iy-clear-output'),
        download: $('iy-download'), share: $('iy-share'), clear: $('iy-clear'),
        stickyMech: $('iy-sticky-mech'), stickyMeta: $('iy-sticky-meta'),
        stickyCopy: $('iy-sticky-copy'), stickyTop: $('iy-sticky-top')
      };

      /* Каждый этап получает собственный uid. Значения полей хранятся по пути,
         в который входит uid, а не позиция — поэтому перестановка этапов ничего
         не теряет, а одну механику можно поставить на несколько этапов. */
      const state = {
        stages: [],           // [{uid, m}]
        nextUid: 1,
        category: 'Все',
        search: '',
        styleFilter: '',
        values: {},           // путь -> строка
        modes: {},            // путь -> 'custom'
        gameChecked: [],      // id блоков уровня игры
        stageChecked: {},     // uid -> [id блоков этапа]
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

      const mechById = (id) => MECHANICS.find(m => m.id === id);
      const stageBlocksFor = (mechanicId) => STAGE_BLOCKS.filter(b => fits(b, mechanicId));

      function getVal(path, field){
        if (Object.prototype.hasOwnProperty.call(state.values, path)) return state.values[path];
        return field && field.v != null ? field.v : '';
      }
      const isCustom = (path) => state.modes[path] === 'custom';

      function stageCount(){
        const n = parseInt(getVal('basic:stageCount', COMMON_FIELDS[0]), 10);
        if (!Number.isFinite(n)) return 3;
        return Math.min(8, Math.max(2, n));
      }

      /* ---------- сохранение и ссылка ---------- */

      function snapshot(){
        return {
          stages: state.stages, nextUid: state.nextUid, category: state.category,
          values: state.values, modes: state.modes,
          gameChecked: state.gameChecked, stageChecked: state.stageChecked, extra: state.extra
        };
      }

      function restore(d){
        if (!d || typeof d !== 'object') return false;
        if (Array.isArray(d.stages)) state.stages = d.stages.filter(s => s && mechById(s.m));
        if (Number.isFinite(d.nextUid)) state.nextUid = d.nextUid;
        if (typeof d.category === 'string') state.category = d.category;
        if (d.values && typeof d.values === 'object') state.values = d.values;
        if (d.modes && typeof d.modes === 'object') state.modes = d.modes;
        if (Array.isArray(d.gameChecked)) state.gameChecked = d.gameChecked;
        if (d.stageChecked && typeof d.stageChecked === 'object') state.stageChecked = d.stageChecked;
        if (typeof d.extra === 'string') state.extra = d.extra;
        state.nextUid = Math.max(state.nextUid, ...state.stages.map(s => (s.uid || 0) + 1), 1);
        return true;
      }

      const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot())); } catch (e) {} };

      function loadSaved(){
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

      /* ---------- поля: выбор ИЛИ свой вариант ---------- */

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
          let opts = field.o || [];
          let note = '';
          if (field.filter) {
            const q = norm(state.styleFilter);
            const shown = q ? opts.filter(o => norm(o).includes(q) || norm(STYLE_RECIPES[o] || '').includes(q)) : opts;
            if (!shown.includes(value) && !custom && value) shown.unshift(value);
            note = `<input class="iy-search iy-style-filter" type="search" data-style-filter
                value="${esc(state.styleFilter)}" placeholder="Фильтр по названию или описанию" aria-label="Фильтр стилей" />
              <span class="iy-style-count">Показано ${shown.length} из ${opts.length}</span>`;
            opts = shown;
          }
          const list = opts.map(o =>
            `<option value="${esc(o)}"${!custom && o === value ? ' selected' : ''}>${esc(o)}</option>`
          ).join('');
          return `${note}
            <select id="${id}" data-path="${esc(path)}" data-role="select">
              ${list}
              <option value="${CUSTOM}"${custom ? ' selected' : ''}>${CUSTOM_LABEL}</option>
            </select>
            <div class="iy-custom${custom ? ' is-on' : ''}" data-custom-for="${esc(path)}">
              <span class="iy-own-tag">Ваш вариант — напишите своими словами</span>
              <input type="text" data-path="${esc(path)}" data-role="custom"
                value="${custom ? esc(value) : ''}" placeholder="Впишите свой вариант" />
            </div>`;
        }

        const listId = (field.ex && field.ex.length) ? id + '_dl' : '';
        const dl = listId
          ? `<datalist id="${listId}">${field.ex.map(e => `<option value="${esc(e)}"></option>`).join('')}</datalist>`
          : '';
        return `<input id="${id}" type="text" data-path="${esc(path)}" value="${esc(value)}"
          ${listId ? `list="${listId}"` : ''} placeholder="${esc(field.ph || 'Впишите свой вариант')}" />${dl}`;
      }

      function fieldHtml(path, field){
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

      /* ---------- блоки ---------- */

      function blockHtml(item, path, checked, checkAttr){
        return `<div class="iy-option${checked ? ' is-open' : ''}" data-option-box>
          <label class="iy-option-head" for="${domId(path)}_chk">
            <input type="checkbox" id="${domId(path)}_chk" ${checkAttr}${checked ? ' checked' : ''} />
            <span>
              <span class="iy-option-title">${esc(item.title)}</span>
              <span class="iy-option-desc">${esc(item.short)}</span>
            </span>
          </label>
          <div class="iy-option-fields">${fieldsHtml(path, item.f)}</div>
        </div>`;
      }

      function renderGameBlocks(){
        el.gameBlocks.innerHTML = GAME_BLOCKS.map(item =>
          blockHtml(item, 'game:' + item.id, state.gameChecked.includes(item.id),
            `data-game-check="${esc(item.id)}"`)
        ).join('');
      }

      /* ---------- механики ---------- */

      function renderCategories(){
        const cats = ['Все', ...Array.from(new Set(MECHANICS.map(m => m.cat)))];
        el.categories.innerHTML = cats.map(c => {
          const n = c === 'Все' ? MECHANICS.length : MECHANICS.filter(m => m.cat === c).length;
          return `<button class="iy-chip${c === state.category ? ' is-active' : ''}" type="button"
            data-cat="${esc(c)}" aria-pressed="${c === state.category}">${esc(c)}<span class="iy-chip-count"> ${n}</span></button>`;
        }).join('');
      }

      function renderMechanics(){
        const q = norm(state.search);
        const max = stageCount();
        const used = state.stages.length;
        el.count.textContent = `Выбрано этапов: ${used} из ${max}`;

        const list = MECHANICS.filter(m => {
          const byCat = state.category === 'Все' || m.cat === state.category;
          const byQ = !q || norm(`${m.title} ${m.short} ${m.what} ${m.cat}`).includes(q);
          return byCat && byQ;
        });

        el.mechanics.innerHTML = list.length ? list.map(m => {
          const positions = state.stages.map((s, i) => s.m === m.id ? i + 1 : 0).filter(Boolean);
          const full = used >= max;
          return `<button class="iy-card${positions.length ? ' is-selected' : ''}" type="button"
            data-mechanic="${esc(m.id)}"${full ? ' disabled aria-disabled="true"' : ''}
            aria-pressed="${positions.length ? 'true' : 'false'}">
            <span class="iy-card-top">
              <span class="iy-card-number">${m.num}</span>
              ${positions.length ? `<span class="iy-selected-number">${positions.join(', ')}</span>` : ''}
            </span>
            <h3>${esc(m.title)}</h3>
            <p>${esc(m.short)}</p>
            <span class="iy-meta">${esc(m.cat)}</span>
          </button>`;
        }).join('') : '<div class="iy-empty">Ничего не найдено. Попробуйте другое слово или снимите фильтр категории.</div>';
      }

      /* ---------- этапы ---------- */

      function renderStages(){
        if (!state.stages.length) {
          el.stages.innerHTML = '<div class="iy-empty">Выберите механики выше — здесь появятся настройки каждого этапа.</div>';
          return;
        }

        el.stages.innerHTML = state.stages.map((stage, index) => {
          const mech = mechById(stage.m);
          const base = 'st:' + stage.uid;
          const blocks = stageBlocksFor(mech.id);
          const checked = state.stageChecked[stage.uid] || [];
          const blocksHtml = blocks.length
            ? blocks.map(b => blockHtml(b, base + ':blk:' + b.id, checked.includes(b.id),
                `data-stage-check="${esc(b.id)}" data-uid="${stage.uid}"`)).join('')
            : '<div class="iy-empty">У этой механики реакция на действия уже заложена внутри. Общие правила игры задаются в шаге 4.</div>';

          return `<article class="iy-stage" data-stage-uid="${stage.uid}">
            <div class="iy-stage-head">
              <div class="iy-stage-title">
                <span class="iy-stage-index">${index + 1}</span>
                <div>
                  <h3>Этап ${index + 1}. ${esc(mech.title)}</h3>
                  <p>${esc(mech.short)}</p>
                </div>
              </div>
              <div class="iy-stage-actions">
                <button class="iy-mini-btn" type="button" data-move="up" data-uid="${stage.uid}"${index === 0 ? ' disabled' : ''}>↑ Выше</button>
                <button class="iy-mini-btn" type="button" data-move="down" data-uid="${stage.uid}"${index === state.stages.length - 1 ? ' disabled' : ''}>↓ Ниже</button>
                <button class="iy-mini-btn" type="button" data-copy-prev data-uid="${stage.uid}"${index === 0 ? ' disabled' : ''}>Скопировать с предыдущего</button>
                <button class="iy-mini-btn" type="button" data-apply-all data-uid="${stage.uid}">Применить ко всем</button>
                <button class="iy-mini-btn" type="button" data-remove data-uid="${stage.uid}">Удалить</button>
              </div>
            </div>
            <div class="iy-stage-body">
              <div class="iy-subblock">
                <p class="iy-subtitle">Параметры механики</p>
                <div class="iy-form-grid">${fieldsHtml(base + ':mech', mech.f)}</div>
              </div>
              <div class="iy-subblock">
                <p class="iy-subtitle">Реакция на действия ученика на этом этапе</p>
                <p class="iy-stage-note">Баллы, жизни, награды, сюжет и финал общие для всей игры — они в шаге 4.</p>
                <div class="iy-options">${blocksHtml}</div>
              </div>
            </div>
          </article>`;
        }).join('');
      }

      function renderSummary(){
        const max = stageCount();
        const names = state.stages.map((s, i) => `${i + 1}. ${mechById(s.m).title}`).join(' → ');
        el.summary.innerHTML = state.stages.length
          ? `Этапов: <b>${state.stages.length} из ${max}</b> · правил для всей игры: <b>${state.gameChecked.length}</b><br>${esc(names)}`
          : `Этапов пока нет. Нужно выбрать <b>${max}</b>.`;
        el.stickyMech.textContent = state.stages.length
          ? `${state.stages.length} из ${max} этапов: ${state.stages.map(s => mechById(s.m).title).join(' → ')}`
          : 'Этапы не выбраны';
        el.stickyMeta.textContent = `Правил для всей игры: ${state.gameChecked.length}`;
      }

      function renderPresets(){
        el.presets.innerHTML = PRESETS.map(p =>
          `<button class="iy-preset" type="button" data-preset="${esc(p.id)}" title="${esc(p.hint)}">${esc(p.title)}</button>`
        ).join('');
        el.extraPresets.innerHTML = EXTRA_PRESETS.map((p, i) =>
          `<button class="iy-preset" type="button" data-extra="${i}">+ ${esc(p.t)}</button>`
        ).join('');
      }

      function renderAll(){
        el.basic.innerHTML = fieldsHtml('basic', COMMON_FIELDS);
        el.visual.innerHTML = fieldsHtml('visual', VISUAL_FIELDS);
        renderCategories();
        renderMechanics();
        renderGameBlocks();
        renderStages();
        renderPresets();
        el.extra.value = state.extra;
        update();
      }

      function inlineStatus(msg, isError){
        el.mechStatus.textContent = msg || '';
        el.mechStatus.className = 'iy-inline-status' + (msg ? ' is-on' : '') + (isError ? ' is-error' : '');
        clearTimeout(inlineStatus._t);
        if (msg) inlineStatus._t = setTimeout(() => {
          el.mechStatus.textContent = ''; el.mechStatus.className = 'iy-inline-status';
        }, 5000);
      }
