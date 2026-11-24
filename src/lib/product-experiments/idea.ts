// This text belongs to the user's wizard draft. Only store it in the current tab.
export function canStartMobileIdea() {
  try {
    return (
      !localStorage.getItem('currentStoryId') &&
      !localStorage.getItem('isEditMode') &&
      !sessionStorage.getItem('step2Data') &&
      !sessionStorage.getItem('storyTemplateJourney') &&
      !sessionStorage.getItem('step2Submission') &&
      !sessionStorage.getItem('experimentalStep2Submission') &&
      !Object.keys(sessionStorage).some((key) => key.startsWith('storyWhispererDraft:')) &&
      !Object.keys(localStorage).some((key) => key.startsWith('lastStoryWhispererDraft:'))
    );
  } catch {
    return false;
  }
}

export function startMobileIdea(text: string) {
  if (!text.trim() || !canStartMobileIdea()) return false;
  try {
    sessionStorage.setItem(
      'step2Data',
      JSON.stringify({
        text: text.trim(),
        images: [],
        audio: null,
        selectedCharacterIds: [],
        lastSaved: Date.now(),
      }),
    );
    return true;
  } catch {
    return false;
  }
}
