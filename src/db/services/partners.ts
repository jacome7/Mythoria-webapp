import { and, asc, eq, ilike, sql } from 'drizzle-orm';
import { db } from '../index';
import { partners } from '../schema';
import { routing } from '@/i18n/routing';

export interface PublicPartnersFilters {
  type: 'printer' | 'attraction' | 'retail' | 'other';
  countryCode?: string;
  city?: string;
  limit: number;
  offset: number;
  locale?: string;
}

const DEFAULT_LOCALE = routing.defaultLocale;

const getLocalizedDescription = (
  shortDescription: Record<string, string> | null | undefined,
  locale: string,
  fallbackLocale: string,
) => {
  if (!shortDescription) return null;
  if (shortDescription[locale]) return shortDescription[locale];
  if (shortDescription.default) return shortDescription.default;
  if (shortDescription[fallbackLocale]) return shortDescription[fallbackLocale];
  if (shortDescription['en-US']) return shortDescription['en-US'];
  const firstValue = Object.values(shortDescription).find(Boolean);
  return firstValue ?? null;
};

export const partnersService = {
  async listPublicPartners({
    type,
    countryCode,
    city,
    limit,
    offset,
    locale,
  }: PublicPartnersFilters) {
    const localeToUse = locale || DEFAULT_LOCALE;
    const filters = [eq(partners.status, 'active'), eq(partners.type, type)];

    if (countryCode) {
      filters.push(eq(partners.countryCode, countryCode));
    }

    if (city) {
      filters.push(ilike(partners.city, `%${city}%`));
    }

    const rows = await db
      .select({
        id: partners.id,
        name: partners.name,
        type: partners.type,
        logoUrl: partners.logoUrl,
        websiteUrl: partners.websiteUrl,
        email: partners.email,
        mobilePhone: partners.mobilePhone,
        addressLine1: partners.addressLine1,
        addressLine2: partners.addressLine2,
        city: partners.city,
        postalCode: partners.postalCode,
        countryCode: partners.countryCode,
        shortDescription: partners.shortDescription,
        serviceScope: partners.serviceScope,
        displayOrder: partners.displayOrder,
      })
      .from(partners)
      .where(and(...filters))
      .orderBy(sql`${partners.displayOrder} asc nulls last`, asc(partners.name))
      .limit(limit)
      .offset(offset);

    return rows.map((row) => ({
      ...row,
      shortDescription: getLocalizedDescription(
        row.shortDescription as Record<string, string>,
        localeToUse,
        DEFAULT_LOCALE,
      ),
    }));
  },
};
