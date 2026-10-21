// Заявка по маркам: покупатель отмечает строки в таблицах, список живёт в localStorage
// и открывается на странице «Прайс-лист и заявка». В рабочей версии список уходит в отдел сбыта.
const KEY = 'gbi2-request';

export type RequestItem = { mark: string; item: string; url: string; qty: number };

export function readRequest(): RequestItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function writeRequest(list: RequestItem[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* приватный режим — список живёт до перезагрузки */ }
  document.dispatchEvent(new CustomEvent('request:change', { detail: list }));
}

function renderCount(list: RequestItem[]) {
  document.querySelectorAll<HTMLElement>('[data-request-count]').forEach((el) => {
    el.textContent = String(list.length);
    el.hidden = list.length === 0;
  });
  const marks = new Set(list.map((r) => r.mark));
  document.querySelectorAll<HTMLButtonElement>('button.add-mark').forEach((b) => {
    const on = marks.has(b.dataset.mark || '');
    b.setAttribute('aria-pressed', String(on));
    b.textContent = on ? '✓' : '+';
    b.title = on ? 'Убрать из заявки' : 'Добавить в заявку';
  });
}

export function initRequest() {
  renderCount(readRequest());
  document.addEventListener('request:change', (e) => renderCount((e as CustomEvent).detail));
  document.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button.add-mark');
    if (!b) return;
    const mark = b.dataset.mark!;
    const list = readRequest();
    const i = list.findIndex((r) => r.mark === mark);
    if (i >= 0) list.splice(i, 1);
    else list.push({ mark, item: b.dataset.item || '', url: location.pathname + '#' + (b.closest('tr')?.id || ''), qty: 1 });
    writeRequest(list);
  });
}
