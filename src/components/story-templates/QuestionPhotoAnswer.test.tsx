import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import formalTemplateCopy from '@/messages/pt-PT/StoryTemplates.json';
import type { QuestionPhoto } from '@/lib/story-templates/journey';
import QuestionPhotoAnswer from './QuestionPhotoAnswer';

const mockUpload = jest.fn();
const mockAnalyze = jest.fn();
jest.mock('@/hooks/useMediaUpload', () => ({
  useMediaUpload: () => ({ uploadInput: mockUpload, analyzeImage: mockAnalyze }),
}));
jest.mock('next-intl', () => ({
  useLocale: () => 'pt-PT',
  useTranslations: () => (key: string) => {
    const value = (formalTemplateCopy as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : key;
  },
}));
jest.mock('next/image', () => ({ __esModule: true, default: () => <span /> }));

const uploaded = { objectPath: 'inputs/photo.jpg', publicUrl: 'https://example.com/photo.jpg' };
const file = (name = 'photo.jpg') => new File(['photo'], name, { type: 'image/jpeg' });
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

let latest: QuestionPhoto | undefined;
const onChange = jest.fn();
function Harness() {
  const [value, setValue] = useState<QuestionPhoto>();
  return (
    <QuestionPhotoAnswer
      value={value}
      onChange={(next) => {
        latest = next;
        onChange(next);
        setValue(next);
      }}
    />
  );
}
function selectFile(name?: string) {
  fireEvent.change(screen.getByLabelText(formalTemplateCopy.photoAnswerLabel), {
    target: { files: [file(name)] },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  latest = undefined;
  mockUpload.mockResolvedValue(uploaded);
});

test('automatically selects the only subject', async () => {
  mockAnalyze.mockResolvedValue({ overallImageContent: 'photo', characters: [{ label: 'Ana' }] });
  render(<Harness />);
  selectFile();
  await waitFor(() => expect(latest?.status).toBe('done'));
  expect(latest?.sourceCharacterIndex).toBe(0);
  expect(mockUpload).toHaveBeenCalledWith('image', expect.any(File));
  expect(mockAnalyze).toHaveBeenCalledWith(uploaded.objectPath, 'pt-PT');
});

test('requires an explicit choice for multiple subjects', async () => {
  mockAnalyze.mockResolvedValue({
    overallImageContent: 'photo',
    characters: [{ label: 'Ana' }, { label: 'Bento' }],
  });
  render(<Harness />);
  selectFile();
  const second = await screen.findByRole('radio', { name: '2. Bento' });
  expect(latest?.sourceCharacterIndex).toBeUndefined();
  expect(second).not.toBeChecked();
  fireEvent.click(second);
  expect(latest?.sourceCharacterIndex).toBe(1);
});

test.each([
  { overallImageContent: 'drawing', characters: [{ label: 'Ana' }] },
  { overallImageContent: 'photo', characters: [] },
])('rejects non-photo or subject-free analysis', async (metadata) => {
  mockAnalyze.mockResolvedValue(metadata);
  render(<Harness />);
  selectFile();
  expect(await screen.findByRole('alert')).toHaveTextContent(formalTemplateCopy.photoNoSubject);
  expect(latest?.metadata?.characters).toEqual([]);
  fireEvent.click(screen.getByRole('button', { name: formalTemplateCopy.photoRemove }));
  expect(latest).toBeUndefined();
});

test('allows replacement after an upload failure', async () => {
  mockUpload.mockRejectedValueOnce(new Error('upload'));
  mockAnalyze.mockResolvedValue({ overallImageContent: 'photo', characters: [{ label: 'Ana' }] });
  render(<Harness />);
  selectFile();
  expect(await screen.findByRole('alert')).toHaveTextContent(formalTemplateCopy.photoError);
  selectFile('retry.jpg');
  await waitFor(() => expect(latest?.status).toBe('done'));
});

test('retries failed analysis without uploading again', async () => {
  mockAnalyze
    .mockRejectedValueOnce(new Error('analysis'))
    .mockResolvedValueOnce({ overallImageContent: 'photo', characters: [{ label: 'Ana' }] });
  render(<Harness />);
  selectFile();
  expect(await screen.findByRole('alert')).toHaveTextContent(formalTemplateCopy.photoError);
  fireEvent.click(screen.getByRole('button', { name: formalTemplateCopy.photoRetry }));
  await waitFor(() => expect(latest?.status).toBe('done'));
  expect(mockUpload).toHaveBeenCalledTimes(1);
  expect(mockAnalyze).toHaveBeenCalledTimes(2);
});

test.each(['remove', 'unmount', 'new file'] as const)(
  'ignores an obsolete analysis after %s',
  async (action) => {
    const pending = deferred<{ overallImageContent: string; characters: { label: string }[] }>();
    mockAnalyze
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue({ overallImageContent: 'photo', characters: [{ label: 'New' }] });
    const view = render(<Harness />);
    selectFile();
    await waitFor(() => expect(mockAnalyze).toHaveBeenCalledTimes(1));
    if (action === 'remove')
      fireEvent.click(screen.getByRole('button', { name: formalTemplateCopy.photoRemove }));
    if (action === 'unmount') view.unmount();
    if (action === 'new file') {
      selectFile('new.jpg');
      await waitFor(() => expect(latest?.status).toBe('done'));
    }
    const calls = onChange.mock.calls.length;
    await act(async () => {
      pending.resolve({ overallImageContent: 'photo', characters: [{ label: 'Old' }] });
      await pending.promise;
    });
    expect(onChange).toHaveBeenCalledTimes(calls);
  },
);

test('ignores an upload that finishes after removal', async () => {
  const pending = deferred<typeof uploaded>();
  mockUpload.mockReturnValueOnce(pending.promise);
  render(<Harness />);
  selectFile();
  fireEvent.click(screen.getByRole('button', { name: formalTemplateCopy.photoRemove }));
  const calls = onChange.mock.calls.length;
  await act(async () => {
    pending.resolve(uploaded);
    await pending.promise;
  });
  expect(onChange).toHaveBeenCalledTimes(calls);
  expect(mockAnalyze).not.toHaveBeenCalled();
});
