/**
 * Shared utility functions for AI edit credit management
 */
import { aiEditService, creditService } from '@/db/services';
import { getLibTranslations } from '@/utils/lib-translations';

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
  locale?: string
): Promise<EditCreditResult> {
  try {
    const permission = await aiEditService.checkEditPermission(authorId, action);
    
    return {
      success: true,
      canEdit: permission.canEdit,
      requiredCredits: permission.requiredCredits,
      currentBalance: permission.currentBalance,
      editCount: permission.editCount,
      message: permission.message
    };
  } catch (error) {
    console.error(`Error checking edit credits for ${action}:`, error);
    const { t } = await getLibTranslations(locale);
    return {
      success: false,
      canEdit: false,
      requiredCredits: 0,
      currentBalance: 0,
      editCount: 0,
      error: error instanceof Error ? error.message : t('editCredits.errors.failedToCheck')
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
  locale?: string
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  try {
    // This function handles both credit deduction and edit recording
    await aiEditService.recordSuccessfulEdit(authorId, storyId, action, metadata);
    
    // Get the updated balance to return
    const newBalance = await creditService.getAuthorCreditBalance(authorId);
    
    return {
      success: true,
      newBalance
    };
  } catch (error) {
    console.error(`Error recording edit and deducting credits for ${action}:`, error);
    const { t } = await getLibTranslations(locale);
    return {
      success: false,
      error: error instanceof Error ? error.message : t('editCredits.errors.failedToRecord')
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
  locale?: string
): Promise<string> {
  const { t } = await getLibTranslations(locale);
  
  if (action === 'textEdit') {
    if (editCount < 5) {
      const remaining = 5 - editCount;
      const key = remaining === 1 ? 'editCredits.messages.freeEditsRemaining' : 'editCredits.messages.freeEditsRemainingPlural';
      return t(key, { count: remaining.toString() });
    } else {
      const nextChargeAt = Math.ceil((editCount - 4) / 5) * 5 + 5;
      const editsUntilCharge = nextChargeAt - editCount;
      if (editsUntilCharge > 1) {
        const remaining = editsUntilCharge - 1;
        const key = remaining === 1 ? 'editCredits.messages.freeEditsRemaining' : 'editCredits.messages.freeEditsRemainingPlural';
        return t(key, { count: remaining.toString() });
      } else if (requiredCredits > 0) {
        const key = requiredCredits === 1 ? 'editCredits.messages.nextEditCost' : 'editCredits.messages.nextEditCostPlural';
        return t(key, { credits: requiredCredits.toString() });
      }
    }
  } else if (action === 'imageEdit') {
    if (editCount === 0) {
      return t('editCredits.messages.oneFreeEditRemaining');
    } else if (requiredCredits > 0) {
      const key = requiredCredits === 1 ? 'editCredits.messages.nextEditCost' : 'editCredits.messages.nextEditCostPlural';
      return t(key, { credits: requiredCredits.toString() });
    }
  }
  
  return '';
}
