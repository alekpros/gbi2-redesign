import { defineConfig } from 'astro/config';

// BASE_PATH задаётся при сборке для GitHub Pages (/gbi2-redesign/), локально — корень.
const base = process.env.BASE_PATH || '/';
const to = (p) => base.replace(/\/$/, '') + p; // адреса редиректов тоже с учётом base

export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',
  base,
  trailingSlash: 'always',
  build: { format: 'directory' },
  // Старые адреса новостей и газеты ведут в новый раздел
  redirects: {
    '/about/events/': to('/life/'),
    '/about/newspaper/': to('/life/#newspaper'),
    '/about/events/bank-dom-rf-i-sz-zhbi-zhilstroy-zaklyuchili-soglashenie-o-predostavlenii-proektnogo-finansirovaniya/': to('/life/'),
    '/about/events/pervuyu-nagradu-dlya-stroiteley-poluchil-generalnyy-direktor/': to('/life/doska-pocheta-2026/'),
    '/about/events/u-nas-vyshli-esche-2-nomera-gazety/': to('/life/'),
    '/about/events/uvazhaemye-druzya-rady-soobschit-vam-chto-u-nas-poyavilas-ezhemesyachnaya-gazeta-nash-zavod/': to('/life/'),
    '/about/events/voronezhskiy-zavod-zhbi-2-nachnet-proizvodstvo-novyh-dlya-mestnogo-rynka-stroitelnyh-izdeliy/': to('/life/'),
    '/about/events/voronezhskiy-zavod-zhbi-2-postavit-izdeliya-dlya-stroitelstva-krupnyh-zhivotnovodcheskih-kompleksov/': to('/life/'),
  },
});
