
      /* ---------- события ---------- */

      function selectMechanic(id, focus){
        if (!id || id === state.mechanic) return;
        state.mechanic = id;
        renderMechanics(focus);
        renderForm();
        flash('Механика выбрана. Параметры ниже обновлены.');
      }

      el.categories.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-cat]');
        if (!btn) return;
        state.category = btn.dataset.cat;
        renderCategories();
        renderMechanics(false);
        save();
      });

      el.mechanics.addEventListener('click', (e) => {
        const card = e.target.closest('[data-mechanic]');
        if (card) selectMechanic(card.dataset.mechanic, false);
      });

      el.mechanics.addEventListener('keydown', (e) => {
        const card = e.target.closest('[data-mechanic]');
        if (!card) return;
        const cards = Array.from(el.mechanics.querySelectorAll('[data-mechanic]'));
        const i = cards.indexOf(card);
        let next = -1;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectMechanic(card.dataset.mechanic, true); return; }
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = i + 1;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = i - 1;
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = cards.length - 1;
        if (next < 0 || next >= cards.length) return;
        e.preventDefault();
        selectMechanic(cards[next].dataset.mechanic, true);
      });

      el.search.addEventListener('input', () => {
        state.search = el.search.value;
        renderMechanics(false);
      });

      el.search.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { el.search.value = ''; state.search = ''; renderMechanics(false); }
      });

      // все поля «выбор + своё»
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

        if (t.dataset && t.dataset.check) {
          const scope = t.dataset.scope;
          const id = t.dataset.check;
          const list = state.checked[scope];
          const pos = list.indexOf(id);
          if (t.checked && pos === -1) list.push(id);
          if (!t.checked && pos !== -1) list.splice(pos, 1);
          const wrap = t.closest('.iy-option');
          if (wrap) wrap.classList.toggle('is-open', t.checked);
          update();
        }
      });

      el.extra.addEventListener('input', () => { state.extra = el.extra.value; update(); });

      el.presets.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-preset]');
        if (!btn) return;
        const preset = PRESETS.find(p => p.id === btn.dataset.preset);
        if (!preset) return;
        const fbIds = availableFeedback().map(i => i.id);
        const engIds = availableEngagement().map(i => i.id);
        state.checked.feedback = preset.fb === 'all' ? fbIds.slice() : preset.fb.filter(id => fbIds.includes(id));
        state.checked.engagement = preset.eng === 'all' ? engIds.slice() : preset.eng.filter(id => engIds.includes(id));
        renderOptions();
        update();
        flash(`Набор «${preset.title}» применён: обратная связь ${state.checked.feedback.length}, вовлечение ${state.checked.engagement.length}.`);
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

      /* ---------- копирование, скачивание, ссылка ---------- */

      el.generate.addEventListener('click', () => {
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
        // если поле очистили, но просят скопировать — собираем заново
        if (!el.output.value) generateNow();
        const text = el.output.value;
        if (!text) { flash('Промпт пуст.', true); return; }
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
        } else {
          legacy();
        }
      }

      el.copy.addEventListener('click', copyPrompt);
      el.stickyCopy.addEventListener('click', copyPrompt);

      el.stickyTop.addEventListener('click', () => {
        const s = root.querySelector('#iy-step-1');
        if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      el.download.addEventListener('click', () => {
        const m = mechanic();
        const name = `promt-${m.num}-${m.title.replace(/[^а-яa-z0-9]+/gi, '-').toLowerCase().slice(0, 40)}.txt`;
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
        const done = () => flash('Ссылка на сборку скопирована. Откройте её — все настройки восстановятся.');
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(url).then(done).catch(() => flash('Ссылка в адресной строке — скопируйте её оттуда.'));
        } else {
          flash('Ссылка в адресной строке — скопируйте её оттуда.');
        }
      });

      let clearArmed = false;
      el.clear.addEventListener('click', () => {
        if (!clearArmed) {
          clearArmed = true;
          el.clear.textContent = 'Точно очистить?';
          flash('Нажмите ещё раз, чтобы сбросить все настройки.', true);
          setTimeout(() => { clearArmed = false; el.clear.textContent = 'Очистить всё'; }, 5000);
          return;
        }
        clearArmed = false;
        el.clear.textContent = 'Очистить всё';
        state.mechanic = MECHANICS[0].id;
        state.category = 'Все';
        state.search = '';
        state.styleFilter = '';
        state.values = {};
        state.modes = {};
        state.checked = { feedback: [], engagement: [] };
        state.extra = '';
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
