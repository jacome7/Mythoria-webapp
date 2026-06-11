'use client';

import { Handshake, MapPin } from 'lucide-react';
import Image from 'next/image';
import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import PartnershipForm from './PartnershipForm';
import PartnersDirectorySection from './PartnersPrintersPageContent';
import styles from './PartnersPage.module.css';

const PartnersPageContent = () => {
  const t = useTranslations('Partners');
  const directoryRef = useRef<HTMLElement>(null);
  const b2bRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLElement>(null);

  const scrollToDirectory = () => {
    directoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToB2b = () => {
    b2bRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={styles.pageShell}>
      <section className={styles.heroCard}>
        <Image
          className={`${styles.decorImage} ${styles.heroStarTop}`}
          src="/Papercut_icons/sparkle_a.webp"
          alt=""
          width={128}
          height={134}
          aria-hidden="true"
        />
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <h1 className={styles.heroTitle}>{t('hero.title')}</h1>
            <p className={styles.heroSubtitle}>{t('hero.subtitle')}</p>
            <p className={styles.heroBody}>{t('hero.body')}</p>
            <div className={styles.heroActions}>
              <button className={styles.primaryButton} onClick={scrollToDirectory}>
                <MapPin aria-hidden="true" />
                {t('hero.ctaPrimary')}
              </button>
              <button className={styles.secondaryButton} onClick={scrollToB2b}>
                <Handshake aria-hidden="true" />
                {t('hero.ctaSecondary')}
              </button>
            </div>
          </div>
          <div className={styles.heroArt} aria-hidden="true">
            <Image
              className={`${styles.decorImage} ${styles.heroCloud}`}
              src="/Papercut_icons/cloud_right.webp"
              alt=""
              width={489}
              height={317}
            />
            <Image
              className={`${styles.decorImage} ${styles.heroStarSide}`}
              src="/Papercut_icons/sparkle_b.webp"
              alt=""
              width={128}
              height={136}
            />
            <Image
              className={styles.heroImage}
              src="/Papercut_icons/partners_page.webp"
              alt=""
              width={512}
              height={520}
              priority
            />
          </div>
        </div>
      </section>

      <section ref={directoryRef}>
        <PartnersDirectorySection />
      </section>

      <section ref={b2bRef} className={styles.b2bPanel}>
        <div>
          <h2 className={styles.b2bTitle}>{t('b2b.title')}</h2>
          <p className={styles.b2bBody}>{t('b2b.body')}</p>
          <button className={styles.primaryButton} onClick={scrollToForm}>
            {t('b2b.cta')}
          </button>
        </div>
      </section>

      <section ref={formRef} className={styles.formSection}>
        <PartnershipForm />
      </section>
    </div>
  );
};

export default PartnersPageContent;
