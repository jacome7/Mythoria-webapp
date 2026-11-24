import {
  buildCreationObservation,
  creationObservation,
  type CreationObservation,
} from './creation';

const base = {
  entryKind: 'wizard' as const,
  text: false,
  document: false,
  photo: false,
  audio: false,
  guide: false,
};
const cases = [
  ['typed flow', { ...base, firstOption: 'text', text: true }, ['text'], 'freeform'],
  ['audio upload', { ...base, firstOption: 'audio', audio: true }, ['audio'], 'freeform'],
  ['live Guide', { ...base, firstOption: 'guide', guide: true }, ['guide'], 'guide'],
  [
    'photo plus text',
    { ...base, firstOption: 'photo', photo: true, text: true },
    ['text', 'photo'],
    'freeform',
  ],
  ['undone import', { ...base, firstOption: 'document', text: true }, ['text'], 'freeform'],
  [
    'zero-answer template',
    { ...base, firstOption: 'template', templateAnswerCount: 0 },
    [],
    'template',
  ],
  [
    'direct template',
    {
      ...base,
      firstOption: 'no_observed_open',
      entryKind: 'direct_template',
      templateAnswerCount: 1,
    },
    ['template_answer'],
    'template',
  ],
  [
    'legacy draft',
    { ...base, firstOption: 'unknown', entryKind: 'legacy', text: true },
    ['text'],
    'freeform',
  ],
] as const;

test.each(cases)(
  'captures the first open, retained sources and final route for %s',
  (_, fixture, kinds, route) => {
    const observed = buildCreationObservation(fixture);
    expect(creationObservation.parse(observed)).toEqual(
      expect.objectContaining<Partial<CreationObservation>>({
        firstOption: fixture.firstOption,
        entryKind: fixture.entryKind,
        inputKinds: [...kinds],
        creationRoute: route,
      }),
    );
    if ('templateAnswerCount' in fixture)
      expect(observed.templateAnswerCount).toBe(fixture.templateAnswerCount);
  },
);
