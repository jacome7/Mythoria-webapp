'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import {
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
  FaSpinner,
  FaPrint,
  FaStore,
} from 'react-icons/fa';

const PAGE_SIZE = 10;
const PLACEHOLDER_LOGO = '/partners/partner-placeholder.svg';

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
  { code: 'PT', cityKeys: ['lisbon', 'porto', 'braga', 'coimbra', 'faro'] },
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
    badgeKey: 'types.printer',
    icon: FaPrint,
  },
  {
    value: 'attraction',
    labelKey: 'filters.types.attractions',
    badgeKey: 'types.attraction',
    icon: FaMapMarkerAlt,
  },
  { value: 'retail', labelKey: 'filters.types.retail', badgeKey: 'types.retail', icon: FaStore },
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

  const getTypeMeta = (type: PartnerListItem['type']) =>
    PARTNER_TYPES.find((option) => option.value === type);

  return (
    <section className="space-y-10">
      <div className="space-y-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-primary">{t('section.title')}</h2>
        <p className="text-base-content/70 max-w-3xl mx-auto">{t('section.subtitle')}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {PARTNER_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.value}
              className={`tab tab-bordered ${partnerType === type.value ? 'tab-active' : ''}`}
              onClick={() => setPartnerType(type.value)}
            >
              <Icon className="mr-2" />
              {t(type.labelKey)}
            </button>
          );
        })}
      </div>

      <section className="card bg-base-200 shadow-lg">
        <div className="card-body">
          <h3 className="text-2xl font-bold text-primary mb-4">{t('filters.title')}</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="form-control flex flex-col items-start gap-2">
              <span className="label-text font-semibold">{t('filters.countryLabel')}</span>
              <select
                className="select select-bordered w-full"
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

            <label className="form-control flex flex-col items-start gap-2">
              <span className="label-text font-semibold">{t('filters.cityLabel')}</span>
              <select
                className="select select-bordered w-full"
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

            <div className="flex items-end">
              <button className="btn btn-outline w-full" onClick={handleClearFilters}>
                {t('filters.clear')}
              </button>
            </div>
          </div>
          <div className="mt-4 text-sm text-base-content/60">{t('list.helper')}</div>
        </div>
      </section>

      <section className="space-y-6">
        {partners.length === 0 && !isLoading && !error && (
          <div className="alert alert-info">{t('list.empty')}</div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {partners.map((partner) => {
            const address = formatAddress(partner);
            const typeMeta = getTypeMeta(partner.type);
            const TypeIcon = typeMeta?.icon;
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
              <div
                key={partner.id}
                className="card bg-base-100 shadow-lg text-left transition hover:shadow-xl"
              >
                <div className="card-body">
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 min-h-16 min-w-16 aspect-square shrink-0 rounded-lg bg-base-200 overflow-hidden">
                      <Image
                        src={partner.logoUrl || PLACEHOLDER_LOGO}
                        alt={partner.name}
                        fill
                        className={partner.logoUrl ? 'object-contain' : 'object-cover'}
                        sizes="64px"
                        unoptimized
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-primary">{partner.name}</h3>
                        {typeMeta && (
                          <span className="badge badge-lg border-primary/30 bg-primary/10 text-primary shadow-sm">
                            {TypeIcon && <TypeIcon className="text-lg" />}
                          </span>
                        )}
                      </div>
                      {partner.shortDescription && (
                        <p className="text-sm text-base-content/70">{partner.shortDescription}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-base-content/70 flex items-center gap-2">
                    <FaMapMarkerAlt className="text-primary" />
                    <span>{partner.city || partner.countryCode || t('list.locationFallback')}</span>
                  </div>
                  <div className="card-actions mt-4 flex flex-wrap gap-2">
                    {actionItems.map((action) =>
                      action.href ? (
                        <a
                          key={action.label}
                          className={`btn btn-sm ${action.variant === 'primary' ? 'btn-primary' : 'btn-outline'}`}
                          href={action.href}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {action.label}
                        </a>
                      ) : (
                        <button
                          key={action.label}
                          className={`btn btn-sm ${action.variant === 'primary' ? 'btn-primary' : 'btn-outline'}`}
                          onClick={action.onClick}
                        >
                          {action.label}
                        </button>
                      ),
                    )}
                    {!hasViewDetailsAction && (
                      <button
                        className="btn btn-sm btn-ghost"
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
          <div className="flex items-center justify-center gap-2 text-base-content/70">
            <FaSpinner className="animate-spin" />
            <span>{t('list.loading')}</span>
          </div>
        )}

        {hasMore && !isLoading && (
          <div className="flex justify-center">
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
          const typeMeta = getTypeMeta(selectedPartner.type);
          return createPortal(
            <div className="modal modal-open">
              <div className="modal-box max-w-2xl max-h-[85vh] overflow-y-auto">
                <div className="flex items-start gap-4">
                  <div className="relative h-20 w-20 rounded-lg bg-base-200 overflow-hidden">
                    <Image
                      src={selectedPartner.logoUrl || PLACEHOLDER_LOGO}
                      alt={selectedPartner.name}
                      fill
                      className="object-contain"
                      sizes="80px"
                      unoptimized
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-2xl font-bold text-primary">{selectedPartner.name}</h3>
                      {typeMeta && (
                        <span className="badge badge-outline text-xs">{t(typeMeta.badgeKey)}</span>
                      )}
                    </div>
                    {selectedPartner.shortDescription && (
                      <p className="text-base-content/70">{selectedPartner.shortDescription}</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {selectedPartner.email && (
                    <div className="flex items-center gap-2">
                      <FaEnvelope className="text-primary" />
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
                      <FaPhoneAlt className="text-primary" />
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
                      <FaMapMarkerAlt className="text-primary" />
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
                  {selectedPartner.websiteUrl && (
                    <a
                      className="btn btn-primary"
                      href={selectedPartner.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('actions.visitWebsite')}
                    </a>
                  )}
                  {address && (
                    <a
                      className="btn btn-outline"
                      href={buildMapsUrl(address)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('actions.getDirections')}
                    </a>
                  )}
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
