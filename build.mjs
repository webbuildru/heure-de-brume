import { copyFile, cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { scents, stages } from './scents.mjs';

const brand = 'L’Heure de Brume';

const articles = [
  {
    id: 'istoriya-doma',
    title: 'До первого парома',
    intro: 'Как утренний туман над бретонской гаванью дал имя парфюмерному дому.',
    paragraphs: [
      'Клер Валье открывала мастерскую в Дуарнене ещё до первого парома. Утром в гавани можно было различить соль, нагретый в соседней пекарне металл и слабый запах кедра от деревянных ящиков. Когда причал оживал, эти запахи терялись. Клер называла этот короткий промежуток l’heure de brume — часом тумана.',
      'На подоконнике стояли чайник, тёмные флаконы и папка с подписанными полосками бумаги. Первые композиции Клер проверяла на прогулке. По дороге к воде она записывала, что слышно сразу, а на обратном пути смотрела, что осталось на запястье. В одном из таких листков остались всего три слова: «ирис, холод, кожа». Из них вырос Brume d’Iris.',
      'Следом появился Sel de Brume, в котором соль соседствует с шалфеем, а после него Pluie de Thé, в память о чёрном чае на подоконнике мастерской. Коллекция со временем вышла за пределы гавани. В ней появились табачный мёд, тёмная вишня и горький кофе. Привычка Клер выходить на улицу с новым ароматом осталась.',
    ],
  },
  { id: 'kak-probovat-aromat', title: 'Как пробовать аромат на коже', intro: 'Дайте аромату время, прежде чем решить, подходит ли он вам.', paragraphs: ['Начните с одного аромата. Нанесите его на запястье и подождите, пока уйдёт первый резкий запах спирта.', 'Вернитесь к запястью через полчаса. К этому моменту обычно лучше слышны средние ноты. Затем обратите внимание на то, что останется к вечеру.', 'На следующий день попробуйте аромат снова. Запишите два или три слова о каждом знакомстве: так сравнивать пробники проще, чем по памяти.'] },
  { id: 'iris-v-parfumerii', title: 'Ирис в парфюмерии', intro: 'Знакомимся с нотой, с которой началась коллекция.', paragraphs: ['Ирис может напоминать сухую пудру, фиалку или прохладное дерево. В Brume d’Iris у него две соседние ноты: фиалка и мягкий мускус.', 'При сравнении с другими цветочными ароматами обратите внимание, кажется ли вам ирис сухим, сладким или прохладным.'] },
];

const navigation = [['/collection/', 'Коллекция'], ['/notes/', 'Подбор'], ['/journal/', 'Журнал'], ['/samples/', 'Пробники']];
const intro = (title, description) => `<header class="intro"><h1>${title}</h1><p>${description}</p></header>`;
const section = content => `<div class="frame section">${content}</div>`;
const button = (href, label) => `<a class="button" href="${href}">${label}</a>`;

function layout(path, title, description, content) {
  const nav = navigation.map(([href, label]) => {
    const active = path.startsWith(href) || (href === '/collection/' && path.startsWith('/aroma/'));
    return `<a href="${href}"${active ? ' aria-current="page"' : ''}>${label}${href === '/samples/' ? ' <span class="count" data-count hidden></span>' : ''}</a>`;
  }).join('');
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${description}"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta name="theme-color" content="#222b26"><title>${title}</title><link rel="stylesheet" href="/style.css"><script defer src="/site.js"></script></head>
<body><a class="skip" href="#main">К содержанию</a><header class="header"><div class="frame masthead">
<a class="brand" href="/" lang="fr">${brand}</a><nav aria-label="Основное меню">${nav}</nav></div></header>
<main id="main">${content}</main><footer><div class="frame footer"><a class="brand" href="/" lang="fr">${brand}</a><a href="/about/">О доме</a></div></footer></body></html>`;
}

function photo(scent, { eager = false, describe = false } = {}) {
  const loading = eager ? 'fetchpriority="high"' : 'loading="lazy"';
  return `<img src="/photos/${scent.id}.jpg" alt="${describe ? `Флакон ${scent.name}` : ''}" width="508" height="508" decoding="async" ${loading}>`;
}

function cards(items, heading = 'h2', filterable = false) {
  return `<ul class="catalog">${items.map(scent => `<li${filterable ? ` data-scent="${scent.id}"` : ''}><a class="scent-card" href="/aroma/${scent.id}/"><div class="specimen">${photo(scent)}</div><${heading} lang="fr">${scent.name}</${heading}><p>${scent.notes.join(', ')}</p></a></li>`).join('')}</ul>`;
}

function noteGroup(key, label, getNotes) {
  const notes = [...new Set(scents.flatMap(getNotes))].sort((a, b) => a.localeCompare(b, 'ru'));
  return `<div class="note-field"><label for="note-${key}">${label}</label>
  <select id="note-${key}" data-note-group="${key}"><option value="">Добавить ноту</option>${notes.map(note => `<option value="${note}">${note}</option>`).join('')}</select>
  <ul class="selected-notes" data-selected="${key}"></ul></div>`;
}

const featured = scents[0];
const stageGroups = Object.entries(stages).map(([key, label]) => noteGroup(key, label, scent => scent.pyramid[key])).join('');
const finder = `<div class="finder">
<form class="finder-controls">
  <fieldset class="mode"><legend>Режим подбора</legend><div class="mode-options">
    <label><input type="radio" name="mode" value="basic" checked><span>Базовый</span></label>
    <label><input type="radio" name="mode" value="advanced"><span>Расширенный</span></label>
  </div></fieldset>
  <div class="note-panel" data-mode-panel="basic"><p>Выберите знакомые ноты. Покажем ароматы, где есть все выбранные.</p>${noteGroup('general', 'Ноты аромата', scent => scent.notes)}</div>
  <div class="note-panel" data-mode-panel="advanced" hidden><p>Выберите, что хотите услышать в начале, в сердце и в шлейфе. Можно добавить несколько нот на каждом уровне.</p>${stageGroups}</div>
  <button class="plain" type="button" data-clear>Сбросить выбор</button>
  <noscript><p>Включите JavaScript, чтобы подобрать ароматы.</p></noscript>
</form>
<div class="finder-results"><h2 class="finder-heading">Подходящие ароматы</h2><p class="finder-count" data-results role="status">Найдено: ${scents.length}</p>
${cards(scents, 'h3', true)}<p data-empty hidden>Подходящих ароматов нет. Уберите одну из выбранных нот или сбросьте фильтры.</p></div></div>`;

const pages = new Map([
  ['/', ['Парфюмерный дом', 'Восемнадцать ароматов L’Heure de Brume и подбор по нотам.', `<section class="hero"><div class="frame hero-grid">
<div class="hero-copy"><h1>Ароматы<br>часа тумана</h1><p>Восемнадцать композиций, от прохладного ириса до тёплой дымной амбры.</p>${button('/collection/', 'Смотреть коллекцию')}</div>
<a class="hero-feature" href="/aroma/${featured.id}/" aria-label="Открыть аромат Brume d’Iris">${photo(featured, { eager: true })}<span class="feature-caption" lang="fr">Brume d’Iris</span></a>
</div></section>
<section class="frame section home-catalog"><div class="section-head"><h2>Коллекция</h2><a href="/collection/">Все ароматы</a></div>${cards(scents.slice(0, 3), 'h3')}</section>
<section class="note-band"><div class="frame section section-head"><div><h2>С чего начать</h2><p>Выберите знакомую ноту и посмотрите, в каких ароматах она звучит.</p></div>${button('/notes/', 'Подобрать по нотам')}</div></section>`]],
  ['/collection/', ['Коллекция', 'Восемнадцать ароматов L’Heure de Brume.', section(intro('Коллекция', '18 композиций с цветочными, древесными, свежими и амбровыми нотами.') + cards(scents))]],
  ['/notes/', ['Подбор аромата', 'Подберите парфюм по любимым нотам или по тому, как они раскрываются.', section(intro('Подбор аромата', 'Найдите знакомые ноты или соберите свою пирамиду аромата.') + finder)]],
  ['/samples/', ['Пробники', 'Подборка пробников L’Heure de Brume.', section(intro('Мои пробники', 'Сохраняйте ароматы, которые хотите попробовать. Подборка останется в этом браузере.') + `<div data-samples></div><p class="feedback" data-sample-status role="status"></p><noscript><p>Для сохранения подборки включите JavaScript.</p></noscript>${button('/collection/', 'Открыть коллекцию')}`)]],
  ['/journal/', ['Журнал', 'Заметки об ароматах и парфюмерных нотах.', section(intro('Журнал', 'Заметки о нотах и о том, как знакомиться с ароматами.') + `<div class="editorial-list">${articles.map(article => `<article><h2><a href="/journal/${article.id}/">${article.title}</a></h2><p>${article.intro}</p></article>`).join('')}</div>`)]],
  ['/about/', ['О доме', 'Парфюмерный дом L’Heure de Brume.', `<article class="frame section reading">${intro('О доме', 'L’Heure de Brume — «час тумана» по-французски.')}<p>Всё началось с утра в бретонской гавани, когда лучше всего слышны соль и влажное дерево. Близость к морю осталась в первых ароматах дома: прохладном Brume d’Iris, солёном Sel de Brume и терпком Pluie de Thé.</p>${button('/journal/istoriya-doma/', 'Читать историю дома')}</article>`]],
]);

for (const scent of scents) {
  pages.set(`/aroma/${scent.id}/`, [scent.name, scent.description, section(`<a class="back" href="/collection/">Вся коллекция</a><article class="detail"><div class="specimen">${photo(scent, { eager: true, describe: true })}</div><div><h1 lang="fr">${scent.name}</h1><p class="lead">${scent.description}</p><dl class="accord">${Object.entries(stages).map(([key, label]) => `<div><dt>${label}</dt><dd>${scent.pyramid[key].join(', ')}</dd></div>`).join('')}</dl><button class="button" type="button" data-add="${scent.id}">Добавить пробник</button><p class="feedback" role="status" data-feedback></p></div></article>`)]);
}

for (const article of articles) {
  pages.set(`/journal/${article.id}/`, [article.title, article.intro, `<article class="frame section reading"><a class="back" href="/journal/">Все статьи</a>${intro(article.title, article.intro)}${article.paragraphs.map(paragraph => `<p>${paragraph}</p>`).join('')}${article.id === 'istoriya-doma' ? button('/collection/', 'Смотреть коллекцию') : ''}</article>`]);
}

for (const [path, [title, description, content]] of pages) {
  const directory = join('dist', path.slice(1));
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'index.html'), layout(path, `${title} | ${brand}`, description, content));
}
await writeFile('dist/404.html', layout('', `Страница не найдена | ${brand}`, 'Страница не найдена.', section(intro('Страница не найдена', 'Проверьте адрес или вернитесь на главную.') + button('/', 'На главную'))));
await copyFile('style.css', 'dist/style.css');
await cp('photos', 'dist/photos', { recursive: true });
const script = await readFile('site.js', 'utf8');
await writeFile('dist/site.js', `const scents = ${JSON.stringify(scents.map(({ id, name, notes, pyramid }) => ({ id, name, notes, pyramid })))};\n${script}`);
