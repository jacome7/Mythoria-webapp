import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExperimentalFeaturesSettings from './ExperimentalFeaturesSettings';

const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

describe('ExperimentalFeaturesSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('saves only the preference, disables while pending, and refreshes', async () => {
    let resolve!: (value: { ok: boolean }) => void;
    global.fetch = jest.fn(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    ) as jest.Mock;
    render(<ExperimentalFeaturesSettings initialValue={false} />);
    const toggle = screen.getByRole('checkbox');
    fireEvent.click(toggle);
    expect(toggle).toBeDisabled();
    expect(fetch).toHaveBeenCalledWith(
      '/api/profile',
      expect.objectContaining({ body: JSON.stringify({ experimentalFeaturesEnabled: true }) }),
    );
    resolve({ ok: true });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(toggle).toBeChecked();
  });
  it('restores the previous value on an HTTP error', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    render(<ExperimentalFeaturesSettings initialValue={true} />);
    const toggle = screen.getByRole('checkbox');
    fireEvent.click(toggle);
    await screen.findByRole('alert');
    expect(toggle).toBeChecked();
    expect(refresh).not.toHaveBeenCalled();
  });
  it('disables the control when the preference could not be loaded', () => {
    render(<ExperimentalFeaturesSettings initialValue={null} />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('loadFailed');
  });
});
