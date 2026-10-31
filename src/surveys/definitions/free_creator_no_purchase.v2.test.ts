import { getVisibleQuestions } from '@/lib/surveys/engine';
import type { SurveyAnswers, SurveyDefinition } from '@/lib/surveys/definition-schema';
import { freeCreatorNoPurchaseV2 } from './free_creator_no_purchase.v2';

const def = freeCreatorNoPurchaseV2 as unknown as SurveyDefinition;
const pick = (...optionIds: string[]) => ({ kind: 'choice' as const, optionIds });
const shown = (answers: SurveyAnswers) => getVisibleQuestions(def, answers).map((q) => q.id);

describe('C2 v2 branching', () => {
  it('readers get B03, B04 and B05, never B04N', () => {
    const ids = shown({ B02: pick('complete'), B03: pick('4'), B04: pick('online_enough') });
    expect(ids).toEqual(expect.arrayContaining(['B03', 'B04', 'B05']));
    expect(ids).not.toContain('B04N');
    expect(ids).not.toContain('B04B');
  });

  it('non-readers skip B03/B05 and get the alternate B04N', () => {
    const ids = shown({ B02: pick('not_yet') });
    expect(ids).toContain('B04N');
    expect(ids).not.toEqual(expect.arrayContaining(['B03']));
    expect(ids).not.toContain('B04');
    expect(ids).not.toContain('B05');
  });

  it('price concern opens B04A from either variant', () => {
    expect(shown({ B02: pick('partial'), B04: pick('price_credits') })).toContain('B04A');
    expect(shown({ B02: pick('not_yet'), B04N: pick('price_unsure') })).toContain('B04A');
  });

  it('shows B04B once for a low rating or "improve first"', () => {
    const low = shown({ B02: pick('complete'), B03: pick('2'), B04: pick('online_enough') });
    expect(low.filter((id) => id === 'B04B')).toHaveLength(1);
    const both = shown({ B02: pick('complete'), B03: pick('2'), B04: pick('improve_first') });
    expect(both.filter((id) => id === 'B04B')).toHaveLength(1);
    const high = shown({ B02: pick('complete'), B03: pick('5'), B04: pick('online_enough') });
    expect(high).not.toContain('B04B');
  });

  it('format awareness opens B04C', () => {
    expect(shown({ B02: pick('complete'), B04: pick('formats_unknown') })).toContain('B04C');
  });
});
