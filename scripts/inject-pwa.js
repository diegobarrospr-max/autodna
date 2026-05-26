// Pos-build: injeta tags PWA no dist/index.html gerado pelo expo export.
// Inclui manifest, theme-color, ícones Apple e bootstrap do service worker.

const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, '..', 'dist');
const HTML = path.join(DIST, 'index.html');

if (!fs.existsSync(HTML)) {
  console.error(`[inject-pwa] dist/index.html não encontrado em ${HTML}`);
  process.exit(1);
}

const PWA_TAGS = `
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="theme-color" content="#1f54f5" />
    <meta name="description" content="Encontre o carro que combina com você e descubra o custo real por mês." />
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
    <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="AutoDNA" />
    <meta name="mobile-web-app-capable" content="yes" />
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').catch(function (e) {
            console.warn('SW register failed', e);
          });
        });
      }
    </script>`;

let html = fs.readFileSync(HTML, 'utf8');

// Force viewport-fit=cover so iOS Safari (especially standalone PWA) exposes
// non-zero env(safe-area-inset-*) values for our safe-area-context.
html = html.replace(
  /<meta\s+name="viewport"[^>]*\/?>/i,
  '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />',
);

if (html.includes('<link rel="manifest"')) {
  console.log('[inject-pwa] PWA tags já presentes — skip injection (mas viewport pode ter sido atualizado)');
  fs.writeFileSync(HTML, html);
  process.exit(0);
}

html = html.replace('</head>', `${PWA_TAGS}\n  </head>`);
fs.writeFileSync(HTML, html);
console.log('[inject-pwa] PWA tags injetadas em dist/index.html');
