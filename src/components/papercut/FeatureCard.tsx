import Image from 'next/image';
import type { FeatureItem, Translator } from './types';

/**
 * The rounded 3-column feature card that overlaps the bottom of the scene.
 * Icons are decorative paper-cut PNGs (alt=""), labelled by the adjacent text.
 */
export default function FeatureCard({ items, t }: { items: FeatureItem[]; t: Translator }) {
  return (
    <div className="relative z-30 mx-auto -mt-10 w-full max-w-4xl px-4 sm:-mt-14">
      {/* Warm cream card (matches the mockup) — solid rgba so it works without a
          Tailwind arbitrary-color-opacity build step. */}
      <div
        className="rounded-3xl border border-base-content/10 px-4 py-5 shadow-xl backdrop-blur-sm sm:px-8 sm:py-7"
        style={{ backgroundColor: 'rgba(244, 234, 214, 0.92)' }}
      >
        {/* Always 3 columns — even on a phone, as in the mockup. */}
        <ul className="grid grid-cols-3 gap-2 sm:gap-6">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col items-center text-center">
              <Image
                src={item.icon}
                alt=""
                width={56}
                height={56}
                className="h-9 w-9 object-contain sm:h-14 sm:w-14"
              />
              <h3 className="font-display mt-2 text-xs leading-tight font-semibold text-[color:var(--pc-navy)] sm:mt-3 sm:text-lg">
                {t(item.titleKey)}
              </h3>
              <p className="mt-1 text-[11px] leading-snug text-base-content/70 sm:text-sm">
                {t(item.descKey)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
