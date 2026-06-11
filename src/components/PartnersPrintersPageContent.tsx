'use client';

import { FerrisWheel, Loader2, Mail, MapPin, Phone, Printer, Store } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import styles from './PartnersPage.module.css';

const PAGE_SIZE = 10;
const PLACEHOLDER_LOGO = '/partners/partner-placeholder.svg';

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

type PartnerListItem = {
  id: string;
  name: string;
  type: 'printer' | 'attraction' | 'retail' | 'other';
  logoUrl: string | null;
  websiteUrl: string | null;
  email: string | null;
  mobilePhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  countryCode: string | null;
  shortDescription: string | null;
};

type PartnerResponse = {
  success: boolean;
  items: PartnerListItem[];
  nextOffset: number | null;
  hasMore: boolean;
};

type CountryOption = {
  code: string;
  cityKeys: string[];
};

const COUNTRY_OPTIONS: CountryOption[] = [
  {
    code: 'PT',
    cityKeys: [
      'aveiro',
      'beja',
      'braga',
      'braganca',
      'castelo-branco',
      'coimbra',
      'evora',
      'faro',
      'guarda',
      'leiria',
      'lisbon',
      'portalegre',
      'porto',
      'santarem',
      'setubal',
      'viana-do-castelo',
      'vila-real',
      'viseu',
    ],
  },
  { code: 'ES', cityKeys: ['madrid', 'barcelona', 'valencia', 'seville'] },
  { code: 'FR', cityKeys: ['paris', 'lyon', 'marseille', 'bordeaux'] },
  { code: 'DE', cityKeys: ['berlin', 'munich', 'hamburg', 'frankfurt'] },
  { code: 'IT', cityKeys: ['rome', 'milan', 'florence', 'naples'] },
  { code: 'NL', cityKeys: ['amsterdam', 'rotterdam', 'utrecht'] },
  { code: 'BE', cityKeys: ['brussels', 'antwerp', 'ghent'] },
  { code: 'GB', cityKeys: ['london', 'manchester', 'edinburgh'] },
];

const PARTNER_TYPES = [
  {
    value: 'printer',
    labelKey: 'filters.types.printers',
    icon: Printer,
  },
  {
    value: 'attraction',
    labelKey: 'filters.types.attractions',
    icon: FerrisWheel,
  },
  { value: 'retail', labelKey: 'filters.types.retail', icon: Store },
] as const;

type PartnerType = (typeof PARTNER_TYPES)[number]['value'];

const PartnersDirectorySection = () => {
  const t = useTranslations('PartnersList');
  const locale = useLocale();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const [partners, setPartners] = useState<PartnerListItem[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<PartnerListItem | null>(null);
  const [partnerType, setPartnerType] = useState<PartnerType>('printer');
  const [countryCode, setCountryCode] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  const availableCities = useMemo(() => {
    const country = COUNTRY_OPTIONS.find((option) => option.code === countryCode);
    return country?.cityKeys ?? [];
  }, [countryCode]);

  const resetAndLoad = useCallback(() => {
    setPartners([]);
    setOffset(0);
    setHasMore(true);
    hasMoreRef.current = true;
    setError(null);
  }, []);

  useEffect(() => {
    resetAndLoad();
  }, [countryCode, city, locale, partnerType, resetAndLoad]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadPartners = useCallback(
    async (currentOffset: number, options?: { force?: boolean }) => {
      if (isLoadingRef.current || (!hasMoreRef.current && !options?.force)) return;

      const params = new URLSearchParams({
        limit: PAGE_SIZE.toString(),
        offset: currentOffset.toString(),
        locale,
        type: partnerType,
      });

      if (countryCode) params.set('countryCode', countryCode);
      if (city) params.set('city', city);

      const applyResponse = (data: PartnerResponse) => {
        setPartners((prev) => (currentOffset === 0 ? data.items : [...prev, ...data.items]));
        setHasMore(data.hasMore);
        hasMoreRef.current = data.hasMore;
        setOffset(data.nextOffset ?? currentOffset);
      };

      isLoadingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/partners/directory?${params.toString()}`);
        const data: PartnerResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error('Failed to load partners');
        }

        applyResponse(data);
      } catch (fetchError) {
        console.error(fetchError);
        setError(t('list.error'));
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [city, countryCode, locale, partnerType, t],
  );

  useEffect(() => {
    loadPartners(0, { force: true });
  }, [city, countryCode, locale, partnerType, loadPartners]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoading) {
          loadPartners(offset);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [hasMore, isLoading, loadPartners, offset]);

  const handleCountryChange = (value: string) => {
    setCountryCode(value);
    setCity('');
  };

  const handleClearFilters = () => {
    setCountryCode('');
    setCity('');
  };

  const formatAddress = (partner: PartnerListItem) => {
    const parts = [
      partner.addressLine1,
      partner.addressLine2,
      partner.postalCode,
      partner.city,
      partner.countryCode,
    ].filter(Boolean);

    return parts.join(', ');
  };

  const buildMapsUrl = (address: string) => {
    const query = encodeURIComponent(address);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  return (
    <section className={styles.directorySection}>
      <div className={styles.sectionHeader}>
        <Image
          className={`${styles.decorImage} ${styles.sectionStar}`}
          src="/Papercut_icons/sparkle_c.webp"
          alt=""
          width={128}
          height={127}
          aria-hidden="true"
        />
        <h2 className={styles.sectionTitle}>{t('section.title')}</h2>
        <p className={styles.sectionSubtitle}>{t('section.subtitle')}</p>
      </div>

      <div className={styles.typeTabs} aria-label={t('section.title')}>
        {PARTNER_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.value}
              type="button"
              className={cx(
                styles.typeButton,
                partnerType === type.value && styles.typeButtonActive,
              )}
              onClick={() => setPartnerType(type.value)}
              aria-pressed={partnerType === type.value}
            >
              <Icon aria-hidden="true" />
              {t(type.labelKey)}
            </button>
          );
        })}
      </div>

      <section className={styles.filterPanel}>
        <h3 className={styles.filterTitle}>{t('filters.title')}</h3>
        <div className={styles.filtersGrid}>
          <label className={styles.fieldLabel}>
            <span>{t('filters.countryLabel')}</span>
            <select
              className={styles.selectField}
              value={countryCode}
              onChange={(event) => handleCountryChange(event.target.value)}
            >
              <option value="">{t('filters.countryPlaceholder')}</option>
              {COUNTRY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {t(`countries.${option.code}`)}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.fieldLabel}>
            <span>{t('filters.cityLabel')}</span>
            <select
              className={styles.selectField}
              value={city}
              onChange={(event) => setCity(event.target.value)}
              disabled={!countryCode}
            >
              <option value="">{t('filters.cityPlaceholder')}</option>
              {availableCities.map((cityKey) => (
                <option key={cityKey} value={t(`cities.${countryCode}.${cityKey}`)}>
                  {t(`cities.${countryCode}.${cityKey}`)}
                </option>
              ))}
            </select>
          </label>

          <button type="button" className={styles.clearButton} onClick={handleClearFilters}>
            {t('filters.clear')}
          </button>
        </div>
        <div className={styles.listHelper}>{t('list.helper')}</div>
      </section>

      <section className={styles.listSection}>
        {partners.length === 0 && !isLoading && !error && (
          <div className={`alert alert-info ${styles.stateBox}`}>{t('list.empty')}</div>
        )}

        {error && <div className={`alert alert-error ${styles.stateBox}`}>{error}</div>}

        <div className={styles.partnersGrid}>
          {partners.map((partner) => {
            const address = formatAddress(partner);
            const actionItems = [] as Array<{
              label: string;
              href?: string;
              onClick?: () => void;
              variant: 'primary' | 'outline';
            }>;

            if (address) {
              actionItems.push({
                label: t('actions.getDirections'),
                href: buildMapsUrl(address),
                variant: 'primary',
              });
            }

            if (partner.websiteUrl) {
              actionItems.push({
                label: t('actions.visitWebsite'),
                href: partner.websiteUrl,
                variant: actionItems.length === 0 ? 'primary' : 'outline',
              });
            }

            if (actionItems.length === 0) {
              actionItems.push({
                label: t('actions.viewDetails'),
                onClick: () => setSelectedPartner(partner),
                variant: 'primary',
              });
            }

            const hasViewDetailsAction = actionItems.some(
              (action) => action.label === t('actions.viewDetails'),
            );

            return (
              <div key={partner.id} className={styles.partnerCard}>
                <div className={styles.partnerCardInner}>
                  <div className={styles.partnerHeader}>
                    <div className={styles.logoFrame}>
                      <Image
                        src={partner.logoUrl || PLACEHOLDER_LOGO}
                        alt={partner.name}
                        fill
                        className={
                          partner.logoUrl
                            ? 'object-contain object-center'
                            : 'object-cover object-center'
                        }
                        sizes="112px"
                        unoptimized
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={styles.partnerName}>{partner.name}</h3>
                      <div className={styles.partnerLocation}>
                        <MapPin aria-hidden="true" size={18} />
                        <span>
                          {partner.city || partner.countryCode || t('list.locationFallback')}
                        </span>
                      </div>
                    </div>
                  </div>
                  {partner.shortDescription && (
                    <p className={styles.partnerDescription}>{partner.shortDescription}</p>
                  )}
                  <div className={styles.cardActions}>
                    {actionItems.map((action) =>
                      action.href ? (
                        <a
                          key={action.label}
                          className={cx(
                            'btn btn-sm',
                            action.variant === 'primary'
                              ? `btn-primary ${styles.miniPrimary}`
                              : `btn-outline ${styles.miniSecondary}`,
                          )}
                          href={action.href}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {action.label}
                        </a>
                      ) : (
                        <button
                          key={action.label}
                          type="button"
                          className={cx(
                            'btn btn-sm',
                            action.variant === 'primary'
                              ? `btn-primary ${styles.miniPrimary}`
                              : `btn-outline ${styles.miniSecondary}`,
                          )}
                          onClick={action.onClick}
                        >
                          {action.label}
                        </button>
                      ),
                    )}
                    {!hasViewDetailsAction && (
                      <button
                        type="button"
                        className={`btn btn-sm btn-ghost ${styles.miniGhost}`}
                        onClick={() => setSelectedPartner(partner)}
                      >
                        {t('actions.viewDetails')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {isLoading && (
          <div className={styles.loadingRow}>
            <Loader2 className="animate-spin" />
            <span>{t('list.loading')}</span>
          </div>
        )}

        {hasMore && !isLoading && (
          <div className="mt-6 flex justify-center">
            <button className="btn btn-primary" onClick={() => loadPartners(offset)}>
              {t('list.loadMore')}
            </button>
          </div>
        )}

        <div ref={sentinelRef} />
      </section>

      {selectedPartner &&
        isMounted &&
        (() => {
          const address = formatAddress(selectedPartner);
          return createPortal(
            <div className="modal modal-open">
              <div className="modal-box max-w-2xl max-h-[85vh] overflow-y-auto">
                <div className="flex items-start gap-4">
                  <div className="relative h-20 w-28 min-h-20 min-w-28 shrink-0 rounded-lg bg-base-200 overflow-hidden">
                    <Image
                      src={selectedPartner.logoUrl || PLACEHOLDER_LOGO}
                      alt={selectedPartner.name}
                      fill
                      className="object-contain object-center"
                      sizes="112px"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-2xl font-bold text-primary">{selectedPartner.name}</h3>
                    </div>
                    {selectedPartner.websiteUrl && (
                      <a
                        className="text-sm text-base-content/70 link link-hover block max-w-full truncate"
                        href={selectedPartner.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        title={selectedPartner.websiteUrl}
                      >
                        {selectedPartner.websiteUrl}
                      </a>
                    )}
                  </div>
                </div>
                {selectedPartner.shortDescription && (
                  <p className="text-base-content/70 mt-2">{selectedPartner.shortDescription}</p>
                )}

                <div className="mt-6 space-y-4">
                  {selectedPartner.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="text-primary" />
                      <div>
                        <div className="text-sm font-semibold">{t('modal.email')}</div>
                        <a
                          className="text-base-content/70 link link-hover"
                          href={`mailto:${selectedPartner.email}`}
                        >
                          {selectedPartner.email}
                        </a>
                      </div>
                    </div>
                  )}
                  {selectedPartner.mobilePhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="text-primary" />
                      <div>
                        <div className="text-sm font-semibold">{t('modal.phone')}</div>
                        <a
                          className="text-base-content/70 link link-hover"
                          href={`tel:${selectedPartner.mobilePhone}`}
                        >
                          {selectedPartner.mobilePhone}
                        </a>
                      </div>
                    </div>
                  )}
                  {address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="text-primary" />
                      <div>
                        <div className="text-sm font-semibold">{t('modal.address')}</div>
                        <a
                          className="text-base-content/70 link link-hover"
                          href={buildMapsUrl(address)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {address}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-action flex flex-wrap gap-2">
                  <button className="btn" onClick={() => setSelectedPartner(null)}>
                    {t('modal.close')}
                  </button>
                </div>
              </div>
              <button
                className="modal-backdrop"
                onClick={() => setSelectedPartner(null)}
                aria-label={t('modal.close')}
              >
                {t('modal.close')}
              </button>
            </div>,
            document.body,
          );
        })()}
    </section>
  );
};

export default PartnersDirectorySection;
