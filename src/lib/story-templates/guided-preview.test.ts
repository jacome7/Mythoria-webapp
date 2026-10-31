import { getStoryTemplates } from './catalog';
import { firstPreviewQuestion } from './guided-preview';

describe('firstPreviewQuestion', () => {
  it.each(['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'])(
    'provides stable, distinct authored questions for each supported template mode in %s',
    (locale) => {
      const templates = getStoryTemplates(locale);
      expect(templates).toHaveLength(8);
      const ids = new Set<string>();
      for (const template of templates) {
        for (const mode of template.modes) {
          const question = firstPreviewQuestion(template, mode, locale);
          expect(question.id).toBe(`preview-protagonist-${template.id}-${mode}`);
          expect(ids.has(question.id)).toBe(false);
          ids.add(question.id);
          expect(question.photoTarget).toBe('protagonist');
          expect(question.text).toBeTruthy();
          if (mode === 'memory') {
            expect(question.customOnly).toBe(true);
            expect(question.choices).toEqual([]);
            expect(question.suggestedChoiceId).toBeNull();
          } else {
            expect(question.choices).toHaveLength(3);
            expect(new Set(question.choices.map((choice) => choice.id)).size).toBe(3);
            expect(
              question.choices.some((choice) => choice.id === question.suggestedChoiceId),
            ).toBe(true);
          }
        }
      }
    },
  );
});
