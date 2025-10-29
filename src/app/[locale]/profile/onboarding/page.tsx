'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  FaVenusMars,
  FaBirthdayCake,
  FaBullseye,
  FaUsers,
  FaLightbulb,
  FaHeart,
  FaGift,
  FaChild,
  FaBookOpen,
  FaTicketAlt,
} from 'react-icons/fa';
import PromotionCodeRedeemer from '@/components/PromotionCodeRedeemer';

// Value lists; labels resolved via i18n (see messages OnboardingProfile.options)
const GENDER_OPTIONS = ['female', 'male', 'prefer_not_to_say'] as const;
const LITERARY_AGE_OPTIONS = [
  'teen',
  'emerging_adult',
  'experienced_adult',
  'midlife_mentor_or_elder',
] as const;
const GOAL_OPTIONS = [
  'family_keepsake',
  'personalized_gift',
  'child_development',
  'fun_and_creativity',
  'friend_group_memories',
  'company_engagement',
  'other',
] as const;
const AUDIENCE_OPTIONS = [
  'my_child',
  'family_member',
  'friend_group',
  'myself',
  'a_friend',
  'varies',
] as const;
const INTEREST_OPTIONS = [
  'adventure_exploration',
  'fantasy_magic',
  'science_discovery',
  'everyday_emotions',
  'sports',
  'comedy_fun',
  'educational',
] as const;

interface ProfileData {
  displayName: string;
  gender: string | null;
  literaryAge: string | null;
  primaryGoals: string[]; // multi-select
  primaryGoalOther: string | null;
  audiences: string[]; // multi-select
  interests: string[];
}

const FadeInSection = ({
  children,
  isVisible,
}: {
  children: React.ReactNode;
  isVisible: boolean;
}) => (
  <div
    className={`transition-opacity duration-700 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}
  >
    {isVisible && children}
  </div>
);

export default function OnboardingProfilePage() {
  const t = useTranslations('OnboardingProfile');
  const tVoucher = useTranslations('Voucher');
  const locale = useLocale();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null); // non-null indicates last save completed
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  // Track if welcome email has been triggered this session (localStorage-backed)
  const welcomeEmailTriggeredRef = useRef<boolean>(false);

  // State for interactive questions
  const [genderAnswered, setGenderAnswered] = useState(false);
  const [ageAnswered, setAgeAnswered] = useState(false);
  const [goalsAnswered, setGoalsAnswered] = useState(false);
  const [audiencesAnswered, setAudiencesAnswered] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          const p = {
            displayName: data.author.displayName,
            gender: data.author.gender,
            literaryAge: data.author.literaryAge,
            primaryGoals: data.author.primaryGoals || [],
            primaryGoalOther: data.author.primaryGoalOther,
            audiences: data.author.audiences || [],
            interests: data.author.interests || [],
          };
          setProfile(p);
          // Pre-fill visibility if data exists
          if (p.gender) setGenderAnswered(true);
          if (p.literaryAge) setAgeAnswered(true);
          if (p.primaryGoals.length) setGoalsAnswered(true);
          if (p.audiences.length) setAudiencesAnswered(true);

          // Check if welcome email was already triggered in localStorage
          if (typeof window !== 'undefined') {
            const storageKey = `welcome_email_sent_${data.author.email || 'unknown'}`;
            const alreadySent = localStorage.getItem(storageKey);
            if (alreadySent === 'true') {
              welcomeEmailTriggeredRef.current = true;
            }
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const patchProfile = useCallback(
    async (patch: Partial<ProfileData>) => {
      if (!profile) return;
      setSaving(true);
      try {
        const res = await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (res.ok) {
          const data = await res.json();
          // Merge server authoritative fields; server returns plural arrays now
          setProfile((p) => ({ ...(p as ProfileData), ...patch, ...data.author }));
          setSaveMessage('saved'); // marker; actual text comes from i18n key
          setTimeout(() => setSaveMessage(null), 2000);

          // If displayName was updated and welcome email not yet triggered, mark it in localStorage
          if (
            patch.displayName &&
            !welcomeEmailTriggeredRef.current &&
            typeof window !== 'undefined'
          ) {
            const email = (data.author as { email?: string }).email || 'unknown';
            const storageKey = `welcome_email_sent_${email}`;
            // Mark locally to prevent duplicate client-side triggers
            localStorage.setItem(storageKey, 'true');
            welcomeEmailTriggeredRef.current = true;
          }
        } else {
          const err = await res.json().catch(() => ({}));
          alert(err.error || 'Save failed');
        }
      } catch {
        alert('Network error');
      } finally {
        setSaving(false);
      }
    },
    [profile],
  );

  const debouncedPatch = useCallback(
    (patch: Partial<ProfileData>) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => patchProfile(patch), 500);
    },
    [patchProfile],
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!profile) {
    return <div className="p-6 text-center">{t('errors.loadFailed')}</div>;
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto p-4 sm:p-8">
        <div className="hero bg-base-100 rounded-box shadow-xl mb-8">
          <div className="hero-content text-center w-full">
            <div className="w-full max-w-3xl mx-auto px-2">
              <h1 className="text-4xl md:text-5xl font-bold text-primary leading-tight">
                {t('title')}
              </h1>
              <p className="py-6 text-lg md:text-xl">{t('intro')}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Preferred Name */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-primary text-2xl">{t('preferredName.section')}</h2>
                <p>{t('preferredName.help')}</p>
                <div className="form-control w-full max-w-xs">
                  <label className="label">
                    <span className="label-text flex flex-wrap items-center gap-2 whitespace-normal break-words">
                      {t('preferredName.label')}
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="Type here"
                    className="input input-bordered w-full"
                    value={profile.displayName}
                    onChange={(e) =>
                      setProfile((p) => (p ? { ...p, displayName: e.target.value } : p))
                    }
                    onBlur={() => {
                      if (profile.displayName.trim()) {
                        patchProfile({ displayName: profile.displayName.trim() });
                      } else {
                        alert(t('errors.displayNameRequired'));
                      }
                    }}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Interactive Questions */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-primary text-2xl">{t('tailor.section')}</h2>
                <p></p>

                <div className="space-y-6 mt-4">
                  {/* Gender */}
                  <div className="form-control w-full max-w-xs">
                    <label className="label">
                      <span className="label-text flex flex-wrap items-start gap-2 whitespace-normal break-words">
                        <FaVenusMars className="mt-0.5" /> {t('gender.label')}
                      </span>
                    </label>
                    <select
                      className="select select-bordered"
                      value={profile.gender || ''}
                      onChange={(e) => {
                        debouncedPatch({ gender: e.target.value || null });
                        setGenderAnswered(true);
                      }}
                    >
                      <option disabled value="">
                        {t('pickOne')}
                      </option>
                      {GENDER_OPTIONS.map((v) => (
                        <option key={v} value={v}>
                          {t(`options.gender.${v}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Literary Age */}
                  <FadeInSection isVisible={genderAnswered}>
                    <div className="form-control w-full max-w-xs">
                      <label className="label">
                        <span className="label-text flex flex-wrap items-start gap-2 whitespace-normal break-words">
                          <FaBirthdayCake className="mt-0.5" /> {t('literaryAge.label')}
                        </span>
                      </label>
                      <select
                        className="select select-bordered"
                        value={profile.literaryAge || ''}
                        onChange={(e) => {
                          debouncedPatch({ literaryAge: e.target.value || null });
                          setAgeAnswered(true);
                        }}
                      >
                        <option disabled value="">
                          {t('pickOne')}
                        </option>
                        {LITERARY_AGE_OPTIONS.map((v) => (
                          <option key={v} value={v}>
                            {t(`options.ageOptions.${v}`, {
                              fallback: t(`options.literaryAge.${v}`),
                            })}
                          </option>
                        ))}
                      </select>
                    </div>
                  </FadeInSection>

                  {/* Primary Goals (multi-select) */}
                  <FadeInSection isVisible={ageAnswered}>
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text flex flex-wrap items-start gap-2 whitespace-normal break-words">
                          <FaBullseye className="mt-0.5" /> {t('primaryGoal.label')}
                        </span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {GOAL_OPTIONS.map((v) => {
                          const checked = profile.primaryGoals.includes(v);
                          return (
                            <label
                              key={v}
                              className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-base-200"
                            >
                              <input
                                type="checkbox"
                                className="checkbox checkbox-primary"
                                checked={checked}
                                onChange={() => {
                                  const next = checked
                                    ? profile.primaryGoals.filter((val) => val !== v)
                                    : [...profile.primaryGoals, v];
                                  patchProfile({ primaryGoals: next });
                                  setGoalsAnswered(next.length > 0);
                                }}
                              />
                              <span>{t(`options.primaryGoals.${v}`)}</span>
                            </label>
                          );
                        })}
                      </div>
                      {profile.primaryGoals.includes('other') && (
                        <div className="mt-2">
                          <input
                            type="text"
                            placeholder={t('primaryGoal.otherPlaceholder')}
                            className="input input-bordered w-full max-w-sm"
                            value={profile.primaryGoalOther || ''}
                            onChange={(e) =>
                              setProfile((p) =>
                                p ? { ...p, primaryGoalOther: e.target.value } : p,
                              )
                            }
                            onBlur={() =>
                              patchProfile({ primaryGoalOther: profile.primaryGoalOther || '' })
                            }
                          />
                        </div>
                      )}
                    </div>
                  </FadeInSection>

                  {/* Audiences (multi-select) */}
                  <FadeInSection isVisible={goalsAnswered}>
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text flex flex-wrap items-start gap-2 whitespace-normal break-words">
                          <FaUsers className="mt-0.5" /> {t('audience.label')}
                        </span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {AUDIENCE_OPTIONS.map((v) => {
                          const checked = profile.audiences.includes(v);
                          return (
                            <label
                              key={v}
                              className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-base-200"
                            >
                              <input
                                type="checkbox"
                                className="checkbox checkbox-primary"
                                checked={checked}
                                onChange={() => {
                                  const next = checked
                                    ? profile.audiences.filter((val) => val !== v)
                                    : [...profile.audiences, v];
                                  patchProfile({ audiences: next });
                                  setAudiencesAnswered(next.length > 0);
                                }}
                              />
                              <span>{t(`options.audiences.${v}`)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </FadeInSection>

                  {/* Interests */}
                  <FadeInSection isVisible={audiencesAnswered}>
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text flex flex-wrap items-start gap-2 whitespace-normal break-words">
                          <FaLightbulb className="mt-0.5" /> {t('interests.label')}
                        </span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {INTEREST_OPTIONS.map((v) => {
                          const checked = profile.interests.includes(v);
                          return (
                            <label
                              key={v}
                              className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-base-200"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                className="checkbox checkbox-primary"
                                onChange={() => {
                                  const next = checked
                                    ? profile.interests.filter((i) => i !== v)
                                    : [...profile.interests, v];
                                  debouncedPatch({ interests: next });
                                }}
                              />
                              <span>{t(`options.interests.${v}`)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </FadeInSection>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Gift Section */}
            <div className="card bg-primary text-primary-content shadow-xl">
              <div className="card-body items-center text-center">
                <FaGift className="text-4xl mb-4" />
                <h2 className="card-title text-2xl">{t('gift.section')}</h2>
                <p>{t.rich('gift.copy', { credits: 5 })}</p>
                <div className="card-actions justify-center mt-4">
                  <Link href={`/${locale}/tell-your-story`} className="btn btn-secondary btn-wide">
                    {t('gift.button.start')}
                  </Link>
                </div>
              </div>
            </div>

            {/* Promo / Referral Code Section (reused component) */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex items-center gap-3 mb-2">
                  <FaTicketAlt className="text-primary text-2xl" />
                  <h2 className="card-title text-primary text-2xl m-0">
                    {tVoucher('sectionHeading')}
                  </h2>
                </div>
                <p className="mb-4 opacity-80">{tVoucher('sectionSubheading')}</p>
                <PromotionCodeRedeemer compact />
              </div>
            </div>

            {/* What can you create? */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-primary text-2xl">{t('ideas.section')}</h2>
                <p></p>
                <ul className="list-none space-y-2 mt-4">
                  <li className="flex items-start">
                    <FaChild className="text-primary mr-3 mt-1 flex-shrink-0" />
                    <span>{t('ideas.item1')}</span>
                  </li>
                  <li className="flex items-start">
                    <FaHeart className="text-primary mr-3 mt-1 flex-shrink-0" />
                    <span>{t('ideas.item2')}</span>
                  </li>
                  <li className="flex items-start">
                    <FaGift className="text-primary mr-3 mt-1 flex-shrink-0" />
                    <span>{t('ideas.item3')}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Get Inspired */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-primary text-2xl">{t('inspiration.section')}</h2>
                <p>{t('inspiration.copy')}</p>
                <div className="card-actions justify-end mt-4">
                  <Link href={`/${locale}/get-inspired`} className="btn btn-ghost text-accent">
                    <FaBookOpen className="mr-2" />
                    {t('inspiration.button')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        {(saving || saveMessage) && (
          // Added high z-index to ensure toast appears above all other elements
          <div className="toast toast-end toast-middle z-[9999]">
            <div className={`alert ${saving ? 'alert-info' : 'alert-success'}`}>
              <span>{t(saving ? 'saving' : 'saved')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
