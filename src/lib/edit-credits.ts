/**
 * Shared utility functions for AI edit credit management
 */
import { aiEditService, creditService } from '@/db/services';

export interface EditCreditResult {
  success: boolean;
  canEdit: boolean;
  requiredCredits: number;
  currentBalance: number;
  editCount: number;
  message?: string;
  error?: string;
}

/**
 * Check if user can perform an AI edit and get credit information
 */
export async function checkEditCredits(
  authorId: string,
  action: 'textEdit' | 'imageEdit',
  locale?: string,
): Promise<EditCreditResult> {
  void locale;
  try {
    const permission = await aiEditService.checkEditPermission(authorId, action);

    return {
      success: true,
      canEdit: permission.canEdit,
      requiredCredits: permission.requiredCredits,
      currentBalance: permission.currentBalance,
      editCount: permission.editCount,
      message: permission.message,
    };
  } catch (error) {
    console.error(`Error checking edit credits for ${action}:`, error);
    return {
      success: false,
      canEdit: false,
      requiredCredits: 0,
      currentBalance: 0,
      editCount: 0,
      error: error instanceof Error ? error.message : 'Failed to check edit credits',
    };
  }
}

/**
 * Record a successful AI edit and deduct credits if required
 */
export async function recordEditAndDeductCredits(
  authorId: string,
  storyId: string,
  action: 'textEdit' | 'imageEdit',
  metadata?: Record<string, unknown>,
  locale?: string,
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  void locale;
  try {
    // This function handles both credit deduction and edit recording
    await aiEditService.recordSuccessfulEdit(authorId, storyId, action, metadata);

    // Get the updated balance to return
    const newBalance = await creditService.getAuthorCreditBalance(authorId);

    return {
      success: true,
      newBalance,
    };
  } catch (error) {
    console.error(`Error recording edit and deducting credits for ${action}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record edit and deduct credits',
    };
  }
}

/**
 * Get user-friendly message for edit count status
 */
export async function getEditCountMessage(
  action: 'textEdit' | 'imageEdit',
  editCount: number,
  requiredCredits: number,
  locale?: string,
): Promise<string> {
  void locale;
  if (action === 'textEdit') {
    if (editCount < 5) {
      const remaining = 5 - editCount;
      return remaining === 1 ? '1 free edit remaining' : `${remaining} free edits remaining`;
    } else {
      const nextChargeAt = Math.ceil((editCount - 4) / 5) * 5 + 5;
      const editsUntilCharge = nextChargeAt - editCount;
      if (editsUntilCharge > 1) {
        const remaining = editsUntilCharge - 1;
        return remaining === 1 ? '1 free edit remaining' : `${remaining} free edits remaining`;
      } else if (requiredCredits > 0) {
        return requiredCredits === 1
          ? 'Next edit will cost 1 credit'
          : `Next edit will cost ${requiredCredits} credits`;
      }
    }
  } else if (action === 'imageEdit') {
    if (editCount === 0) {
      return '1 free edit remaining';
    } else if (requiredCredits > 0) {
      return requiredCredits === 1
        ? 'Next edit will cost 1 credit'
        : `Next edit will cost ${requiredCredits} credits`;
    }
  }

  return '';
}
