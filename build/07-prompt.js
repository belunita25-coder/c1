
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
        const lines = template.split('\n').map(line => {
          const parts = line.match(/[^.]+\.?/g);
          if (!parts) return line;
          return parts.filter(p => keepSentence(p, values)).join('').replace(/\s{2,}/g, ' ').trim();
        }).filter(line => line !== '');
        return lines.join('\n').replace(/\{([^}]+)\}/g, (_, k) =>
          Object.prototype.hasOwnProperty.call(values, k) ? values[k] : ''
        );
      }

      function blockVal(list, scope, itemId, key){
        const item = list.find(i => i.id === itemId);
        if (!item) return '';
        const field = (item.f || []).find(f => f.k === key);
        if (!field) return '';
        return String(getVal(scope + ':' + itemId + ':' + key, field) || '').trim();
      }

      function blockText(item, scope){
        return fill(item.p, valuesFor(scope + ':' + item.id, item.f));
      }

      const selectedBlocks = (list, scope) =>
        list.filter(i => fits(i, state.mechanic) && state.checked[scope].includes(i.id));

      function buildPrompt(){
        const m = mechanic();
        const base = valuesFor('basic', COMMON_FIELDS);
        const vis = valuesFor('visual', VISUAL_FIELDS);
        const fb = selectedBlocks(FEEDBACK, 'feedback');
        const eng = selectedBlocks(ENGAGEMENT, 'engagement');
        const extra = state.extra.trim();
        const L = [];
        const put = (label, value) => { if (value) L.push(`${label}: ${value}.`); };

        L.push('Ты — разработчик учебных интерактивных игр. Создай интерактивную HTML-игру для урока по описанию ниже.');
        L.push('');
        L.push('=== 1. УЧЕБНАЯ ЗАДАЧА ===');
        put('Предмет', base.subject || 'выбери подходящий сам');
        put('Класс или возраст', base.grade || 'выбери сам и укажи в начале ответа');
        put('Тема', base.topic || 'выбери подходящую тему сам');
        put('Зачем игра нужна на уроке', base.goal);
        put('Ожидаемая длительность', base.duration);
        put('Где будут играть', base.device);
        put('Язык всех текстов в игре', base.language);
        L.push('Содержание заданий придумай сам: оно должно соответствовать программе указанного класса и быть фактически верным. Проверь все ответы на правильность.');

        L.push('');
        L.push('=== 2. ОСНОВНАЯ МЕХАНИКА ===');
        L.push(`Механика №${m.num}: ${m.title}.`);
        L.push(`Суть: ${m.short}`);
        L.push(`Что происходит в игре: ${m.what}.`);
        L.push('');
        L.push(fill(m.p, valuesFor('mech:' + m.id, m.f)));

        L.push('');
        L.push('=== 3. ОБРАТНАЯ СВЯЗЬ ===');
        if (fb.length) {
          fb.forEach((item, i) => L.push(`${i + 1}. ${item.title}. ${blockText(item, 'feedback')}`));
        } else {
          L.push('Дополнительную обратную связь не добавляй. Оставь минимум, без которого игра выглядела бы сломанной: любое действие ученика должно давать понятный видимый результат.');
        }

        L.push('');
        L.push('=== 4. ВОВЛЕЧЕНИЕ ===');
        if (eng.length) {
          eng.forEach((item, i) => L.push(`${i + 1}. ${item.title}. ${blockText(item, 'engagement')}`));
        } else {
          L.push('Дополнительные механики вовлечения не добавляй. Не усложняй игру лишними элементами.');
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
        put('Палитра', vis.paletteMode);
        put('Мои цвета', vis.customPalette);
        put('Фон', vis.backgroundType);
        put('Карточки и кнопки', vis.cardStyle);
        put('Декор', vis.decor);
        put('Иллюстрации', vis.illustration);
        put('Шрифт и настроение текста', vis.fontMood);
        put('Стартовый экран', vis.startScreen);
        put('Цвета конструктора', vis.avoidConstructorColors);

        L.push('ВАЖНО про оформление. Стиль должен быть виден во всех элементах игры, а не только в цвете кнопок: стартовый экран, игровое поле, карточки заданий, кнопки, подсказки, окно ошибки, индикатор прогресса, финальный экран, фон, рамки, иконки и мелкие декоративные детали.');
        L.push('Не используй одну универсальную цветовую схему для разных стилей: подбирай палитру, фон, форму карточек, иконки и атмосферу именно под выбранный стиль. Игра в пиратском стиле и игра в стиле лаборатории должны выглядеть как две разные игры.');
        L.push('Не копируй палитру конструктора промптов — она нужна только интерфейсу выбора. У самой игры должна быть собственная CSS-палитра.');
        L.push('Ориентиры для других стилей, если понадобится их смешать: космос — тёмный фон, звёзды, планеты, неоновые акценты; пиратский — карта, дерево, канаты, сундук, морские цвета; вязаный — мягкие текстуры, нити, пуговицы, тёплые пастельные тона; лаборатория — колбы, схемы, стекло, светлый фон; школьная тетрадь — клетка, синие чернила, поля, наклейки.');
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
        L.push('Адаптация: игра одинаково удобна на телефоне и на компьютере. Крупные кнопки (минимум 44×44 px), читаемый текст, аккуратные отступы, никакой горизонтальной прокрутки.');
        L.push('Доступность: полное управление с клавиатуры (Tab, Enter, пробел), видимая рамка фокуса, контраст текста не ниже 4.5:1, у всех интерактивных элементов понятные подписи. Результат ответа сообщай не только цветом, но и значком или текстом.');
        L.push('Защити игру от быстрых повторных кликов: пока идёт анимация или проверка, повторное нажатие не должно ломать счёт и не должно засчитывать ответ дважды.');
        L.push('Добавь стартовый экран с названием игры, короткой понятной инструкцией в 1–2 предложения и кнопкой начала.');
        L.push('Добавь итоговый экран с понятным результатом и кнопкой повторного прохождения. При перезапуске полностью сбрасывай счёт, таймеры и прогресс.');
        L.push('Все тексты игры пиши на языке материала, без орфографических ошибок, обращаясь к ученику дружелюбно и на «ты».');
        L.push('Перед выдачей мысленно проверь: игра запускается, проходится до конца, счёт считается верно, кнопка «Играть снова» работает.');
        L.push('В ответе выдай только полный готовый HTML-код одним блоком, без пояснений до и после него.');

        return L.join('\n');
      }

      /* ---------- проверки перед выдачей ---------- */

      function collectWarnings(){
        const w = [];
        const m = mechanic();
        const base = valuesFor('basic', COMMON_FIELDS);
        const vis = valuesFor('visual', VISUAL_FIELDS);
        const mv = valuesFor('mech:' + m.id, m.f);
        const num = (x) => { const n = parseInt(x, 10); return isNaN(n) ? null : n; };

        if (!base.subject) w.push('Не указан предмет — нейросеть выберет его сама.');
        if (!base.grade) w.push('Не указан класс или возраст — сложность заданий может не подойти.');

        (m.f || []).forEach(f => {
          if (f.t !== 'num') return;
          const n = num(mv[f.k]);
          if (n == null) { w.push(`«${f.l}» — не число.`); return; }
          if (f.min != null && n < f.min) w.push(`«${f.l}»: ${n} — слишком мало, минимум ${f.min}.`);
          if (f.max != null && n > f.max) w.push(`«${f.l}»: ${n} — слишком много, разумный максимум ${f.max}.`);
        });

        if (m.id === 'm7' && num(mv.correct) != null && num(mv.elements) != null && num(mv.correct) > num(mv.elements))
          w.push('Верных элементов больше, чем всего элементов на экране.');
        if (m.id === 'm28' && num(mv.session) != null && num(mv.bank) != null && num(mv.session) > num(mv.bank))
          w.push('Заданий за сессию больше, чем всего в банке.');
        if (m.id === 'm29' && mv.prices && num(mv.questions) != null &&
            mv.prices.split(',').filter(s => s.trim()).length !== num(mv.questions))
          w.push('Количество цен не совпадает с количеством вопросов в категории.');
        if (m.id === 'm2' && num(mv.tasks) === 1) w.push('Задание всего одно — игра закончится сразу.');

        if (vis.paletteMode === 'использовать мои цвета из поля ниже' && !vis.customPalette)
          w.push('Выбрана своя палитра, но поле «Мои цвета для игры» пустое.');
        if (!vis.style) w.push('Стиль игры не задан — нейросеть придумает его сама.');

        const has = (s, id) => state.checked[s].includes(id);
        if (has('feedback', 'fb_progress') && has('engagement', 'eng_progressbar'))
          w.push('«Прогресс и счётчик» и «Мотивирующий прогресс к цели» вместе дадут два индикатора — возможно, хватит одного.');
        if (has('feedback', 'fb_score') && has('engagement', 'eng_rewards')) {
          const a = blockVal(FEEDBACK, 'feedback', 'fb_score', 'assessment');
          const b = blockVal(ENGAGEMENT, 'engagement', 'eng_rewards', 'format');
          if (a && b && a !== b) w.push(`Оценка в финале («${a}») и формат награды («${b}») заданы по-разному — нейросеть может показать и то, и другое.`);
        }
        if (has('feedback', 'fb_next') && has('feedback', 'fb_block'))
          w.push('«Переход Дальше» и «Блокировка прогресса» пересекаются — проверьте, что условия не противоречат друг другу.');
        if (has('engagement', 'eng_timer') && has('engagement', 'eng_duel'))
          w.push('Таймер вместе с соревнованием сильно ускоряет игру — убедитесь, что это нужно.');
        if (state.checked.feedback.length + state.checked.engagement.length > 10)
          w.push('Выбрано очень много блоков — игра может получиться перегруженной, а промпт слишком длинным.');

        return w;
      }

      function renderWarnings(list){
        if (!list.length) { el.warnings.className = 'iy-warnings'; el.warnings.innerHTML = ''; return; }
        el.warnings.className = 'iy-warnings is-on';
        el.warnings.innerHTML = `<b>Стоит проверить (${list.length}):</b><ul>${
          list.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
      }

      /* ---------- обновление вывода ---------- */

      let updateTimer = null;
      let outputCleared = false;   // промпт очищен кнопкой «Очистить промпт»

      function showPrompt(text){
        el.output.value = text;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        el.size.textContent = text
          ? `Длина промпта: ${text.length} символов, примерно ${words} слов.`
          : 'Промпт очищен. Нажмите «Создать промпт», чтобы собрать его заново.';
      }

      // Пересобрать принудительно — кнопкой «Создать промпт»
      function generateNow(){
        outputCleared = false;
        showPrompt(buildPrompt());
        renderWarnings(collectWarnings());
        renderSummary();
        save();
      }

      // Очистить только поле с промптом, настройки не трогаем
      function clearOutput(){
        outputCleared = true;
        showPrompt('');
      }

      function update(){
        clearTimeout(updateTimer);
        updateTimer = setTimeout(() => {
          renderWarnings(collectWarnings());
          renderSummary();
          save();
          if (outputCleared) return;   // пока не нажали «Создать промпт»
          showPrompt(buildPrompt());
        }, 120);
      }

      function flash(msg, isError){
        el.status.textContent = msg;
        el.status.style.color = isError ? '#A32222' : 'var(--iy-ok)';
        clearTimeout(flash._t);
        flash._t = setTimeout(() => { el.status.textContent = ''; }, 4000);
      }
