import { readinessRevisionChanged } from '@/lib/story-whisperer/types';
import { assessReadiness } from './api';

describe('assessReadiness', () => {
  const originalFetch = global.fetch;
  const fetchReadiness = jest.fn();

  beforeEach(() => {
    fetchReadiness.mockReset();
    global.fetch = fetchReadiness;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('signals that concurrent transcript edits invalidated the readiness snapshot', async () => {
    fetchReadiness.mockResolvedValue(
      new Response(JSON.stringify({ code: readinessRevisionChanged }), { status: 409 }),
    );

    await expect(assessReadiness('draft', 'project')).resolves.toBe(false);
    expect(fetchReadiness).toHaveBeenCalledWith('/api/story-whisperer/draft/readiness', {
      method: 'POST',
      headers: { 'x-story-whisperer-project': 'project' },
    });
  });

  it.each([409, 500])('propagates other readiness failures (%s)', async (status) => {
    fetchReadiness.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Interview changed. Please reload.' }), { status }),
    );

    await expect(assessReadiness('draft', 'project')).rejects.toThrow(
      'Interview progress unavailable',
    );
  });
});
