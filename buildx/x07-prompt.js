
      /* ---------- сборка промпта ---------- */

      function valuesFor(prefix, fields){
        const out = {};
        (fields || []).forEach(f => { out[f.k] = String(getVal(prefix + ':' + f.k, f) || '').trim(); });
        return out;
      }

      // Предложение, все плейсхолдеры которого пусты, выбрасывается целиком,
      // чтобы в промпт не попадали обрубки вида «Персонаж: .»
      function keepSentence(part, values){
        const keys = [];
        part.replace(/\{([^}]+)\}/g, (_, k) => { keys.push(k); return ''; });
        if (!keys.length) return true;
        return keys.some(k => String(values[k] == null ? '' : values[k]).trim() !== '');
      }

      function fill(template, values){
        const lines = String(template || '').split('\n').map(line => {
          const parts = line.match(/[^.]+\.?/g);
          if (!parts) return line;
          return parts.filter(p => keepSentence(p, values)).join('').replace(/\s{2,}/g, ' ').trim();
        }).filter(line => line !== '');
        return lines.join('\n').replace(/\{([^}]+)\}/g, (_, k) =>
          Object.prototype.hasOwnProperty.call(values, k) ? values[k] : ''
        );
      }

      const blockText = (item, prefix) => fill(item.p, valuesFor(prefix, item.f));

      function buildPrompt(){
        const base = valuesFor('basic', COMMON_FIELDS);
        const vis = valuesFor('visual', VISUAL_FIELDS);
        const extra = state.extra.trim();
        const n = state.stages.length;
        const L = [];
        const put = (label, value) => { if (value) L.push(`${label}: ${value}.`); };

        L.push(`Ты — разработчик учебных интерактивных игр. Создай ОДНУ интерактивную HTML-игру для урока, состоящую из ${n} последовательных этапов. Каждый этап — своя игровая механика, но это одна игра с общим сюжетом, общим счётом и одним финалом.`);

        L.push('');
        L.push('=== 1. УЧЕБНАЯ ЗАДАЧА ===');
        put('Предмет', base.subject || 'выбери подходящий сам');
        put('Класс или возраст', base.grade || 'выбери сам и укажи в начале ответа');
        put('Тема', base.topic || 'выбери подходящую тему сам');
        put('Зачем игра нужна на уроке', base.goal);
        put('Ожидаемая длительность', base.duration);
        put('Где будут играть', base.device);
        put('Язык всех текстов в игре', base.language);
        L.push('Все этапы должны раскрывать одну и ту же тему с разных сторон, а не быть набором несвязанных заданий. Содержание придумай сам: оно должно соответствовать программе указанного класса и быть фактически верным. Проверь все ответы на правильность.');

        L.push('');
        L.push('=== 2. СТРУКТУРА ИГРЫ ===');
        put('Количество этапов', String(n));
        put('Переход между этапами', base.flow);
        put('Экран между этапами', base.between);
        L.push('ВАЖНО: это одна игра, а не несколько игр подряд. Не создавай отдельный финальный экран, отдельный подсчёт очков и кнопку «Играть снова» после каждого этапа — они должны быть только один раз, в самом конце всей игры.');
        L.push('Счёт, жизни, подсказки и собранные предметы переносятся между этапами и не сбрасываются при переходе.');
        L.push('Вверху игры постоянно видно, на каком этапе ученик находится, например «Этап 2 из ' + n + '».');
        L.push('Чередуй действия ученика так, чтобы игра ощущалась разнообразной: клик, выбор, ввод, поиск, сопоставление, расстановка — в зависимости от выбранных механик.');

        L.push('');
        L.push('=== 3. ЭТАПЫ ===');
        state.stages.forEach((stage, i) => {
          const mech = mechById(stage.m);
          const prefix = 'st:' + stage.uid;
          L.push('');
          L.push(`--- ЭТАП ${i + 1} из ${n}: ${mech.title} ---`);
          L.push(`Суть: ${mech.short}`);
          L.push(`Что происходит: ${mech.what}.`);
          L.push(fill(mech.ps, valuesFor(prefix + ':mech', mech.f)));

          const checked = state.stageChecked[stage.uid] || [];
          const blocks = stageBlocksFor(mech.id).filter(b => checked.includes(b.id));
          if (blocks.length) {
            L.push(`Реакция на действия ученика на этапе ${i + 1}:`);
            blocks.forEach((b, k) => L.push(`${k + 1}. ${b.title}. ${blockText(b, prefix + ':blk:' + b.id)}`));
          } else {
            L.push(`Отдельную реакцию для этапа ${i + 1} не добавляй: хватит минимума, при котором действие ученика даёт понятный видимый результат.`);
          }
        });

        L.push('');
        L.push('=== 4. ПРАВИЛА ДЛЯ ВСЕЙ ИГРЫ ===');
        const game = GAME_BLOCKS.filter(b => state.gameChecked.includes(b.id));
        if (game.length) {
          L.push('Эти правила действуют на всех этапах сразу, а не на каком-то одном.');
          game.forEach((b, i) => L.push(`${i + 1}. ${b.title}. ${blockText(b, 'game:' + b.id)}`));
        } else {
          L.push('Дополнительных общих правил не добавляй. Достаточно общего счёта верных ответов и одного финального экрана в конце игры.');
        }

        L.push('');
        L.push('=== 5. ВИЗУАЛЬНЫЙ СТИЛЬ ===');
        if (vis.style) {
          L.push(`Стиль оформления игры: ${vis.style}.`);
          const recipe = STYLE_RECIPES[vis.style];
          if (recipe) {
            L.push(`Ориентир по этому стилю: ${recipe}.`);
            L.push('Это ориентир, а не жёсткий список — можешь добавить свои детали, но общее впечатление должно совпадать с описанным.');
          } else {
            L.push('Это свой стиль пользователя. Сначала продумай для него полную визуальную систему: 4–6 цветов палитры, характер фона, вид карточек и кнопок, набор декоративных элементов, характер шрифта — и только потом пиши код.');
          }
        } else {
          L.push('Стиль оформления выбери сам под тему урока и возраст учеников и выдержи его во всей игре.');
        }
        put('Настроение', vis.mood);
        put('Насколько сильно адаптировать оформление', vis.visualAdaptation);
        put('Оформление разных этапов', vis.stageLook);
        put('Палитра', vis.paletteMode);
        put('Мои цвета', vis.customPalette);
        put('Фон', vis.backgroundType);
        put('Карточки и кнопки', vis.cardStyle);
        put('Декор', vis.decor);
        put('Иллюстрации', vis.illustration);
        put('Шрифт и настроение текста', vis.fontMood);
        put('Стартовый экран', vis.startScreen);
        put('Цвета конструктора', vis.avoidConstructorColors);

        L.push('ВАЖНО про оформление. Стиль должен быть виден во всех элементах игры, а не только в цвете кнопок: стартовый экран, каждый из этапов, экраны между этапами, карточки заданий, кнопки, подсказки, окно ошибки, индикатор прогресса, финальный экран, фон, рамки, иконки и мелкие декоративные детали.');
        L.push('Все этапы должны выглядеть частями одной игры: единая палитра, одинаковые кнопки и одинаковая типографика. Различать этапы можно фоном и декором, но не сменой всей визуальной системы.');
        L.push('Не копируй палитру конструктора промптов — она нужна только интерфейсу выбора. У самой игры должна быть собственная CSS-палитра.');
        L.push('В CSS создай отдельные переменные оформления игры и задай их под выбранный стиль: --game-bg, --game-card, --game-primary, --game-accent, --game-text, --game-success, --game-error, --game-muted. Все цвета в игре бери только из этих переменных.');
        L.push('Проверь читаемость: текст на фоне и на карточках должен оставаться контрастным, даже если стиль тёмный или пёстрый.');

        if (extra) {
          L.push('');
          L.push('=== 6. ОСОБЫЕ УСЛОВИЯ ОТ УЧИТЕЛЯ (приоритетнее пунктов выше) ===');
          L.push(extra);
        }

        L.push('');
        L.push(`=== ${extra ? 7 : 6}. ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ ===`);
        put('Формат результата', base.format);
        L.push('Весь код — HTML, CSS и JavaScript — помести в один файл. Не подключай внешние библиотеки, шрифты и картинки: игра должна полностью работать при открытии файла с диска, без интернета и без сервера.');
        L.push('Не используй localStorage, sessionStorage и cookie — код должен работать в песочнице с отключённым хранилищем.');
        L.push('Если нужны изображения, нарисуй их средствами CSS/SVG прямо в файле или используй эмодзи.');
        L.push('Правильные ответы не должны быть видны в исходной разметке до ответа ученика: храни их в JavaScript и подставляй динамически, чтобы их нельзя было подсмотреть через «Просмотр кода».');
        L.push('Не используй alert, confirm и prompt: все сообщения показывай внутри интерфейса игры.');
        L.push('Игра длинная — следи за состоянием: у каждого этапа своё состояние, при переходе предыдущий этап полностью останавливается, его таймеры и обработчики снимаются.');
        L.push('Адаптация: игра одинаково удобна на телефоне и на компьютере. Крупные кнопки (минимум 44×44 px), читаемый текст, аккуратные отступы, никакой горизонтальной прокрутки.');
        L.push('Доступность: полное управление с клавиатуры (Tab, Enter, пробел), видимая рамка фокуса, контраст текста не ниже 4.5:1, у всех интерактивных элементов понятные подписи. Результат ответа сообщай не только цветом, но и значком или текстом.');
        L.push('Защити игру от быстрых повторных кликов: пока идёт анимация или проверка, повторное нажатие не должно ломать счёт и не должно засчитывать ответ дважды.');
        L.push('Добавь стартовый экран с названием игры, короткой инструкцией в 1–2 предложения и кнопкой начала.');
        L.push('В самом конце — один финальный экран с итогом по всем этапам и кнопкой повторного прохождения. При перезапуске полностью сбрасывай счёт, таймеры, прогресс и возвращай игру на первый этап.');
        L.push('Все тексты игры пиши на языке материала, без орфографических ошибок, обращаясь к ученику дружелюбно и на «ты».');
        L.push('Перед выдачей мысленно проверь: игра запускается, все этапы проходятся по очереди, счёт не сбрасывается между этапами, финальный экран один, кнопка перезапуска работает.');
        L.push('В ответе выдай только полный готовый HTML-код одним блоком, без пояснений до и после него.');

        return L.join('\n');
      }

      /* ---------- проверки перед выдачей ---------- */

      function collectWarnings(){
        const w = [];
        const base = valuesFor('basic', COMMON_FIELDS);
        const vis = valuesFor('visual', VISUAL_FIELDS);
        const max = stageCount();
        const num = (x) => { const v = parseInt(x, 10); return isNaN(v) ? null : v; };

        if (state.stages.length !== max) {
          w.push(state.stages.length < max
            ? `Выбрано ${state.stages.length} этапов из ${max}. Добавьте ещё ${max - state.stages.length} или уменьшите количество этапов в шаге 1.`
            : `Выбрано ${state.stages.length} этапов, а указано ${max}. Удалите лишние или увеличьте количество этапов.`);
        }
        if (!base.subject) w.push('Не указан предмет — нейросеть выберет его сама.');
        if (!base.grade) w.push('Не указан класс или возраст — сложность заданий может не подойти.');
        if (!vis.style) w.push('Стиль игры не задан — нейросеть придумает его сама.');
        if (vis.paletteMode === 'использовать мои цвета из поля ниже' && !vis.customPalette)
          w.push('Выбрана своя палитра, но поле «Мои цвета для игры» пустое.');

        state.stages.forEach((stage, i) => {
          const mech = mechById(stage.m);
          const mv = valuesFor('st:' + stage.uid + ':mech', mech.f);
          (mech.f || []).forEach(f => {
            if (f.t !== 'num') return;
            const v = num(mv[f.k]);
            if (v == null) { w.push(`Этап ${i + 1}: «${f.l}» — не число.`); return; }
            if (f.min != null && v < f.min) w.push(`Этап ${i + 1}: «${f.l}» — ${v}, минимум ${f.min}.`);
            if (f.max != null && v > f.max) w.push(`Этап ${i + 1}: «${f.l}» — ${v}, разумный максимум ${f.max}.`);
          });
          if (mech.id === 'm7' && num(mv.correct) > num(mv.elements))
            w.push(`Этап ${i + 1}: верных элементов больше, чем всего на экране.`);
          if (mech.id === 'm28' && num(mv.session) > num(mv.bank))
            w.push(`Этап ${i + 1}: заданий за сессию больше, чем в банке.`);
          if (mech.id === 'm29' && mv.prices && num(mv.questions) != null &&
              mv.prices.split(',').filter(s => s.trim()).length !== num(mv.questions))
            w.push(`Этап ${i + 1}: количество цен не совпадает с числом вопросов в категории.`);
        });

        const has = (id) => state.gameChecked.includes(id);
        if (has('fb_progress') && has('eng_progressbar'))
          w.push('«Прогресс и счётчик» и «Мотивирующий прогресс к цели» вместе дадут два индикатора — возможно, хватит одного.');
        if (has('fb_score') && has('eng_rewards')) {
          const a = getVal('game:fb_score:assessment', (FEEDBACK.find(b => b.id === 'fb_score').f || []).find(f => f.k === 'assessment'));
          const b = getVal('game:eng_rewards:format', (ENGAGEMENT.find(b => b.id === 'eng_rewards').f || []).find(f => f.k === 'format'));
          if (a && b && a !== b) w.push(`Оценка в финале («${a}») и формат награды («${b}») заданы по-разному — нейросеть может показать и то, и другое.`);
        }
        if (has('eng_route') && has('eng_progressbar'))
          w.push('«Маршрут по карте» и «Прогресс к цели» решают одну задачу — движение к финалу. Обычно достаточно одного.');
        if (state.gameChecked.length > 9)
          w.push('Выбрано очень много общих правил — игра может получиться перегруженной, а промпт слишком длинным.');

        const stageBlocks = state.stages.reduce((s, st) => s + ((state.stageChecked[st.uid] || []).length), 0);
        if (state.stages.length >= 5 && stageBlocks > 20)
          w.push('Много этапов и много блоков на каждом: промпт получится очень длинным, часть требований нейросеть может упустить.');

        return w;
      }

      function renderWarnings(list){
        if (!list.length) { el.warnings.className = 'iy-warnings'; el.warnings.innerHTML = ''; return; }
        el.warnings.className = 'iy-warnings is-on';
        el.warnings.innerHTML = `<b>Стоит проверить (${list.length}):</b><ul>${
          list.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
      }

      /* ---------- вывод ---------- */

      let updateTimer = null;
      let outputCleared = false;

      function showPrompt(text){
        el.output.value = text;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        el.size.textContent = text
          ? `Длина промпта: ${text.length} символов, примерно ${words} слов.`
          : 'Промпт очищен. Нажмите «Создать промпт», чтобы собрать его заново.';
      }

      function generateNow(){
        outputCleared = false;
        showPrompt(state.stages.length ? buildPrompt() : '');
        if (!state.stages.length) el.size.textContent = 'Сначала выберите механики для этапов в шаге 2.';
        renderWarnings(collectWarnings());
        renderSummary();
        save();
      }

      function clearOutput(){ outputCleared = true; showPrompt(''); }

      function update(){
        clearTimeout(updateTimer);
        updateTimer = setTimeout(() => {
          renderWarnings(collectWarnings());
          renderSummary();
          save();
          if (outputCleared) return;
          showPrompt(state.stages.length ? buildPrompt() : '');
          if (!state.stages.length) el.size.textContent = 'Сначала выберите механики для этапов в шаге 2.';
        }, 120);
      }

      function flash(msg, isError){
        el.status.textContent = msg;
        el.status.className = 'iy-status' + (isError ? ' is-error' : '');
        clearTimeout(flash._t);
        flash._t = setTimeout(() => { el.status.textContent = ''; }, 4000);
      }
