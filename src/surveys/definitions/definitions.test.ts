import { validateSurveyDefinition } from '@/lib/surveys/validate-definition';
import { SURVEY_DEFINITIONS } from './index';

describe('registered survey definitions', () => {
  it('registers at least one definition', () => {
    expect(SURVEY_DEFINITIONS.length).toBeGreaterThan(0);
  });

  it.each(SURVEY_DEFINITIONS.map((d) => [`${d.id}@v${d.version}`, d] as const))(
    '%s passes validateSurveyDefinition',
    (_label, definition) => {
      const result = validateSurveyDefinition(definition);
      expect(result.ok ? [] : result.errors).toEqual([]);
    },
  );

  it('has unique (id, version) pairs', () => {
    const keys = SURVEY_DEFINITIONS.map((d) => `${d.id}@${d.version}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
