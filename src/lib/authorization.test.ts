import { ensureStoryIdAccess, AccessDeniedError } from './authorization';
import { storyService } from '@/db/services';
import { db } from '@/db';

jest.mock('@/db', () => ({
  db: {
    select: jest.fn(),
  },
}));

jest.mock('@/db/services', () => ({
  storyService: {
    getStoryById: jest.fn(),
  },
}));

interface MockStory {
  storyId: string;
  authorId: string;
  title: string;
}

describe('ensureStoryIdAccess', () => {
  const mockStory: MockStory = { storyId: 's1', authorId: 'owner', title: 'Tale' };
  let selectMock: jest.Mock;
  let fromMock: jest.Mock;
  let whereMock: jest.Mock;
  let limitMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    selectMock = db.select as jest.Mock;
    fromMock = jest.fn();
    whereMock = jest.fn();
    limitMock = jest.fn();

    selectMock.mockReturnValue({ from: fromMock });
    fromMock.mockReturnValue({ where: whereMock });
    whereMock.mockReturnValue({ limit: limitMock });
    limitMock.mockResolvedValue([]);
  });

  it('allows owner', async () => {
    (storyService.getStoryById as jest.Mock).mockResolvedValue(mockStory);

    await expect(ensureStoryIdAccess('s1', 'owner')).resolves.toEqual(
      expect.objectContaining({ storyId: 's1' }),
    );
  });

  it('allows collaborator access', async () => {
    (storyService.getStoryById as jest.Mock).mockResolvedValue(mockStory);
    limitMock.mockResolvedValue([{ userId: 'other' }]);

    await expect(ensureStoryIdAccess('s1', 'other')).resolves.toEqual(
      expect.objectContaining({ storyId: 's1' }),
    );
  });

  it('denies non-owner without collaboration privileges', async () => {
    (storyService.getStoryById as jest.Mock).mockResolvedValue(mockStory);
    limitMock.mockResolvedValue([]);

    await expect(ensureStoryIdAccess('s1', 'other')).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it('hides missing story as access denied', async () => {
    (storyService.getStoryById as jest.Mock).mockResolvedValue(undefined);

    await expect(ensureStoryIdAccess('missing', 'someone')).rejects.toBeInstanceOf(
      AccessDeniedError,
    );
  });
});
