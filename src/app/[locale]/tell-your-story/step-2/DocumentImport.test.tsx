import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import DocumentImport from './DocumentImport';
import { createDocumentWorker } from '@/lib/story-templates/create-document-worker';

jest.mock('@/lib/story-templates/create-document-worker', () => ({
  createDocumentWorker: jest.fn(),
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

function Harness() {
  const [value, setValue] = useState('Original');
  return (
    <>
      <span data-testid="story">{value}</span>
      <DocumentImport value={value} onChange={setValue} fits={(text) => text.length <= 30} />
    </>
  );
}

test('ignores worker handshake, reviews an import, appends and undoes without losing the original', () => {
  const worker = {
    postMessage: jest.fn(),
    terminate: jest.fn(),
    onmessage: null as null | ((event: { data: { kind: string; text?: string } }) => void),
  };
  (createDocumentWorker as jest.Mock).mockReturnValue(worker);
  const { container } = render(<Harness />);
  const file = new File(['content'], 'story.txt', { type: 'text/plain' });
  fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [file] } });
  expect(screen.getByText('loading')).toBeInTheDocument();
  act(() => worker.onmessage!({ data: { kind: 'ready' } }));
  expect(screen.getByText('loading')).toBeInTheDocument();
  act(() => worker.onmessage!({ data: { kind: 'result', text: 'Nova história' } }));
  expect(screen.getByRole('textbox', { name: 'review' })).toHaveValue('Nova história');
  expect(screen.getByTestId('story')).toHaveTextContent('Original');
  fireEvent.click(screen.getByRole('button', { name: 'append' }));
  expect(screen.getByTestId('story').textContent).toBe('Original\n\nNova história');
  fireEvent.click(screen.getByRole('button', { name: 'undo' }));
  expect(screen.getByTestId('story')).toHaveTextContent('Original');
});

test('rejects an oversized file without changing the story', () => {
  const { container } = render(<Harness />);
  const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'story.txt');
  fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [file] } });
  expect(screen.getByRole('alert')).toHaveTextContent('tooLarge');
  expect(screen.getByTestId('story')).toHaveTextContent('Original');
});

test('cancelling extraction terminates the worker and ignores a late result', () => {
  const worker = {
    postMessage: jest.fn(),
    terminate: jest.fn(),
    onmessage: null as null | ((event: { data: { kind: string; text?: string } }) => void),
  };
  (createDocumentWorker as jest.Mock).mockReturnValue(worker);
  const { container } = render(<Harness />);
  fireEvent.change(container.querySelector('input[type=file]')!, {
    target: { files: [new File(['x'], 'story.txt')] },
  });
  fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
  expect(worker.terminate).toHaveBeenCalled();
  act(() => worker.onmessage?.({ data: { kind: 'result', text: 'late result' } }));
  expect(screen.queryByRole('textbox', { name: 'review' })).not.toBeInTheDocument();
  expect(screen.getByTestId('story')).toHaveTextContent('Original');
});

test('does not allow a reviewed result that exceeds the available allowance', () => {
  const worker = {
    postMessage: jest.fn(),
    terminate: jest.fn(),
    onmessage: null as null | ((event: { data: { kind: string; text?: string } }) => void),
  };
  (createDocumentWorker as jest.Mock).mockReturnValue(worker);
  const { container } = render(<Harness />);
  fireEvent.change(container.querySelector('input[type=file]')!, {
    target: { files: [new File(['x'], 'story.txt')] },
  });
  act(() => worker.onmessage?.({ data: { kind: 'result', text: 'x'.repeat(31) } }));
  expect(screen.getByRole('button', { name: 'append' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'replace' })).toBeDisabled();
  expect(screen.getByTestId('story')).toHaveTextContent('Original');
});
