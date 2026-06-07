import Image from 'next/image';
import type { FeatureItem, Translator } from './types';

/**
 * The rounded 3-column feature card that overlaps the bottom of the scene.
 * Icons are decorative paper-cut PNGs (alt=""), labelled by the adjacent text.
 */
export default function FeatureCard({ items, t }: { items: FeatureItem[]; t: Translator }) {
  return (
    <div className="relative z-30 mx-auto -mt-20 w-full max-w-4xl px-2 sm:-mt-24 sm:px-4">
      {/* Warm cream card (matches the mockup) — solid rgba so it works without a
          Tailwind arbitrary-color-opacity build step. */}
      <div
        className="rounded-3xl border border-base-content/10 px-3 py-5 shadow-2xl backdrop-blur-sm sm:px-8 sm:py-7"
        style={{ backgroundColor: 'rgba(250, 241, 222, 0.94)' }}
      >
        {/* Always 3 columns — even on a phone, as in the mockup. */}
        <ul className="grid grid-cols-3">
          {items.map((item, index) => (
            <li
              key={item.id}
              className={`flex min-w-0 flex-col items-center px-2 text-center sm:px-6 ${
                index > 0 ? 'border-l border-base-content/15' : ''
              }`}
            >
              <Image
                src={item.icon}
                alt=""
                width={56}
                height={56}
                className="h-10 w-10 object-contain drop-shadow-md sm:h-14 sm:w-14"
              />
              <h3 className="font-display mt-2 text-sm leading-tight font-semibold text-[color:var(--pc-navy)] sm:mt-3 sm:text-lg">
                {t(item.titleKey)}
              </h3>
              <p className="mt-1 text-xs leading-snug text-base-content/75 sm:text-sm">
                {t(item.descKey)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
