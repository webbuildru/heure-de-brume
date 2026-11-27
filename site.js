const storageKey = 'heure-de-brume.samples';
const known = new Map(scents.map(scent => [scent.id, scent]));

function readSelection() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(value) ? [...new Set(value.filter(id => known.has(id)))] : [];
  } catch {
    return [];
  }
}

function saveSelection(next) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

const count = document.querySelector('[data-count]');
const addButton = document.querySelector('[data-add]');
const samples = document.querySelector('[data-samples]');

function renderSelection() {
  const selected = readSelection();
  count.textContent = selected.length;
  count.hidden = selected.length === 0;
  if (addButton) {
    const added = selected.includes(addButton.dataset.add);
    addButton.textContent = added ? 'Пробник в подборке' : 'Добавить пробник';
    addButton.setAttribute('aria-disabled', String(added));
  }
  if (!samples) return;
  samples.replaceChildren();
  if (selected.length === 0) {
    const message = document.createElement('p');
    message.textContent = 'В подборке пока пусто. Откройте аромат из коллекции и добавьте его пробник.';
    samples.append(message);
    return;
  }
  const list = document.createElement('ul');
  list.className = 'sample-list';
  for (const id of selected) {
    const { name } = known.get(id);
    const row = document.createElement('li');
    const link = document.createElement('a');
    link.href = `/aroma/${id}/`;
    link.lang = 'fr';
    link.textContent = name;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'plain';
    remove.textContent = 'Удалить';
    remove.setAttribute('aria-label', `Удалить пробник ${name}`);
    remove.dataset.remove = id;
    row.append(link, remove);
    list.append(row);
  }
  samples.append(list);
}

addButton?.addEventListener('click', () => {
  const id = addButton.dataset.add;
  const selected = readSelection();
  if (selected.includes(id)) return;
  const saved = saveSelection([...selected, id]);
  renderSelection();
  document.querySelector('[data-feedback]').textContent = saved
    ? 'Пробник добавлен. Откройте «Пробники», чтобы увидеть подборку.'
    : 'Не удалось сохранить пробник. Проверьте настройки хранения данных в браузере.';
});

samples?.addEventListener('click', event => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  const id = button.dataset.remove;
  const saved = saveSelection(readSelection().filter(item => item !== id));
  const status = document.querySelector('[data-sample-status]');
  if (saved) {
    renderSelection();
    (samples.querySelector('button') ?? document.querySelector('main .button')).focus();
  }
  status.textContent = saved
    ? `Пробник ${known.get(id).name} удалён.`
    : 'Не удалось обновить подборку. Проверьте настройки хранения данных в браузере.';
});
window.addEventListener('storage', event => {
  if (event.key === storageKey || event.key === null) renderSelection();
});
window.addEventListener('pageshow', renderSelection);
renderSelection();

const finder = document.querySelector('.finder');
if (finder) {
  const form = finder.querySelector('form');
  const panels = [...finder.querySelectorAll('[data-mode-panel]')];
  const cards = [...finder.querySelectorAll('[data-scent]')];
  const groups = new Map([...finder.querySelectorAll('[data-note-group]')].map(select => {
    const key = select.dataset.noteGroup;
    return [key, { select, list: select.nextElementSibling, notes: new Set() }];
  }));
  const resultLine = finder.querySelector('[data-results]');
  const empty = finder.querySelector('[data-empty]');
  const clear = finder.querySelector('[data-clear]');

  const activeKeys = () => form.elements.mode.value === 'advanced' ? ['top', 'heart', 'base'] : ['general'];

  function renderGroup(key) {
    const { select, list, notes } = groups.get(key);
    select.value = '';
    for (const option of select.options) option.disabled = notes.has(option.value);
    list.replaceChildren();
    for (const note of notes) {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.removeNote = note;
      button.dataset.group = key;
      button.textContent = note;
      button.setAttribute('aria-label', `Убрать ноту «${note}»`);
      item.append(button);
      list.append(item);
    }
  }

  function filter() {
    const keys = activeKeys();
    const mode = form.elements.mode.value;
    for (const panel of panels) panel.hidden = panel.dataset.modePanel !== mode;

    let matches = 0;
    for (const card of cards) {
      const scent = known.get(card.dataset.scent);
      card.hidden = !keys.every(key => {
        const present = key === 'general' ? scent.notes : scent.pyramid[key];
        return [...groups.get(key).notes].every(note => present.includes(note));
      });
      matches += Number(!card.hidden);
    }
    resultLine.textContent = `Найдено: ${matches}`;
    empty.hidden = matches > 0;
  }

  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('change', event => {
    const key = event.target.dataset.noteGroup;
    if (key && event.target.value) {
      groups.get(key).notes.add(event.target.value);
      renderGroup(key);
    }
    filter();
  });
  form.addEventListener('click', event => {
    const button = event.target.closest('[data-remove-note]');
    if (!button) return;
    const { group, removeNote } = button.dataset;
    const { notes, select } = groups.get(group);
    notes.delete(removeNote);
    renderGroup(group);
    filter();
    select.focus();
  });
  clear.addEventListener('click', () => {
    for (const key of activeKeys()) {
      groups.get(key).notes.clear();
      renderGroup(key);
    }
    filter();
  });
  window.addEventListener('pageshow', () => {
    for (const key of groups.keys()) renderGroup(key);
    filter();
  });
  filter();
}
