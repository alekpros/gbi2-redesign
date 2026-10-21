// Ссылки с учётом base, чтобы сайт работал и в корне домена, и в подпапке GitHub Pages.
const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/';
export const u = (path = '') => base + path.replace(/^\//, '');
export const img = (file: string) => u('img/' + file);
// Картинки каталога хранятся как /core/storage/<hash>/<size>.webp — локально они лежат в img/<hash10>-<size>.webp
export const storageImg = (src?: string | null) => {
  if (!src) return null;
  const m = src.match(/storage\/([0-9a-f]{10})[0-9a-f]*\/([\w.]+)$/);
  return m ? img(`${m[1]}-${m[2]}`) : null;
};
export const anchor = (mark: string) => mark.replace(/[^0-9A-Za-zА-Яа-яЁё]+/g, '-').replace(/^-|-$/g, '');
