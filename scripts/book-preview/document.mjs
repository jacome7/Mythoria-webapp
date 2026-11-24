function escapeHtml(value) {
  return value.replace(
    /[&<>]/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[character],
  );
}

function renderTranscript(page, text) {
  return `<section><h2>Página ${page}</h2><div class="page-text">${escapeHtml(text)}</div></section>`;
}

export function renderDocument({ title, leftText, rightText }) {
  const escapedTitle = escapeHtml(title);
  return `<!doctype html>
<html lang="pt-PT">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${escapedTitle}</title>
    <link rel="stylesheet" href="./style.css">
    <script type="module" src="./reader.js"></script>
  </head>
  <body>
    <main class="reader">
      <h1>${escapedTitle}</h1>
      <div class="book" id="book">
        <div class="leaf leaf-opening" id="specification" aria-hidden="true" inert>
          <iframe src="./spec.html" title="Ficha técnica" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>
        </div>
        <div class="leaf"><img src="./left.png" alt="" draggable="false"></div>
        <div class="leaf"><img src="./right.png" alt="" draggable="false"></div>
      </div>
      <nav class="page-controls" id="page-controls" aria-label="Navegação do livro" hidden>
        <button type="button" id="previous"><span aria-hidden="true">←</span> Anterior</button>
        <span id="position" role="status"></span>
        <button type="button" id="next">Seguinte <span aria-hidden="true">→</span></button>
      </nav>
      <a class="specification-link" id="specification-link" href="./spec.html" target="_blank" rel="noopener" hidden>Abrir ficha técnica</a>
      <details class="transcript">
        <summary>Transcrição</summary>
        ${renderTranscript(6, leftText)}
        ${renderTranscript(7, rightText)}
      </details>
    </main>
  </body>
</html>`;
}
