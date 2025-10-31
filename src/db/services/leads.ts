import { db } from '../index';
import { leads } from '../schema';
import { eq } from 'drizzle-orm';
import type { EmailStatus } from '@/types/lead';

/**
 * Lead Service
 * Handles database operations for email marketing leads
 */
export const leadService = {
  /**
   * Get a lead by UUID
   */
  async getLeadById(leadId: string) {
    try {
      const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      return lead || null;
    } catch (error) {
      console.error('[leadService.getLeadById] Error:', error);
      return null;
    }
  },

  /**
   * Get a lead by email (normalized)
   */
  async getLeadByEmail(email: string) {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const [lead] = await db.select().from(leads).where(eq(leads.email, normalizedEmail)).limit(1);
      return lead || null;
    } catch (error) {
      console.error('[leadService.getLeadByEmail] Error:', error);
      return null;
    }
  },

  /**
   * Update lead email status
   * Also updates last_updated_at timestamp
   */
  async updateLeadStatus(leadId: string, status: EmailStatus) {
    try {
      const [updated] = await db
        .update(leads)
        .set({
          emailStatus: status,
          lastUpdatedAt: new Date(),
        })
        .where(eq(leads.id, leadId))
        .returning();
      return updated || null;
    } catch (error) {
      console.error('[leadService.updateLeadStatus] Error:', error);
      return null;
    }
  },

  /**
   * Record email open event
   * Updates status to 'open' only if current status is 'sent'
   */
  async recordOpen(leadId: string) {
    try {
      const lead = await this.getLeadById(leadId);
      if (!lead) {
        console.warn('[leadService.recordOpen] Lead not found:', leadId);
        return null;
      }

      // Only update to 'open' if current status is 'sent'
      // Don't downgrade from 'click' to 'open'
      if (lead.emailStatus === 'sent') {
        return await this.updateLeadStatus(leadId, 'open');
      }

      return lead;
    } catch (error) {
      console.error('[leadService.recordOpen] Error:', error);
      return null;
    }
  },

  /**
   * Record click event
   * Updates status to 'click' if current status is 'sent' or 'open'
   */
  async recordClick(leadId: string, linkId: string) {
    try {
      const lead = await this.getLeadById(leadId);
      if (!lead) {
        console.warn('[leadService.recordClick] Lead not found:', leadId);
        return null;
      }

      // Update to 'click' if status is 'sent' or 'open'
      if (lead.emailStatus === 'sent' || lead.emailStatus === 'open') {
        return await this.updateLeadStatus(leadId, 'click');
      }

      return lead;
    } catch (error) {
      console.error('[leadService.recordClick] Error:', error);
      return null;
    }
  },

  /**
   * Unsubscribe a lead
   */
  async unsubscribe(leadId: string) {
    try {
      const lead = await this.getLeadById(leadId);
      if (!lead) {
        console.warn('[leadService.unsubscribe] Lead not found:', leadId);
        return null;
      }

      return await this.updateLeadStatus(leadId, 'unsub');
    } catch (error) {
      console.error('[leadService.unsubscribe] Error:', error);
      return null;
    }
  },

  /**
   * Record bounce event (soft or hard)
   */
  async recordBounce(leadId: string, type: 'soft' | 'hard', reason?: string) {
    try {
      const status: EmailStatus = type === 'hard' ? 'hard_bounce' : 'soft_bounce';
      const updated = await this.updateLeadStatus(leadId, status);

      if (updated) {
        console.log('[leadService.recordBounce] Bounce recorded:', {
          leadId,
          type,
          reason,
          status,
        });
      }

      return updated;
    } catch (error) {
      console.error('[leadService.recordBounce] Error:', error);
      return null;
    }
  },
};
