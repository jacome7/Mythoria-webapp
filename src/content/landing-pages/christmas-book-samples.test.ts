import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { christmasBookSamples } from './christmas-book-samples';

describe.each(['pt-PT', 'es-ES'] as const)('Christmas book samples in %s', (locale) => {
  it('serves the complete boat book and matches each illustrated preview to its public pack', () => {
    const [boat, ...previews] = christmasBookSamples(locale);
    const publicDir = join(process.cwd(), 'public');
    expect(boat.id).toBe('ines');
    expect(boat.fullBookPdf?.label).toBe(
      locale === 'pt-PT' ? 'Ler o livro completo' : 'Leer el libro completo',
    );
    expect(existsSync(join(publicDir, boat.fullBookPdf!.href))).toBe(true);
    expect(previews.map((book) => book.id)).toEqual(['carta', 'teatro', 'telhado', 'noticia']);

    for (const book of previews) {
      const folder = join(publicDir, 'sample-books', book.slug!);
      const chapter = book.sampleChapter!;
      const markdown = readFileSync(join(folder, 'sample-chapter.md'), 'utf8').replaceAll(
        '\r\n',
        '\n',
      );
      expect(markdown.split(`\n# ${chapter.title}\n\n`)[1]?.trim()).toBe(
        chapter.paragraphs.join('\n\n'),
      );
      expect(existsSync(join(publicDir, chapter.imageSrc))).toBe(true);
      expect(existsSync(join(publicDir, book.imageSrc))).toBe(true);
      expect(existsSync(join(publicDir, book.audioSampleSrc!))).toBe(true);
      const audio = JSON.parse(readFileSync(join(folder, 'audio-sample.json'), 'utf8'));
      expect(audio).toMatchObject({
        language: locale,
        status: 'generated',
        text: book.audioSampleTranscript,
      });
      const edition = JSON.parse(readFileSync(join(folder, 'book.json'), 'utf8'));
      const manifest = JSON.parse(readFileSync(join(folder, 'manifest.json'), 'utf8'));
      expect(manifest).toMatchObject({
        language: locale,
        slug: book.slug,
        title: book.title,
        riskRating: 'yellow',
        sensitiveNiche: true,
        requiresHumanApproval: true,
      });
      expect(edition.language).toBe(locale);
      expect(markdown.split('\n')).toContain(`language: ${locale}`);
      expect(edition.safetyNotes.length).toBeGreaterThanOrEqual(3);
      const words = chapter.paragraphs.join(' ').trim().split(/\s+/u).length;
      if (book.id === 'carta') {
        expect(edition).toMatchObject({
          sampleFormat: 'read_aloud_opening',
          targetAudience: 'children_3-6',
        });
        expect(words).toBeGreaterThan(0);
        expect(words).toBeLessThan(600);
      } else {
        expect(edition.sampleFormat).toBe('chapter_opening');
        expect(words).toBeGreaterThanOrEqual(600);
        expect(words).toBeLessThanOrEqual(900);
      }
      expect(audio.generatedAt).toBeTruthy();
      expect(audio.durationSeconds).toBeGreaterThanOrEqual(30);
      expect(audio.durationSeconds).toBeLessThanOrEqual(60);
      const prompts = JSON.parse(readFileSync(join(folder, 'image-prompts.json'), 'utf8'));
      for (const [kind, asset] of [
        ['cover', edition.coverImage],
        ['feature', edition.featureImage],
        ['chapter', edition.sampleChapterImage],
      ]) {
        const prompt = prompts[kind];
        expect(prompt).toMatchObject({ status: 'generated', targetPath: asset.localPath });
        expect(prompt.model).toBeTruthy();
        expect(prompt.productionNotes).toBeTruthy();
        expect(statSync(join(folder, prompt.targetPath)).size).toBeGreaterThan(0);
        expect(statSync(join(folder, prompt.promptPath)).size).toBeGreaterThan(0);
      }
    }
  });
});
