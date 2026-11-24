# Local book preview

Run the standalone reader from the Web App checkout using Node 24.

```powershell
npm --prefix scripts/book-preview ci
node scripts/book-preview/server.mjs --assets-dir 'C:/path/to/private-preview' --port 4173
```

Open the full URL printed in the terminal. Each run generates a new URL. The server binds to `127.0.0.1` and serves the preview to browsers on that computer, including phone-sized browser viewports. Stop it with `Ctrl+C`.

Keep the specification document and its assets together with the spread in a private folder outside the checkout. The runner takes a snapshot of those files at startup. Restart it after replacing the files.

| File                           | Content                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| `spec.html`                    | The story workflow's exported page 2 document with selectable text |
| `spec-logo.png`, `spec-qr.png` | The logo and QR code referenced by page 2                          |
| `left.png`                     | Page 6, on the left of the desktop spread                          |
| `right.png`                    | Page 7, on the right of the desktop spread                         |
| `preview.json`                 | The title and exact story text for pages 6 and 7                   |

```json
{
  "title": "Book title",
  "leftText": "Exact page 6 text",
  "rightText": "Exact page 7 text"
}
```

The reader opens on pages 6 and 7 on desktop and on page 6 on mobile. Use the arrow buttons, arrow keys when the controls have focus, or a touch swipe on an illustration to turn the page. The previous turn opens page 2, where **Abrir ficha técnica** opens the selectable specification in its own tab. The transcript is available below the illustrations and preserves the text and line breaks from `preview.json`.
