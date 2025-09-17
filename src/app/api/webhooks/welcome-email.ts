// Isolated welcome email trigger for testability
export interface WelcomeEmailParams { authorId: string; email: string; name: string; locale: string; }

export async function triggerWelcomeEmailSafe(params: WelcomeEmailParams) {
  try {
    const { notificationFetch } = await import('@/lib/notification-client');
    const { pricingService } = await import('@/db/services/pricing');
    const credits = await pricingService.getInitialAuthorCredits();
    const language = params.locale || 'en-US';
    const body = {
      templateId: 'welcome',
      authorId: params.authorId,
      recipients: [ { email: params.email, name: params.name || undefined, language } ],
      variables: { name: params.name || undefined, credits, creditsPlural: credits !== 1 }
    };
    const res = await notificationFetch('/email/template', { method: 'POST', body: JSON.stringify(body) });
    if (!res.ok) {
      const text = await res.text();
      console.warn('Welcome email API responded non-OK', res.status, text);
    } else {
      console.log('Welcome email dispatched (template)', { authorId: params.authorId, email: params.email });
    }
  } catch (err) {
    console.warn('Welcome email trigger failed (ignored)', err instanceof Error ? err.message : err);
  }
}
