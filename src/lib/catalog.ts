import data from '../data/catalog.json';

export type Item = { path: string; slug: string; title: string; image: string | null; purpose: string; code: string[]; notation: string[]; tables: string[] };
export type Group = { path: string; slug: string; title: string; image: string | null; items: Item[] };
export type Category = { path: string; slug: string; title: string; image: string | null; groups: Group[] };

// Порядок как на главной старого сайта: сначала то, что покупают чаще.
const order = [
  'fundamenti', 'izdeliya-dlya-stroitelstva-grazhdanskih', 'izdeliya-dlya-ustroystva-kommunikatsiy',
  'izdeliya-dlya-stroitelstva-promishlennih', 'elementi-dorozhnogo-stroitelstva', 'izdeliya-dlya-stroitelstva-rezervuarov',
  'izdeliya-dlya-stroitelstva-zhivotnovodcheskih', 'proizvodstvo-i-remont-metallicheskih',
];
export const catalog = (data as Category[]).slice().sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));

export const countMarks = (items: Item[]) =>
  items.reduce((n, it) => n + it.tables.reduce((k, t) => k + (t.match(/<tr><td>\d?[А-ЯA-Z]{1,5}[\s\d]/g)?.length || 0), 0), 0);

export const catMarks = (c: Category) => countMarks(c.groups.flatMap((g) => g.items));

// «1 марка, 2 марки, 5 марок»
export const plural = (n: number, one: string, few: string, many: string) => {
  const a = n % 100, b = n % 10;
  if (a > 10 && a < 20) return many;
  return b === 1 ? one : b >= 2 && b <= 4 ? few : many;
};
export const marksLabel = (n: number) => `${n} ${plural(n, 'марка', 'марки', 'марок')}`;
