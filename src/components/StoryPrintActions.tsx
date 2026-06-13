'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface StoryPrintActionsProps {
  onPrint: () => void;
  onDownload: () => void;
}

export default function StoryPrintActions({ onPrint, onDownload }: StoryPrintActionsProps) {
  const tActions = useTranslations('Actions');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!mobileMenuRef.current?.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  const handleMobilePrint = () => {
    setIsMobileMenuOpen(false);
    onPrint();
  };

  const handleMobileDownload = () => {
    setIsMobileMenuOpen(false);
    onDownload();
  };

  return (
    <>
      <div ref={mobileMenuRef} className="relative w-[2.625rem] flex-none sm:hidden">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          aria-label={tActions('printOptions')}
          aria-expanded={isMobileMenuOpen}
          aria-haspopup="menu"
          title={tActions('printOptions')}
          onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
        >
          <Printer className="w-4 h-4" />
        </button>

        {isMobileMenuOpen && (
          <div
            role="menu"
            style={{ position: 'absolute', right: 0, left: 'auto', top: '100%' }}
            className="absolute right-0 top-full z-[100] mt-2 w-64 max-w-[calc(100vw-1rem)] rounded-box border border-base-300 bg-base-100 p-2 shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              onClick={handleMobilePrint}
              className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left hover:bg-base-200"
            >
              <Printer className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <span className="block font-semibold">{tActions('print')}</span>
                <span className="block text-xs leading-snug text-base-content/70">
                  {tActions('printDescription')}
                </span>
              </span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={handleMobileDownload}
              className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left hover:bg-base-200"
            >
              <Download className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <span className="block font-semibold">{tActions('downloadPdf')}</span>
                <span className="block text-xs leading-snug text-base-content/70">
                  {tActions('downloadPdfDescription')}
                </span>
              </span>
            </button>
          </div>
        )}
      </div>

      <button onClick={onPrint} className="btn btn-ghost btn-sm hidden sm:inline-flex">
        <Printer className="w-4 h-4" />
        <span className="ml-2">{tActions('print')}</span>
      </button>

      <button onClick={onDownload} className="btn btn-ghost btn-sm hidden sm:inline-flex">
        <Download className="w-4 h-4" />
        <span className="ml-2">{tActions('downloadPdf')}</span>
      </button>
    </>
  );
}
