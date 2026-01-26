'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { FaMapMarkerAlt, FaPhoneAlt, FaEnvelope, FaSpinner } from 'react-icons/fa';

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

const PartnersPrintersPageContent = () => {
  const t = useTranslations('PartnersList');
  const locale = useLocale();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const [partners, setPartners] = useState<PartnerListItem[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<PartnerListItem | null>(null);
  const [countryCode, setCountryCode] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableCities = useMemo(() => {
    const country = COUNTRY_OPTIONS.find((option) => option.code === countryCode);
    return country?.cityKeys ?? [];
  }, [countryCode]);

  const resetAndLoad = useCallback(() => {
    setPartners([]);
    setOffset(0);
    setHasMore(true);
    setError(null);
  }, []);

  useEffect(() => {
    resetAndLoad();
  }, [countryCode, city, resetAndLoad]);

  const loadPartners = useCallback(
    async (currentOffset: number) => {
      if (isLoading || !hasMore) return;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: PAGE_SIZE.toString(),
          offset: currentOffset.toString(),
          locale,
        });

        if (countryCode) params.set('countryCode', countryCode);
        if (city) params.set('city', city);

        const response = await fetch(`/api/partners/printers?${params.toString()}`);
        const data: PartnerResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error('Failed to load partners');
        }

        setPartners((prev) => (currentOffset === 0 ? data.items : [...prev, ...data.items]));
        setHasMore(data.hasMore);
        setOffset(data.nextOffset ?? currentOffset);
      } catch (fetchError) {
        console.error(fetchError);
        setError(t('list.error'));
      } finally {
        setIsLoading(false);
      }
    },
    [city, countryCode, hasMore, isLoading, locale, t],
  );

  useEffect(() => {
    loadPartners(0);
  }, [loadPartners]);

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
    <div className="space-y-12">
      <section className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-primary">{t('hero.title')}</h1>
        <p className="text-lg md:text-xl text-base-content/80">{t('hero.subtitle')}</p>
        <p className="text-lg font-semibold text-primary">{t('hero.tagline')}</p>
      </section>

      <section className="card bg-base-200 shadow-lg">
        <div className="card-body">
          <h2 className="text-2xl font-bold text-primary mb-4">{t('filters.title')}</h2>
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
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t('list.title')}</h2>
        </div>

        {partners.length === 0 && !isLoading && !error && (
          <div className="alert alert-info">{t('list.empty')}</div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {partners.map((partner) => (
            <button
              key={partner.id}
              className="card bg-base-100 shadow-lg text-left transition hover:shadow-xl"
              onClick={() => setSelectedPartner(partner)}
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
                  <div>
                    <h3 className="text-lg font-bold text-primary">{partner.name}</h3>
                    {partner.shortDescription && (
                      <p className="text-sm text-base-content/70">{partner.shortDescription}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 text-sm text-base-content/70 flex items-center gap-2">
                  <FaMapMarkerAlt className="text-primary" />
                  <span>{partner.city || partner.countryCode || t('list.locationFallback')}</span>
                </div>
              </div>
            </button>
          ))}
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

      {selectedPartner && (() => {
        const address = formatAddress(selectedPartner);
        return (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl">
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
              <div>
                <h3 className="text-2xl font-bold text-primary">{selectedPartner.name}</h3>
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

            <div className="modal-action">
              <button className="btn" onClick={() => setSelectedPartner(null)}>
                {t('modal.close')}
              </button>
            </div>
          </div>
          <button className="modal-backdrop" onClick={() => setSelectedPartner(null)}>
            {t('modal.close')}
          </button>
        </dialog>
        );
      })()}
    </div>
  );
};

export default PartnersPrintersPageContent;
