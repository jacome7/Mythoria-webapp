// Isolated welcome email trigger for testability
export interface WelcomeEmailParams {
  authorId: string;
  email: string;
  name: string;
  locale: string;
}

export async function triggerWelcomeEmailSafe(params: WelcomeEmailParams) {
  try {
    const { notificationFetch } = await import('@/lib/notification-client');
    const { pricingService } = await import('@/db/services/pricing');
    const credits = await pricingService.getInitialAuthorCredits();
    const language = params.locale || 'en-US';
    // Pass both authorId and entityId (same value) using the internal author UUID so notification-engine can
    // dedupe on (templateId, entityId). 'entityId' is the canonical dedupe key. We also retain authorId for
    // downstream enrichment if needed.
    const body = {
      templateId: 'welcome',
      authorId: params.authorId,
      entityId: params.authorId,
      recipients: [{ email: params.email, name: params.name || undefined, language }],
      // Align variable names with template expectations (credits + creditsPlural)
      variables: {
        name: params.name || undefined,
        credits: credits,
        creditsPlural: credits !== 1,
      },
    };
    const res = await notificationFetch('/email/template', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn('Welcome email API responded non-OK', res.status, text);
    } else {
      console.log('Welcome email dispatched (template)', {
        authorId: params.authorId,
        email: params.email,
      });
    }
  } catch (err) {
    console.warn(
      'Welcome email trigger failed (ignored)',
      err instanceof Error ? err.message : err,
    );
  }
}
