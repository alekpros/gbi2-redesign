"""Собирает структурированный каталог из скачанных страниц gbi2.ru.

Берём только фактические данные: названия, назначение изделия, расшифровку марки,
таблицы характеристик, картинки. Маркетинговые тексты не переносим — они переписаны вручную.
Запуск: python3 scripts/build_catalog.py <папка со скачанными html> <pages.json>
"""
import html, json, re, sys
from html.parser import HTMLParser
from pathlib import Path

SRC, PAGES = Path(sys.argv[1]), json.load(open(sys.argv[2]))
OUT = Path(__file__).resolve().parent.parent / 'src' / 'data' / 'catalog.json'


def clean(t):
    return re.sub(r'\s+', ' ', html.unescape(t)).strip()


def gwm(s):
    """Содержимое основного блока статьи (div.gwm) до таблицы-раздела «Продукция»."""
    i = s.find('class="gwm"')
    if i < 0:
        return ''
    j = s.find('class="mapWrapper"', i)
    return s[i:j if j > 0 else None]


class TableClean(HTMLParser):
    """Оставляет от таблицы только структуру и rowspan/colspan."""
    KEEP = {'table', 'thead', 'tbody', 'tr', 'th', 'td', 'sup', 'sub', 'br'}

    def __init__(self):
        super().__init__(); self.out = []

    def handle_starttag(self, t, a):
        if t in self.KEEP:
            attrs = ''.join(f' {k}="{v}"' for k, v in a if k in ('rowspan', 'colspan') and v and v != '1')
            self.out.append(f'<{t}{attrs}>')

    def handle_endtag(self, t):
        if t in self.KEEP and t != 'br':
            self.out.append(f'</{t}>')

    def handle_data(self, d):
        self.out.append(html.escape(re.sub(r'\s+', ' ', d)))


def tables(seg):
    res = []
    for m in re.finditer(r'<table.*?</table>', seg, re.S):
        p = TableClean(); p.feed(m.group(0))
        t = re.sub(r'>\s+<', '><', ''.join(p.out))
        t = re.sub(r'<(td|th)> ', r'<\1>', t)
        res.append(t)
    return res


def first_img(s):
    m = re.search(r'class="post".*?<img src="([^"]+)"', s, re.S)
    return m.group(1) if m else None


def item_page(s):
    seg = gwm(s)
    body = re.sub(r'<table.*?</table>', '', seg, flags=re.S)
    paras = [clean(re.sub(r'<[^>]+>', '', p)) for p in re.findall(r'<p[^>]*>(.*?)</p>', body, re.S)]
    paras = [p for p in paras if p]
    code = [clean(re.sub(r'<[^>]+>', '', h)) for h in re.findall(r'<h2[^>]*>(.*?)</h2>', body, re.S)]
    purpose, notation = [], []
    for p in paras:
        (notation if notation or p.startswith('Условные') else purpose).append(p)
    notation = [n.rstrip(',.') for n in notation if not n.startswith('Условные')]
    # одно предложение о назначении — это справочный факт, а не рекламный текст
    first = re.split(r'(?<=[.;])\s', purpose[0])[0] if purpose else ''
    first = re.sub(r'(\w)-(\w)', lambda m: m.group(1) + m.group(2) if m.group(1).islower() and m.group(2).islower() and len(first) else m.group(0), first)
    return {'purpose': first, 'code': code[:1], 'notation': notation[:12], 'tables': tables(seg)}


def children(s, prefix):
    """Ссылки на дочерние страницы раздела в порядке появления."""
    seen, res = set(), []
    for href, inner in re.findall(r'<a[^>]+href="(%s[^"]+/)"[^>]*>(.*?)</a>' % re.escape(prefix), s, re.S):
        if href.count('/') == prefix.count('/') + 1 and href not in seen:
            seen.add(href); res.append(href)
    return res


def title(s):
    m = re.search(r'<h1[^>]*>(.*?)</h1>', s, re.S)
    return clean(re.sub(r'<[^>]+>', '', m.group(1))) if m else ''


def load(path):
    slug = path.strip('/').replace('/', '__')
    f = SRC / f'{slug}.html'
    return f.read_text(encoding='utf-8') if f.exists() else ''


root = load('/catalog/')
cards = re.findall(r'href="(/catalog/[^/"]+/)"', root)
cats = []
for cpath in dict.fromkeys(cards):
    cs = load(cpath)
    if not cs:
        continue
    cat = {'path': cpath, 'slug': cpath.split('/')[2], 'title': title(cs), 'image': first_img(cs), 'groups': []}
    for gpath in children(cs, cpath):
        gs = load(gpath)
        if not gs:
            continue
        g = {'path': gpath, 'slug': gpath.split('/')[3], 'title': title(gs), 'image': first_img(gs), 'items': []}
        for ipath in children(gs, gpath):
            ist = load(ipath)
            if ist:
                g['items'].append({'path': ipath, 'slug': ipath.split('/')[4], 'title': title(ist),
                                   'image': first_img(ist), **item_page(ist)})
        cat['groups'].append(g)
    cats.append(cat)

OUT.write_text(json.dumps(cats, ensure_ascii=False, indent=1))
n_items = sum(len(g['items']) for c in cats for g in c['groups'])
n_tab = sum(len(i['tables']) for c in cats for g in c['groups'] for i in g['items'])
print(f'{len(cats)} категорий, {sum(len(c["groups"]) for c in cats)} групп, {n_items} изделий, {n_tab} таблиц')
for c in cats:
    print(' ', c['title'], '|', [(g['title'], len(g['items'])) for g in c['groups']])

# Индекс марок для поиска и заявки: марка → изделие, масса и объём из таблицы (если колонки распознаны).
def grid_rows(section):
    """Раскладывает строки таблицы по сетке с учётом rowspan/colspan. Возвращает список строк-списков текстов."""
    rows = re.findall(r'<tr[^>]*>(.*?)</tr>', section, re.S)
    grid, nrows = {}, len(rows)
    for ri, row in enumerate(rows):
        col = 0
        for attrs, txt in re.findall(r'<t[hd]([^>]*)>(.*?)</t[hd]>', row, re.S):
            while (ri, col) in grid:
                col += 1
            rs = int((re.search(r'rowspan="(\d+)"', attrs) or [0, 1])[1])
            cs = int((re.search(r'colspan="(\d+)"', attrs) or [0, 1])[1])
            text = html.unescape(re.sub(r'<[^>]+>', '', txt)).strip()
            for r in range(rs):
                for c_ in range(cs):
                    grid[(ri + r, col + c_)] = text
            col += cs
    ncols = max((k[1] for k in grid), default=-1) + 1
    return [[grid.get((r, c_), '') for c_ in range(ncols)] for r in range(nrows)]


def num(s):
    m = re.search(r'\d+(?:[.,]\d+)?', s or '')
    return float(m.group(0).replace(',', '.')) if m else None


marks = []
for c in cats:
    for g in c['groups']:
        for it in g['items']:
            for t in it['tables']:
                thead = re.search(r'<thead>(.*?)</thead>', t, re.S)
                tbody = re.search(r'<tbody>(.*?)</tbody>', t, re.S)
                heads = grid_rows(thead.group(1))[-1] if thead else []
                wi = next((i for i, h in enumerate(heads) if re.search(r'вес|масса', h, re.I)), None)
                vi = next((i for i, h in enumerate(heads) if re.search(r'объ[её]м', h, re.I)), None)
                for cells in grid_rows(tbody.group(1) if tbody else t):
                    if not cells or not re.match(r'^\d?[А-ЯA-Z]{1,5}[\s\d]', cells[0]):
                        continue
                    mark = cells[0].rstrip('-')
                    rec = {'m': mark, 'i': it['title'], 'g': g['title'],
                           'u': f"{it['path']}#{re.sub(r'[^0-9A-Za-zА-Яа-я]+', '-', cells[0]).strip('-')}"}
                    if len(cells) == len(heads):
                        w = num(cells[wi]) if wi is not None else None
                        v = num(cells[vi]) if vi is not None else None
                        if w and 0.01 <= w <= 60: rec['w'] = w      # тонны
                        if v and 0.001 <= v <= 30: rec['v'] = v     # м³
                    marks.append(rec)
(OUT.parents[2] / 'public' / 'marks.json').write_text(json.dumps(marks, ensure_ascii=False))
print(len(marks), 'марок в индексе,', sum('w' in m for m in marks), 'с массой,', sum('v' in m for m in marks), 'с объёмом')
