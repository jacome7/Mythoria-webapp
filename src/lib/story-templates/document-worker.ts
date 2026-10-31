/// <reference lib="webworker" />
export {};

type Request = { file: File };
const MAX_TEXT = 200_000;
self.onmessage = async (event: MessageEvent<Request>) => {
  const { file } = event.data;
  try {
    const name = file.name.toLowerCase();
    const data = await file.arrayBuffer();
    let text = '';
    let warning = false;
    if (name.endsWith('.txt')) {
      text = new TextDecoder('utf-8', { fatal: true }).decode(data);
      if (text.includes('\0')) throw new Error('unreadable');
    } else if (name.endsWith('.docx')) {
      const mammoth = await import('mammoth');
      text = (await mammoth.extractRawText({ arrayBuffer: data })).value;
    } else if (name.endsWith('.pdf')) {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString();
      const task = pdfjs.getDocument({ data: new Uint8Array(data) });
      const pdf = await task.promise;
      if (pdf.numPages > 100) throw new Error('tooLarge');
      const pages: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const content = await (await pdf.getPage(i)).getTextContent();
        const page = content.items
          .map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : ''))
          .join('')
          .trim();
        if (!page) warning = true;
        pages.push(page);
        if (pages.join('\n\n').length > MAX_TEXT) throw new Error('tooLarge');
      }
      text = pages.join('\n\n');
      warning = true;
      await task.destroy();
    } else throw new Error('unsupported');
    if (text.length > MAX_TEXT) throw new Error('tooLarge');
    if (!text.trim()) throw new Error('empty');
    self.postMessage({ kind: 'result', text, warning });
  } catch (error) {
    const err = error as Error;
    self.postMessage({
      kind: 'result',
      error:
        err.name === 'PasswordException'
          ? 'password'
          : ['tooLarge', 'unsupported', 'empty'].includes(err.message)
            ? err.message
            : 'unreadable',
    });
  }
};
