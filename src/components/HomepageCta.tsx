'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import styles from './HomepageCta.module.css';

export default function HomepageCta() {
  const locale = useLocale();
  const t = useTranslations('HomePage.cta');

  return (
    <section className="my-16">
      <div className={styles.card}>
        <Image
          src="/homepage/kids_fantasy/green_leaf_and_flower.webp"
          alt=""
          width={256}
          height={275}
          sizes="130px"
          className={styles.leaf}
          aria-hidden="true"
        />
        <Image
          src="/homepage/kids_fantasy/mushroom_and_green_leaf.webp"
          alt=""
          width={256}
          height={316}
          sizes="150px"
          className={styles.mushroom}
          aria-hidden="true"
        />
        <Image
          src="/homepage/kids_fantasy/yellow_star_2.webp"
          alt=""
          width={128}
          height={127}
          sizes="34px"
          className={styles.starLeft}
          aria-hidden="true"
        />
        <Image
          src="/homepage/kids_fantasy/yellow_star_1.webp"
          alt=""
          width={128}
          height={136}
          sizes="32px"
          className={styles.starRight}
          aria-hidden="true"
        />
        <div className={styles.content}>
          <h3 className="font-display text-3xl font-bold leading-tight text-[color:var(--pc-navy)]">
            {t('title')}
          </h3>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-base-content/80 sm:text-lg">
            {t('subtitle')}
          </p>
          <Link href={`/${locale}/sign-up`} className={styles.ctaButton}>
            {t('button')}
          </Link>
        </div>
      </div>
    </section>
  );
}
