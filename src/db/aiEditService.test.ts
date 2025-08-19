jest.mock('@/db', () => ({ db: { insert: jest.fn() } }));
import { aiEditService, creditService } from '@/db/services';
import { db } from '@/db';
import { aiEdits } from '@/db/schema';

describe('aiEditService.checkEditPermission', () => {
  it('allows free text edits before threshold', async () => {
    jest.spyOn(aiEditService, 'calculateRequiredCredits').mockResolvedValue(0);
    jest.spyOn(aiEditService, 'getEditCount').mockResolvedValue(3);
    jest.spyOn(creditService, 'getAuthorCreditBalance').mockResolvedValue(10);

    const result = await aiEditService.checkEditPermission('author', 'textEdit');
    expect(result).toMatchObject({
      canEdit: true,
      requiredCredits: 0,
      editCount: 3,
      nextThreshold: 5,
      isFree: true,
      message: '2 free edits remaining',
    });
  });
});

describe('aiEditService.recordSuccessfulEdit', () => {
  it('deducts credits when required and records edit', async () => {
    jest.spyOn(aiEditService, 'calculateRequiredCredits').mockResolvedValue(2);
    const deductSpy = jest
      .spyOn(creditService, 'deductCredits')
      .mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof creditService.deductCredits>>,
      );
    const values = jest.fn().mockResolvedValue([]);
    (db.insert as jest.Mock).mockReturnValue({ values });

    await aiEditService.recordSuccessfulEdit('author', 'story', 'textEdit');

    expect(deductSpy).toHaveBeenCalledWith('author', 2, 'textEdit', 'story');
    expect(db.insert).toHaveBeenCalledWith(aiEdits);
    expect(values).toHaveBeenCalledWith({
      authorId: 'author',
      storyId: 'story',
      action: 'textEdit',
      metadata: undefined,
    });
  });
});
