"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useUser } from '@clerk/nextjs';
import CreditsDisplay from '@/components/CreditsDisplay';
import Link from 'next/link';
import { GENDER_OPTIONS, LITERARY_AGE_OPTIONS } from '@/constants/profileOptions';
import { SUPPORTED_LOCALES } from '@/config/locales';
import { FaUser, FaVenusMars, FaBirthdayCake, FaEnvelope, FaPhone, FaGlobe, FaSave, FaBook, FaCreditCard, FaPlusCircle } from 'react-icons/fa';

interface ProfileDetails {
  displayName: string;
  gender: string | null;
  literaryAge: string | null;
  preferredLocale: string | null;
  email: string;
  mobilePhone: string | null;
  fiscalNumber: string | null;
}

export default function AccountProfilePage() {
  const locale = useLocale();
  const t = useTranslations('ProfilePage');
  const { isLoaded, isSignedIn, user } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [credits, setCredits] = useState(0);
  const [storyCount, setStoryCount] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileDetails | null>(null);

  const fetchProfileData = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    try {
      setLoading(true);
  const [creditsRes, storyCountRes, profileRes] = await Promise.all([
        fetch('/api/my-credits'),
        fetch('/api/stories/count'),
        fetch('/api/profile')
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
          fiscalNumber: pr.author.fiscalNumber || ''
        });
      } else {
        setProfile({
          displayName: fullName,
          gender: null,
          literaryAge: null,
          preferredLocale: locale,
          email: emailAddr,
          mobilePhone: '',
          fiscalNumber: ''
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

  const handleFieldChange = (field: keyof ProfileDetails, value: string | null) => {
    setProfile(p => p ? { ...p, [field]: value } : p);
    setDirty(true);
  };

  const saveChanges = useCallback(async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const patchBody = {
        displayName: profile.displayName,
        gender: profile.gender,
        literaryAge: profile.literaryAge,
        preferredLocale: profile.preferredLocale,
        mobilePhone: profile.mobilePhone,
        fiscalNumber: profile.fiscalNumber
      };

      // Persist app-side profile
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody)
      });
  // (Optional) Updating Clerk user name skipped to avoid type mismatch; handled elsewhere in onboarding.

      if (profile.preferredLocale) {
        await fetch('/api/auth/update-locale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferredLocale: profile.preferredLocale })
        });
      }

      setDirty(false);
      setSuccess(t('success.saved'));
  } catch {
      setError(t('errors.saveFailed'));
    } finally {
      setSaving(false);
      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
    }
  }, [profile, t]);

  if (!isSignedIn) {
    return <div className="p-8 text-center">{t('signInPrompt')}</div>;
  }

  if (loading || !profile) {
    return <div className="flex justify-center items-center min-h-[50vh]"><span className="loading loading-spinner loading-lg" /></div>;
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
                <h2 className="card-title text-2xl text-primary flex items-center"><FaUser className="mr-2" /> {t('details.title')}</h2>
                <p className="text-sm opacity-80 mb-6">{t('details.description')}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-control">
                    <label className="label"><span className="label-text font-semibold flex items-center"><FaUser className="mr-2" />{t('details.displayName')}</span></label>
                    <input className="input input-bordered" value={profile.displayName} onChange={e => handleFieldChange('displayName', e.target.value)} />
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text font-semibold flex items-center"><FaVenusMars className="mr-2" />{t('details.gender')}</span></label>
                    <select className="select select-bordered" value={profile.gender || ''} onChange={e => handleFieldChange('gender', e.target.value || null)}>
                      <option value="">{t('details.selectGender')}</option>
                      {GENDER_OPTIONS.map(g => <option key={g} value={g}>{t(`genderOptions.${g}`)}</option>)}
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text font-semibold flex items-center"><FaBirthdayCake className="mr-2" />{t('details.ageRange')}</span></label>
                    <select className="select select-bordered" value={profile.literaryAge || ''} onChange={e => handleFieldChange('literaryAge', e.target.value || null)}>
                      <option value="">{t('details.selectAge')}</option>
                      {LITERARY_AGE_OPTIONS.map(a => <option key={a} value={a}>{t(`ageOptions.${a}`)}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-2xl text-primary flex items-center"><FaEnvelope className="mr-2" /> {t('contact.title')}</h2>
                <p className="text-sm opacity-80 mb-6">{t('contact.description')}</p>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="form-control">
                    <label className="label"><span className="label-text font-semibold flex items-center"><FaEnvelope className="mr-2" />{t('contact.email')}</span></label>
                    <input type="email" className="input input-bordered" value={profile.email} disabled />
                    <label className="label">
                      <span className="label-text-alt">{t('contact.emailHelp')}</span>
                    </label>
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text font-semibold flex items-center"><FaPhone className="mr-2" />{t('contact.mobile')}</span></label>
                    <input type="tel" className="input input-bordered" value={profile.mobilePhone || ''} onChange={e => handleFieldChange('mobilePhone', e.target.value)} placeholder={t('contact.mobilePlaceholder')} />
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text font-semibold flex items-center"><FaGlobe className="mr-2" />{t('contact.language')}</span></label>
                    <select className="select select-bordered" value={profile.preferredLocale || ''} onChange={e => handleFieldChange('preferredLocale', e.target.value)}>
                      {SUPPORTED_LOCALES.map(loc => (
                        <option key={loc} value={loc}>{t(`languages.${loc}`)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Billing Account */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-primary flex items-center"><FaCreditCard className="mr-2" /> {t('billing.title')}</h2>
                <div className="form-control mb-4">
                  <label className="label"><span className="label-text font-semibold">{t('billing.vatNumber')}</span></label>
                  <input className="input input-bordered" value={profile.fiscalNumber || ''} onChange={e => handleFieldChange('fiscalNumber', e.target.value)} placeholder={t('billing.vatPlaceholder')} />
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

            {/* Mobile Save Button moved below Billing for requested layout. fiscalNumber (VAT) included in PATCH body. */}
            <div className="text-center lg:hidden">
              <button className="btn btn-primary btn-lg mt-2" disabled={!dirty || saving} onClick={saveChanges}>
                {saving ? <span className="loading loading-spinner"></span> : <FaSave className="mr-2" />}
                {saving ? t('actions.saving') : t('actions.save')}
              </button>
            </div>

            {/* Save Button for larger screens */}
            <div className="hidden lg:block text-center">
              <button className="btn btn-primary btn-lg" disabled={!dirty || saving} onClick={saveChanges}>
                {saving ? <span className="loading loading-spinner"></span> : <FaSave className="mr-2" />}
                {saving ? t('actions.saving') : t('actions.save')}
              </button>
            </div>

            {/* Creative Journey */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-primary flex items-center"><FaBook className="mr-2" /> {t('journey.title')}</h2>
                <p className="opacity-80 text-sm mb-4">{t('journey.description')}</p>
                <div className="stats shadow w-full">
                  <Link href={`/${locale}/my-stories`} className="stat text-center hover:bg-base-200 transition-colors" aria-label={t('journey.booksCreated')}>
                    <div className="stat-title underline decoration-dotted">{t('journey.booksCreated')}</div>
                    <div className="stat-value text-primary">{storyCount === null ? '—' : storyCount}</div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {(error || success) && (
          <div className="toast toast-end">
            <div className={`alert ${error ? 'alert-error' : 'alert-success'}`}>
              <span>{error || success}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
