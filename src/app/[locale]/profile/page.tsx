'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useUser } from '@clerk/nextjs';
import CreditsDisplay from '@/components/CreditsDisplay';
import Link from 'next/link';
import { GENDER_OPTIONS, LITERARY_AGE_OPTIONS } from '@/constants/profileOptions';
import { SUPPORTED_LOCALES } from '@/config/locales';
import {
  FaUser,
  FaVenusMars,
  FaBirthdayCake,
  FaEnvelope,
  FaPhone,
  FaGlobe,
  FaBook,
  FaCreditCard,
  FaPlusCircle,
} from 'react-icons/fa';

interface ProfileDetails {
  displayName: string;
  gender: string | null;
  literaryAge: string | null;
  preferredLocale: string | null;
  email: string;
  mobilePhone: string | null;
  fiscalNumber: string | null;
  notificationPreference: string | null;
}

export default function AccountProfilePage() {
  const locale = useLocale();
  const t = useTranslations('ProfilePage');
  const { isLoaded, isSignedIn, user } = useUser();
  const [loading, setLoading] = useState(true);
  // Track if any save is in-flight (aggregated)
  // Removed unused aggregate savingAny state to satisfy lint; per-field statuses already tracked
  const [credits, setCredits] = useState(0);
  const [storyCount, setStoryCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  // Field level status map: idle | pending (debounce) | saving | saved | error
  const [fieldStatus, setFieldStatus] = useState<Record<keyof ProfileDetails, string>>({
    displayName: 'idle',
    gender: 'idle',
    literaryAge: 'idle',
    preferredLocale: 'idle',
    email: 'idle',
    mobilePhone: 'idle',
    fiscalNumber: 'idle',
    notificationPreference: 'idle',
  });
  const saveTimeouts = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});

  const fetchProfileData = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    try {
      setLoading(true);
      const [creditsRes, storyCountRes, profileRes] = await Promise.all([
        fetch('/api/my-credits'),
        fetch('/api/stories/count'),
        fetch('/api/profile'),
      ]);

      // Inline values to avoid linter false positive on prefer-const
      const emailAddr = user?.primaryEmailAddress?.emailAddress || '';
      const fullName = user?.fullName || '';

      if (profileRes.ok) {
        const pr = await profileRes.json();
        setProfile({
          displayName: pr.author.displayName || fullName,
          gender: pr.author.gender,
          literaryAge: pr.author.literaryAge,
          preferredLocale: pr.author.preferredLocale || locale,
          email: emailAddr,
          mobilePhone: pr.author.mobilePhone || '',
          fiscalNumber: pr.author.fiscalNumber || '',
          notificationPreference: pr.author.notificationPreference || 'inspiration',
        });
      } else {
        setProfile({
          displayName: fullName,
          gender: null,
          literaryAge: null,
          preferredLocale: locale,
          email: emailAddr,
          mobilePhone: '',
          fiscalNumber: '',
          notificationPreference: 'inspiration',
        });
      }

      if (creditsRes.ok) {
        const c = await creditsRes.json();
        setCredits(c.currentBalance || 0);
      }
      if (storyCountRes.ok) {
        const c = await storyCountRes.json();
        setStoryCount(c.count);
      }
    } catch (err) {
      console.error(err);
      setError(t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, user, locale, t]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const persistProfile = useCallback(
    async (updated: ProfileDetails, changedField: keyof ProfileDetails) => {
      setError(null);
      setSuccess(null);
      setFieldStatus((fs) => ({ ...fs, [changedField]: 'saving' }));
      try {
        const patchBody = {
          displayName: updated.displayName,
          gender: updated.gender,
          literaryAge: updated.literaryAge,
          preferredLocale: updated.preferredLocale,
          mobilePhone: updated.mobilePhone,
          fiscalNumber: updated.fiscalNumber,
          notificationPreference: updated.notificationPreference,
        };
        await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchBody),
        });
        if (changedField === 'preferredLocale' && updated.preferredLocale) {
          // Sync auth locale preference
          await fetch('/api/auth/update-locale', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preferredLocale: updated.preferredLocale }),
          });
        }
        setFieldStatus((fs) => ({ ...fs, [changedField]: 'saved' }));
        setSuccess(t('success.saved'));
      } catch (e) {
        console.error(e);
        setFieldStatus((fs) => ({ ...fs, [changedField]: 'error' }));
        setError(t('errors.saveFailed'));
      } finally {
        setTimeout(() => {
          setSuccess(null);
          setError(null);
          setFieldStatus((fs) => ({ ...fs, [changedField]: 'idle' }));
        }, 2500);
      }
    },
    [t],
  );

  const scheduleFieldSave = useCallback(
    (field: keyof ProfileDetails, nextValue: string | null, debounceMs: number) => {
      setFieldStatus((fs) => ({ ...fs, [field]: 'pending' }));
      // Clear existing timeout
      if (saveTimeouts.current[field]) {
        clearTimeout(saveTimeouts.current[field]);
      }
      saveTimeouts.current[field] = setTimeout(() => {
        setProfile((p) => {
          if (!p) return p;
          const updated: ProfileDetails = { ...p, [field]: nextValue } as ProfileDetails;
          // persist with updated local state right away
          persistProfile(updated, field);
          return updated;
        });
      }, debounceMs);
    },
    [persistProfile],
  );

  const flushFieldSave = useCallback(
    (field: keyof ProfileDetails) => {
      // Clear any pending debounce
      if (saveTimeouts.current[field]) {
        clearTimeout(saveTimeouts.current[field]);
        saveTimeouts.current[field] = null;
      }
      // Persist current snapshot even if there was no pending timeout (supports immediate saves)
      setProfile((p) => {
        if (!p) return p;
        persistProfile(p, field);
        return p;
      });
    },
    [persistProfile],
  );

  const handleFieldChange = (
    field: keyof ProfileDetails,
    value: string | null,
    opts?: { immediate?: boolean },
  ) => {
    // Update local draft immediately for snappy UI
    setProfile((p) => (p ? { ...p, [field]: value } : p));
    if (opts?.immediate) {
      if (saveTimeouts.current[field]) {
        clearTimeout(saveTimeouts.current[field]);
        saveTimeouts.current[field] = null;
      }
      // Persist immediately using current draft
      setProfile((p) => {
        if (!p) return p;
        persistProfile(p, field);
        return p;
      });
    } else {
      // Debounce text-ish inputs
      const isFreeText = ['displayName', 'mobilePhone', 'fiscalNumber'].includes(field);
      scheduleFieldSave(field, value, isFreeText ? 700 : 250);
    }
  };

  // Flush any pending saves on unmount to reduce data loss risk
  useEffect(() => {
    // Capture snapshot of timeouts at effect registration
    const snapshot = saveTimeouts.current;
    return () => {
      (Object.keys(snapshot) as (keyof ProfileDetails)[]).forEach((f) => {
        const to = snapshot[f];
        if (to) {
          clearTimeout(to);
          flushFieldSave(f);
        }
      });
    };
  }, [flushFieldSave]);

  if (!isSignedIn) {
    return <div className="p-8 text-center">{t('signInPrompt')}</div>;
  }

  if (loading || !profile) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto p-4 sm:p-8">
        <div className="prose max-w-none mb-8">
          <h1 className="text-4xl font-bold">{t('title')}</h1>
          <p className="text-lg">{t('intro')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Profile Details */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-2xl text-primary flex items-center">
                  <FaUser className="mr-2" /> {t('details.title')}
                </h2>
                <p className="text-sm opacity-80 mb-6">{t('details.description')}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-control lg:space-y-2">
                    <label className="label block mb-1">
                      <span className="label-text font-semibold flex items-center">
                        <FaUser className="mr-2" />
                        {t('details.displayName')}
                        {fieldStatus.displayName === 'saving' && (
                          <span className="loading loading-spinner loading-xs ml-2" />
                        )}
                        {fieldStatus.displayName === 'saved' && (
                          <span className="ml-2 text-success">✓</span>
                        )}
                      </span>
                    </label>
                    <input
                      className="input input-bordered"
                      value={profile.displayName}
                      onChange={(e) => handleFieldChange('displayName', e.target.value)}
                      onBlur={() => flushFieldSave('displayName')}
                    />
                  </div>
                  <div className="form-control lg:space-y-2">
                    <label className="label block mb-1">
                      <span className="label-text font-semibold flex items-center">
                        <FaVenusMars className="mr-2" />
                        {t('details.gender')}
                        {fieldStatus.gender === 'saving' && (
                          <span className="loading loading-spinner loading-xs ml-2" />
                        )}
                        {fieldStatus.gender === 'saved' && (
                          <span className="ml-2 text-success">✓</span>
                        )}
                      </span>
                    </label>
                    <select
                      className="select select-bordered"
                      value={profile.gender || ''}
                      onChange={(e) =>
                        handleFieldChange('gender', e.target.value || null, { immediate: true })
                      }
                    >
                      <option value="">{t('details.selectGender')}</option>
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {t(`genderOptions.${g}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-control lg:space-y-2">
                    <label className="label block mb-1">
                      <span className="label-text font-semibold flex items-center">
                        <FaBirthdayCake className="mr-2" />
                        {t('details.ageRange')}
                        {fieldStatus.literaryAge === 'saving' && (
                          <span className="loading loading-spinner loading-xs ml-2" />
                        )}
                        {fieldStatus.literaryAge === 'saved' && (
                          <span className="ml-2 text-success">✓</span>
                        )}
                      </span>
                    </label>
                    <select
                      className="select select-bordered"
                      value={profile.literaryAge || ''}
                      onChange={(e) =>
                        handleFieldChange('literaryAge', e.target.value || null, {
                          immediate: true,
                        })
                      }
                    >
                      <option value="">{t('details.selectAge')}</option>
                      {LITERARY_AGE_OPTIONS.map((a) => (
                        <option key={a} value={a}>
                          {t(`ageOptions.${a}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-2xl text-primary flex items-center">
                  <FaEnvelope className="mr-2" /> {t('contact.title')}
                </h2>
                <p className="text-sm opacity-80 mb-6">{t('contact.description')}</p>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="form-control lg:space-y-2">
                    <label className="label block mb-1">
                      <span className="label-text font-semibold flex items-center">
                        <FaEnvelope className="mr-2" />
                        {t('contact.email')}
                      </span>
                    </label>
                    <input
                      type="email"
                      className="input input-bordered"
                      value={profile.email}
                      disabled
                    />
                  </div>
                  <div className="form-control lg:space-y-2">
                    <label className="label block mb-1">
                      <span className="label-text font-semibold flex items-center">
                        <FaPhone className="mr-2" />
                        {t('contact.mobile')}
                        {fieldStatus.mobilePhone === 'saving' && (
                          <span className="loading loading-spinner loading-xs ml-2" />
                        )}
                        {fieldStatus.mobilePhone === 'saved' && (
                          <span className="ml-2 text-success">✓</span>
                        )}
                      </span>
                    </label>
                    <input
                      type="tel"
                      className="input input-bordered"
                      value={profile.mobilePhone || ''}
                      onChange={(e) => handleFieldChange('mobilePhone', e.target.value)}
                      onBlur={() => flushFieldSave('mobilePhone')}
                      placeholder={t('contact.mobilePlaceholder')}
                    />
                  </div>
                  <div className="form-control lg:space-y-2">
                    <label className="label block mb-1">
                      <span className="label-text font-semibold flex items-center">
                        <FaGlobe className="mr-2" />
                        {t('contact.language')}
                        {fieldStatus.preferredLocale === 'saving' && (
                          <span className="loading loading-spinner loading-xs ml-2" />
                        )}
                        {fieldStatus.preferredLocale === 'saved' && (
                          <span className="ml-2 text-success">✓</span>
                        )}
                      </span>
                    </label>
                    <select
                      className="select select-bordered"
                      value={profile.preferredLocale || ''}
                      onChange={(e) =>
                        handleFieldChange('preferredLocale', e.target.value, { immediate: true })
                      }
                    >
                      {SUPPORTED_LOCALES.map((loc) => (
                        <option key={loc} value={loc}>
                          {t(`languages.${loc}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-2xl text-primary flex items-center">
                  <FaEnvelope className="mr-2" /> {t('notifications.title')}
                </h2>
                <p className="text-sm opacity-80 mb-6">{t('notifications.intro')}</p>
                <div className="form-control lg:space-y-2 max-w-md">
                  <label className="label block mb-1">
                    <span className="label-text font-semibold flex items-center">
                      {t('notifications.label')}
                      {fieldStatus.notificationPreference === 'saving' && (
                        <span className="loading loading-spinner loading-xs ml-2" />
                      )}
                      {fieldStatus.notificationPreference === 'saved' && (
                        <span className="ml-2 text-success">✓</span>
                      )}
                    </span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={profile.notificationPreference || 'inspiration'}
                    onChange={(e) =>
                      handleFieldChange('notificationPreference', e.target.value, {
                        immediate: true,
                      })
                    }
                  >
                    <option value="essential">{t('notifications.options.essential.label')}</option>
                    <option value="inspiration">
                      {t('notifications.options.inspiration.label')}
                    </option>
                    <option value="news">{t('notifications.options.news.label')}</option>
                  </select>
                  <p className="text-sm mt-2 italic opacity-90">
                    {t(
                      `notifications.options.${profile.notificationPreference || 'inspiration'}.description`,
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Billing Account */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-primary flex items-center">
                  <FaCreditCard className="mr-2" /> {t('billing.title')}
                </h2>
                <div className="form-control lg:space-y-2 mb-4">
                  <label className="label block mb-1">
                    <span className="label-text font-semibold">
                      {t('billing.vatNumber')}
                      {fieldStatus.fiscalNumber === 'saving' && (
                        <span className="loading loading-spinner loading-xs ml-2" />
                      )}
                      {fieldStatus.fiscalNumber === 'saved' && (
                        <span className="ml-2 text-success">✓</span>
                      )}
                    </span>
                  </label>
                  <input
                    className="input input-bordered"
                    value={profile.fiscalNumber || ''}
                    onChange={(e) => handleFieldChange('fiscalNumber', e.target.value)}
                    onBlur={() => flushFieldSave('fiscalNumber')}
                    placeholder={t('billing.vatPlaceholder')}
                  />
                </div>
                <div className="text-center">
                  <CreditsDisplay credits={credits} />
                  <p className="text-xs opacity-70 mt-2">{t('billing.historyHint')}</p>
                  <Link href={`/${locale}/buy-credits`} className="btn btn-primary mt-4">
                    <FaPlusCircle className="mr-2" /> {t('billing.addCredits')}
                  </Link>
                </div>
              </div>
            </div>

            {/* (Removed explicit Save buttons; autosave in effect.) */}

            {/* Creative Journey */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-primary flex items-center">
                  <FaBook className="mr-2" /> {t('journey.title')}
                </h2>
                <p className="opacity-80 text-sm mb-4">{t('journey.description')}</p>
                <div className="stats shadow w-full">
                  <Link
                    href={`/${locale}/my-stories`}
                    className="stat text-center hover:bg-base-200 transition-colors"
                    aria-label={t('journey.booksCreated')}
                  >
                    <div className="stat-title underline decoration-dotted">
                      {t('journey.booksCreated')}
                    </div>
                    <div className="stat-value text-primary">
                      {storyCount === null ? '—' : storyCount}
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {(error || success) && (
          // High z-index so toast appears above all elements
          <div className="toast toast-end z-[9999]">
            <div className={`alert ${error ? 'alert-error' : 'alert-success'}`}>
              <span>{error || success}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
