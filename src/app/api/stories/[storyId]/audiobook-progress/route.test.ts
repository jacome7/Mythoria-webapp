import { GET } from './route';
import { getCurrentAuthor } from '@/lib/auth';
import { storyService } from '@/db/services';
import { db } from '@/db';

jest.mock('@/lib/auth', () => ({ getCurrentAuthor: jest.fn() }));
jest.mock('@/db/services', () => ({ storyService: { getStoryById: jest.fn() } }));
jest.mock('@/db', () => ({ db: { select: jest.fn() } }));

const request = {} as never;
const context = { params: Promise.resolve({ storyId: 'story-1' }) };
const selectMock = db.select as jest.Mock;
function rows(data: unknown[]) {
  const query = { from: jest.fn(), where: jest.fn(), orderBy: jest.fn(), limit: jest.fn() };
  query.from.mockReturnValue(query);
  query.where.mockReturnValue(query);
  query.orderBy.mockReturnValue(query);
  query.limit.mockResolvedValue(data);
  selectMock.mockReturnValue(query);
}
beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-10-31T12:00:00Z').getTime());
  (getCurrentAuthor as jest.Mock).mockResolvedValue({ authorId: 'owner' });
  (storyService.getStoryById as jest.Mock).mockResolvedValue({
    authorId: 'owner',
    audiobookStatus: 'generating',
  });
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

test('estimates from the durable request and caps overdue progress', async () => {
  rows([{ runId: 'run-1', status: 'running', queuedAt: new Date('2026-10-31T11:54:00Z') }]);
  const response = await GET(request, context);
  expect(await response.json()).toMatchObject({
    audiobookGenerationStatus: 'generating',
    audiobookGenerationCompletedPercentage: 95,
    estimatedRemainingSeconds: null,
    estimateExceeded: true,
    runId: 'run-1',
  });
  expect(response.headers.get('Cache-Control')).toBe('no-store');
});
test('uses an indeterminate estimate for legacy generation', async () => {
  rows([]);
  expect(await (await GET(request, context)).json()).toMatchObject({
    audiobookGenerationStatus: 'generating',
    audiobookGenerationCompletedPercentage: null,
    runId: null,
  });
});
test('uses elapsed time for an active request and does not mistake old audio for completion', async () => {
  (storyService.getStoryById as jest.Mock).mockResolvedValue({
    authorId: 'owner',
    audiobookStatus: 'generating',
    audiobookUri: ['old-audio'],
  });
  rows([
    {
      runId: 'run-2',
      status: 'running',
      queuedAt: new Date('2026-10-31T11:58:00Z'),
      fundingSource: 'survey_reward',
    },
  ]);
  expect(await (await GET(request, context)).json()).toMatchObject({
    audiobookGenerationStatus: 'generating',
    audiobookGenerationCompletedPercentage: 40,
    estimatedRemainingSeconds: 180,
    estimateExceeded: false,
  });
});
test('reports the latest failed request even if old audio exists', async () => {
  (storyService.getStoryById as jest.Mock).mockResolvedValue({
    authorId: 'owner',
    audiobookStatus: 'failed',
    audiobookUri: ['old-audio'],
  });
  rows([{ runId: 'run-3', status: 'failed' }]);
  expect(await (await GET(request, context)).json()).toMatchObject({
    audiobookGenerationStatus: 'failed',
    audiobookGenerationCompletedPercentage: null,
  });
});
test('rejects non-owners without reading generation requests', async () => {
  (storyService.getStoryById as jest.Mock).mockResolvedValue({ authorId: 'other' });
  expect((await GET(request, context)).status).toBe(404);
  expect(selectMock).not.toHaveBeenCalled();
});
