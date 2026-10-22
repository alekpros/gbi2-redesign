// Заявка по маркам: покупатель отмечает строки в таблицах, список живёт в localStorage
// и открывается на странице «Прайс-лист и заявка». В рабочей версии список уходит в отдел сбыта.
const KEY = 'gbi2-request';

export type RequestItem = { mark: string; item: string; url: string; qty: number; w?: number; v?: number };

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
    else list.push({
      mark, item: b.dataset.item || '', url: location.pathname + '#' + (b.closest('tr')?.id || ''), qty: 1,
      w: b.dataset.w ? +b.dataset.w : undefined, v: b.dataset.v ? +b.dataset.v : undefined,
    });
    writeRequest(list);
  });
}

// Итоги по заявке: штук, тонн, кубометров. Нужны покупателю, чтобы прикинуть транспорт.
export function totals(list: RequestItem[]) {
  const qty = list.reduce((n, r) => n + r.qty, 0);
  const mass = list.reduce((n, r) => n + (r.w || 0) * r.qty, 0);
  const vol = list.reduce((n, r) => n + (r.v || 0) * r.qty, 0);
  const unknown = list.filter((r) => !r.w).length;
  return { qty, mass, vol, unknown };
}

export const fmt = (n: number, d = 1) => n.toLocaleString('ru-RU', { maximumFractionDigits: d });

// Заявка как текст — для письма или мессенджера.
export function asText(list: RequestItem[]) {
  const t = totals(list);
  return [
    'Заявка на железобетонные изделия, Завод ЖБИ-2',
    ...list.map((r, i) => `${i + 1}. ${r.mark} — ${r.item}, ${r.qty} шт.${r.w ? ` (${fmt(r.w * r.qty, 2)} т)` : ''}`),
    `Итого: ${t.qty} шт.${t.mass ? `, ${fmt(t.mass)} т, ${fmt(t.vol)} м³` : ''}`,
  ].join('\n');
}
