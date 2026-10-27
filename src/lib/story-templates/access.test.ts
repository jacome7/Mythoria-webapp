jest.mock('server-only', () => ({}));
const mockAuth = jest.fn();
const mockSelect = jest.fn();
const mockLimit = jest.fn();
jest.mock('@clerk/nextjs/server', () => ({ auth: () => mockAuth() }));
jest.mock('@/db', () => ({ db: { select: (...args: unknown[]) => mockSelect(...args) } }));
import { getStoryTemplateAccess } from './access';

const previous = process.env.STORY_TEMPLATES_ENABLED;
beforeEach(() => {
  jest.clearAllMocks();
  process.env.STORY_TEMPLATES_ENABLED = 'true';
  mockAuth.mockResolvedValue({ userId: 'owner-one' });
  mockSelect.mockReturnValue({ from: () => ({ where: () => ({ limit: mockLimit }) }) });
  mockLimit.mockResolvedValue([{ experimentalFeaturesEnabled: false }]);
});
afterAll(() => {
  if (previous === undefined) delete process.env.STORY_TEMPLATES_ENABLED;
  else process.env.STORY_TEMPLATES_ENABLED = previous;
});

it('does not read authentication or the database when globally disabled', async () => {
  process.env.STORY_TEMPLATES_ENABLED = 'false';
  expect(await getStoryTemplateAccess()).toBe(false);
  expect(mockAuth).not.toHaveBeenCalled();
  expect(mockSelect).not.toHaveBeenCalled();
});
it('does not read a profile for guests', async () => {
  mockAuth.mockResolvedValue({ userId: null });
  expect(await getStoryTemplateAccess()).toBe(false);
  expect(mockSelect).not.toHaveBeenCalled();
});
it.each([{ rows: [] }, { rows: [{}] }, { rows: [{ experimentalFeaturesEnabled: false }] }])(
  'denies missing and disabled preferences %p',
  async ({ rows }) => {
    mockLimit.mockResolvedValue(rows);
    expect(await getStoryTemplateAccess()).toBe(false);
  },
);
it('never caches eligibility across different users or requests', async () => {
  mockLimit
    .mockResolvedValueOnce([{ experimentalFeaturesEnabled: true }])
    .mockResolvedValueOnce([{ experimentalFeaturesEnabled: false }]);
  expect(await getStoryTemplateAccess()).toBe(true);
  mockAuth.mockResolvedValue({ userId: 'owner-two' });
  expect(await getStoryTemplateAccess()).toBe(false);
  expect(mockSelect).toHaveBeenCalledTimes(2);
});
it('fails closed without preventing public content on a database or authentication failure', async () => {
  mockLimit.mockRejectedValueOnce(new Error('database unavailable'));
  expect(await getStoryTemplateAccess()).toBe(false);
  mockAuth.mockRejectedValueOnce(new Error('authentication unavailable'));
  expect(await getStoryTemplateAccess()).toBe(false);
});
