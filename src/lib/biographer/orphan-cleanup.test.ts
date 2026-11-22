import { orphanCandidate, shouldDeleteOrphan } from './orphan-cleanup';
const project = '659d229b-1bb2-4984-9b82-dc525b5a2b2d';
const participant = '1647cc97-eb3f-47b3-9957-57e573c34681';
const item = '93b80e49-310f-47a3-ab51-466531928cdf';
const now = new Date('2026-11-17T12:00:00Z');
describe('private media orphan candidate', () => {
  it('accepts only old project-scoped photo or audio paths', () => {
    expect(
      orphanCandidate(
        `biographer/${project}/${participant}/photos/${item}`,
        '2026-11-16T11:59:00Z',
        now,
      ),
    ).toBe(project);
    expect(
      orphanCandidate(
        `biographer/${project}/${participant}/${item}/0-${item}`,
        '2026-11-16T11:59:00Z',
        now,
      ),
    ).toBe(project);
  });
  it('rejects fresh objects, unrelated prefixes, invalid paths and invalid timestamps', () => {
    for (const [path, date] of [
      [`biographer/${project}/${participant}/photos/${item}`, '2026-11-17T11:00:00Z'],
      [`other/${project}/${participant}/photos/${item}`, '2026-01-01'],
      [`biographer/${project}/${participant}/unknown/${item}`, '2026-01-01'],
      [`biographer/${project}/${participant}/photos/${item}`, 'invalid'],
    ])
      expect(orphanCandidate(path, date, now)).toBeNull();
  });
  it('never deletes an object referenced by an asset or a segment', () => {
    const path = `biographer/${project}/${participant}/photos/${item}`;
    const old = '2026-11-16T11:59:00Z';
    expect(shouldDeleteOrphan(path, old, now, { asset: true, segment: false })).toBe(false);
    expect(shouldDeleteOrphan(path, old, now, { asset: false, segment: true })).toBe(false);
    expect(shouldDeleteOrphan(path, old, now, { asset: false, segment: false })).toBe(true);
  });
});
