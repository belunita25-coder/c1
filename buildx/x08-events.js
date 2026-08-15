
      /* ---------- работа с этапами ---------- */

      function addStage(mechanicId){
        if (state.stages.length >= stageCount()) {
          inlineStatus(`Уже выбрано ${stageCount()} этапов. Удалите один в шаге 3 или увеличьте количество этапов в шаге 1.`, true);
          return;
        }
        state.stages.push({ uid: state.nextUid++, m: mechanicId });
        renderMechanics();
        renderStages();
        update();
        inlineStatus(`Добавлен этап ${state.stages.length}: ${mechById(mechanicId).title}. Настройки — в шаге 3.`);
      }

      function removeStage(uid){
        const i = state.stages.findIndex(s => s.uid === uid);
        if (i === -1) return;
        state.stages.splice(i, 1);
        delete state.stageChecked[uid];
        Object.keys(state.values).forEach(k => { if (k.indexOf('st:' + uid + ':') === 0) delete state.values[k]; });
        Object.keys(state.modes).forEach(k => { if (k.indexOf('st:' + uid + ':') === 0) delete state.modes[k]; });
        renderMechanics();
        renderStages();
        update();
      }

      function moveStage(uid, dir){
        const i = state.stages.findIndex(s => s.uid === uid);
        const j = dir === 'up' ? i - 1 : i + 1;
        if (i === -1 || j < 0 || j >= state.stages.length) return;
        const t = state.stages[i];
        state.stages[i] = state.stages[j];
        state.stages[j] = t;
        renderMechanics();
        renderStages();
        update();
        // возвращаем фокус на ту же кнопку у переехавшего этапа
        const btn = root.querySelector(`[data-stage-uid="${uid}"] [data-move="${dir}"]`);
        if (btn && !btn.disabled) btn.focus();
      }

      // Переносит выбранные блоки и их настройки с одного этапа на другой.
      // Параметры механики копируются только если механика та же.
      function copyStageSettings(fromUid, toUid){
        const from = state.stages.find(s => s.uid === fromUid);
        const to = state.stages.find(s => s.uid === toUid);
        if (!from || !to) return 0;
        let n = 0;

        if (from.m === to.m) {
          (mechById(from.m).f || []).forEach(f => {
            const a = 'st:' + fromUid + ':mech:' + f.k;
            const b = 'st:' + toUid + ':mech:' + f.k;
            if (Object.prototype.hasOwnProperty.call(state.values, a)) { state.values[b] = state.values[a]; n++; }
            if (state.modes[a]) state.modes[b] = state.modes[a]; else delete state.modes[b];
          });
        }

        const allowed = stageBlocksFor(to.m).map(b => b.id);
        const picked = (state.stageChecked[fromUid] || []).filter(id => allowed.includes(id));
        state.stageChecked[toUid] = picked.slice();
        n += picked.length;

        picked.forEach(id => {
          const block = ALL_BLOCKS.find(b => b.id === id);
          (block.f || []).forEach(f => {
            const a = 'st:' + fromUid + ':blk:' + id + ':' + f.k;
            const b = 'st:' + toUid + ':blk:' + id + ':' + f.k;
            if (Object.prototype.hasOwnProperty.call(state.values, a)) state.values[b] = state.values[a];
            if (state.modes[a]) state.modes[b] = state.modes[a]; else delete state.modes[b];
          });
        });
        return n;
      }

      /* ---------- события ---------- */

      el.categories.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-cat]');
        if (!btn) return;
        state.category = btn.dataset.cat;
        renderCategories();
        renderMechanics();
        save();
      });

      el.mechanics.addEventListener('click', (e) => {
        const card = e.target.closest('[data-mechanic]');
        if (card && !card.disabled) addStage(card.dataset.mechanic);
      });

      el.search.addEventListener('input', () => { state.search = el.search.value; renderMechanics(); });
      el.search.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { el.search.value = ''; state.search = ''; renderMechanics(); }
      });

      // фильтр списка стилей
      root.addEventListener('input', (e) => {
        const t = e.target;

        if (t.hasAttribute && t.hasAttribute('data-style-filter')) {
          state.styleFilter = t.value;
          const caret = t.selectionStart;
          el.visual.innerHTML = fieldsHtml('visual', VISUAL_FIELDS);
          const again = root.querySelector('[data-style-filter]');
          if (again) { again.focus(); try { again.setSelectionRange(caret, caret); } catch (err) {} }
          update();
          return;
        }

        if (!t.dataset || !t.dataset.path || t.dataset.role === 'select') return;
        state.values[t.dataset.path] = t.value;
        if (t.dataset.path === 'basic:stageCount') { renderMechanics(); renderStages(); }
        update();
      });

      root.addEventListener('change', (e) => {
        const t = e.target;

        if (t.dataset && t.dataset.role === 'select') {
          const path = t.dataset.path;
          const box = root.querySelector(`[data-custom-for="${CSS.escape(path)}"]`);
          if (t.value === CUSTOM) {
            state.modes[path] = 'custom';
            const input = box ? box.querySelector('input') : null;
            state.values[path] = input && input.value ? input.value : '';
            if (box) box.classList.add('is-on');
            if (input) input.focus();
          } else {
            delete state.modes[path];
            state.values[path] = t.value;
            if (box) box.classList.remove('is-on');
          }
          update();
          return;
        }

        if (t.dataset && t.dataset.gameCheck) {
          const id = t.dataset.gameCheck;
          const pos = state.gameChecked.indexOf(id);
          if (t.checked && pos === -1) state.gameChecked.push(id);
          if (!t.checked && pos !== -1) state.gameChecked.splice(pos, 1);
          const wrap = t.closest('.iy-option');
          if (wrap) wrap.classList.toggle('is-open', t.checked);
          update();
          return;
        }

        if (t.dataset && t.dataset.stageCheck) {
          const uid = Number(t.dataset.uid);
          const id = t.dataset.stageCheck;
          const list = state.stageChecked[uid] || (state.stageChecked[uid] = []);
          const pos = list.indexOf(id);
          if (t.checked && pos === -1) list.push(id);
          if (!t.checked && pos !== -1) list.splice(pos, 1);
          const wrap = t.closest('.iy-option');
          if (wrap) wrap.classList.toggle('is-open', t.checked);
          update();
          return;
        }

        if (t.dataset && t.dataset.path === 'basic:stageCount') {
          renderMechanics(); renderStages(); update();
        }
      });

      // действия этапа
      el.stages.addEventListener('click', (e) => {
        const uidOf = (b) => Number(b.dataset.uid);

        const move = e.target.closest('[data-move]');
        if (move) { moveStage(uidOf(move), move.dataset.move); return; }

        const rm = e.target.closest('[data-remove]');
        if (rm) { removeStage(uidOf(rm)); return; }

        const prev = e.target.closest('[data-copy-prev]');
        if (prev) {
          const uid = uidOf(prev);
          const i = state.stages.findIndex(s => s.uid === uid);
          if (i > 0) {
            const n = copyStageSettings(state.stages[i - 1].uid, uid);
            renderStages(); update();
            flash(n ? `Настройки скопированы с этапа ${i}.` : 'С предыдущего этапа копировать нечего.', !n);
          }
          return;
        }

        const all = e.target.closest('[data-apply-all]');
        if (all) {
          const uid = uidOf(all);
          let n = 0;
          state.stages.forEach(s => { if (s.uid !== uid) n += copyStageSettings(uid, s.uid); });
          renderStages(); update();
          flash(n ? 'Настройки применены ко всем остальным этапам.' : 'Применять нечего — блоки не выбраны.', !n);
        }
      });

      el.extra.addEventListener('input', () => { state.extra = el.extra.value; update(); });

      el.presets.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-preset]');
        if (!btn) return;
        const preset = PRESETS.find(p => p.id === btn.dataset.preset);
        if (!preset) return;
        const ids = GAME_BLOCKS.map(b => b.id);
        state.gameChecked = preset.g === 'all' ? ids.slice() : preset.g.filter(id => ids.includes(id));
        renderGameBlocks();
        update();
        flash(`Набор «${preset.title}» применён: правил для всей игры — ${state.gameChecked.length}.`);
      });

      el.extraPresets.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-extra]');
        if (!btn) return;
        const tpl = EXTRA_PRESETS[Number(btn.dataset.extra)];
        if (!tpl) return;
        state.extra = (state.extra.trim() ? state.extra.trim() + '\n\n' : '') + tpl.v;
        el.extra.value = state.extra;
        el.extra.focus();
        el.extra.setSelectionRange(el.extra.value.length, el.extra.value.length);
        update();
      });

      /* ---------- кнопки промпта ---------- */

      el.generate.addEventListener('click', () => {
        if (!state.stages.length) { flash('Сначала выберите механики для этапов.', true); return; }
        generateNow();
        flash('Промпт создан.');
        el.output.scrollTop = 0;
      });

      el.clearOutput.addEventListener('click', () => {
        if (!el.output.value) { flash('Поле промпта уже пустое.', true); return; }
        clearOutput();
        flash('Промпт очищен. Настройки сохранены — нажмите «Создать промпт».');
      });

      function copyPrompt(){
        if (!el.output.value && state.stages.length) generateNow();
        const text = el.output.value;
        if (!text) { flash('Промпт пуст: выберите механики для этапов.', true); return; }
        const legacy = () => {
          try {
            el.output.removeAttribute('readonly');
            el.output.select();
            el.output.setSelectionRange(0, text.length);
            const ok = document.execCommand('copy');
            el.output.setAttribute('readonly', '');
            window.getSelection().removeAllRanges();
            flash(ok ? 'Промпт скопирован.' : 'Скопировать не удалось — выделите текст и нажмите Ctrl+C.', !ok);
          } catch (err) {
            flash('Скопировать не удалось — выделите текст и нажмите Ctrl+C.', true);
          }
        };
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(() => flash('Промпт скопирован.')).catch(legacy);
        } else { legacy(); }
      }

      el.copy.addEventListener('click', copyPrompt);
      el.stickyCopy.addEventListener('click', copyPrompt);

      el.stickyTop.addEventListener('click', () => {
        const s = root.querySelector('#iy-step-2');
        if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      el.download.addEventListener('click', () => {
        if (!el.output.value) { flash('Сначала создайте промпт.', true); return; }
        const name = `promt-slozhnaya-igra-${state.stages.length}-etapov.txt`;
        const blob = new Blob([el.output.value], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        flash('Файл сохранён.');
      });

      el.share.addEventListener('click', () => {
        const hash = '#c=' + encodeURIComponent(JSON.stringify(snapshot()));
        const url = location.origin + location.pathname + location.search + hash;
        history.replaceState(null, '', hash);
        const done = () => flash('Ссылка на сборку скопирована. Откройте её — все этапы и настройки восстановятся.');
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(url).then(done).catch(() => flash('Ссылка в адресной строке — скопируйте её оттуда.'));
        } else { flash('Ссылка в адресной строке — скопируйте её оттуда.'); }
      });

      let clearArmed = false;
      el.clear.addEventListener('click', () => {
        if (!clearArmed) {
          clearArmed = true;
          el.clear.textContent = 'Точно очистить?';
          flash('Нажмите ещё раз, чтобы сбросить все этапы и настройки.', true);
          setTimeout(() => { clearArmed = false; el.clear.textContent = 'Очистить всё'; }, 5000);
          return;
        }
        clearArmed = false;
        el.clear.textContent = 'Очистить всё';
        state.stages = [];
        state.nextUid = 1;
        state.category = 'Все';
        state.search = '';
        state.styleFilter = '';
        state.values = {};
        state.modes = {};
        state.gameChecked = [];
        state.stageChecked = {};
        state.extra = '';
        outputCleared = false;
        el.search.value = '';
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
        history.replaceState(null, '', location.pathname + location.search);
        renderAll();
        flash('Все настройки сброшены.');
        const s = root.querySelector('#iy-step-1');
        if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      /* ---------- старт ---------- */

      const source = loadSaved();
      renderAll();
      if (source === 'link') flash('Сборка восстановлена из ссылки.');
      else if (source === 'storage') flash('Восстановлены ваши прошлые настройки.');
    })();
  </script>
</body>
</html>
