import {
  CONSENT_CHOICE_REQUIRED_EVENT,
  clearConsent,
  consentStateFromPreferences,
  ensureConsentChoice,
  getDefaultConsent,
  getStoredConsent,
  saveConsent,
} from './consent';

describe('versioned consent', () => {
  beforeEach(() => clearConsent());

  it('migrates the legacy cookie format when reading it', () => {
    document.cookie = `mythoria_consent=${encodeURIComponent(
      JSON.stringify({ state: getDefaultConsent(), timestamp: Date.now() }),
    )}; path=/`;

    expect(getStoredConsent()).toMatchObject({
      state: getDefaultConsent(),
      preferences: { analytics: false, advertising: false },
    });
  });

  it('stores independent analytics and advertising preferences in version 2', () => {
    const state = consentStateFromPreferences({ analytics: true, advertising: false });
    saveConsent(state, { analytics: true, advertising: false });

    expect(getStoredConsent()).toMatchObject({
      version: 2,
      state,
      preferences: { analytics: true, advertising: false },
    });
  });

  it('resumes a gated action after an explicit rejection', async () => {
    jest.useFakeTimers();
    const denied = getDefaultConsent();
    const listener = (event: Event) => {
      (event as CustomEvent<{ resolve: (state: typeof denied) => void }>).detail.resolve(denied);
    };
    window.addEventListener(CONSENT_CHOICE_REQUIRED_EVENT, listener);

    const choice = ensureConsentChoice();
    jest.runAllTimers();
    await expect(choice).resolves.toEqual(denied);

    window.removeEventListener(CONSENT_CHOICE_REQUIRED_EVENT, listener);
    jest.useRealTimers();
  });
});
