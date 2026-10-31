import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import MediaCapture from './MediaCapture';
import type { UploadedImage } from '@/hooks/useStep2Session';

jest.mock('next/image', () => ({ __esModule: true, default: () => null }));
jest.mock('next-intl', () => ({
  useLocale: () => 'pt-PT',
  useTranslations: () => Object.assign((key: string) => key, { raw: () => [] }),
}));
jest.mock('@/hooks/useMediaUpload', () => ({
  useMediaUpload: () => ({ uploadInput: jest.fn(), analyzeImage: jest.fn() }),
}));
jest.mock('./Step2Page.module.css', () => ({
  step2Modal: 'gallery',
  detailsModal: 'details',
}));

const showModal = jest.fn(function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
});
const close = jest.fn(function (this: HTMLDialogElement) {
  this.removeAttribute('open');
});

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: showModal,
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: close,
  });
});

function setup() {
  const image: UploadedImage = {
    id: 'test-photo',
    preview: '',
    status: 'done',
    attempts: 1,
    objectPath: 'test/photo.jpg',
    metadata: { overallImageContent: 'photo', description: 'A fictional seaside scene.' },
  };
  const setActiveModal = jest.fn();
  const setUploadedImages = jest.fn();
  render(
    <MediaCapture
      preview
      activeModal="images"
      setActiveModal={setActiveModal}
      uploadedImages={[image]}
      setUploadedImages={setUploadedImages}
      uploadedAudio={null}
      setUploadedAudio={jest.fn()}
      saveToSession={jest.fn()}
    />,
  );
  const trigger = screen.getByRole('button', { name: /imageAnalysis.viewDetails/ });
  trigger.focus();
  fireEvent.click(trigger);
  return { trigger, setActiveModal, setUploadedImages };
}

it('opens analysis in a native top-layer dialog above the gallery and restores focus on Done', () => {
  const { trigger, setActiveModal, setUploadedImages } = setup();
  const details = screen.getByRole('dialog', { name: 'imageAnalysis.detailsTitle' });
  expect(details.tagName).toBe('DIALOG');
  expect(details.parentElement).toBe(document.body);
  expect(showModal).toHaveBeenCalledTimes(1);
  expect(within(details).getByText('A fictional seaside scene.')).toBeVisible();
  const buttons = within(details).getAllByRole('button', { name: 'actions.done' });
  fireEvent.click(buttons[buttons.length - 1]);
  expect(close).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('dialog', { name: 'imageAnalysis.detailsTitle' })).toBeNull();
  expect(screen.getByRole('dialog', { name: 'guided.cards.addPhotos' })).toBeInTheDocument();
  expect(trigger).toHaveFocus();
  expect(setActiveModal).not.toHaveBeenCalled();
  expect(setUploadedImages).not.toHaveBeenCalled();
});

it('contains keyboard events and closes only the details on Escape cancellation', () => {
  const { setActiveModal } = setup();
  const details = screen.getByRole('dialog', { name: 'imageAnalysis.detailsTitle' });
  const outerKeyboard = jest.fn();
  document.addEventListener('keydown', outerKeyboard);
  try {
    fireEvent.keyDown(details, { key: 'Escape' });
    expect(outerKeyboard).not.toHaveBeenCalled();
    fireEvent(details, new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog', { name: 'imageAnalysis.detailsTitle' })).toBeNull();
    expect(setActiveModal).not.toHaveBeenCalled();
  } finally {
    document.removeEventListener('keydown', outerKeyboard);
  }
});
