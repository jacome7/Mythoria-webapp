"use client";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { FaVenusMars, FaBirthdayCake, FaBullseye, FaUsers, FaLightbulb, FaHeart, FaGift, FaChild, FaBookOpen } from 'react-icons/fa';

// Enums from schema to ensure consistency
const GENDER_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const LITERARY_AGE_OPTIONS = [
  { value: 'school_age', label: 'School Age' },
  { value: 'teen', label: 'Teen' },
  { value: 'emerging_adult', label: 'Emerging Adult' },
  { value: 'experienced_adult', label: 'Experienced Adult' },
  { value: 'midlife_mentor_or_elder', label: 'Midlife Mentor or Elder' },
];

const GOAL_OPTIONS = [
  { value: 'family_keepsake', label: 'Create a family keepsake' },
  { value: 'personalized_gift', label: 'Give a unique, personalized gift' },
  { value: 'child_development', label: "Support a child's growth/education" },
  { value: 'fun_and_creativity', label: 'Just for fun & creativity' },
  { value: 'friend_group_memories', label: 'Preserve memories of a friend group' },
  { value: 'company_engagement', label: 'Energize my company' },
  { value: 'other', label: 'Other' },
];

const AUDIENCE_OPTIONS = [
  { value: 'my_child', label: 'My child' },
  { value: 'family_member', label: 'A family member' },
  { value: 'friend_group', label: 'A group of friends' },
  { value: 'myself', label: 'Myself' },
  { value: 'a_friend', label: 'A friend' },
  { value: 'varies', label: 'It varies' },
];

const INTEREST_OPTIONS = [
  { value: 'adventure_exploration', label: 'Adventure & Exploration' },
  { value: 'fantasy_magic', label: 'Fantasy & Magic' },
  { value: 'science_discovery', label: 'Science & Discovery' },
  { value: 'everyday_emotions', label: 'Everyday Life & Emotions' },
  { value: 'sports', label: 'Sports' },
  { value: 'comedy_fun', label: 'Comedy & Fun' },
  { value: 'educational', label: 'Educational' },
];


interface ProfileData {
  displayName: string;
  gender: string | null;
  literaryAge: string | null;
  primaryGoals: string[]; // multi-select
  primaryGoalOther: string | null;
  audiences: string[]; // multi-select
  interests: string[];
}

const FadeInSection = ({ children, isVisible }: { children: React.ReactNode, isVisible: boolean }) => (
  <div className={`transition-opacity duration-700 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
    {isVisible && children}
  </div>
);

export default function OnboardingProfilePage() {
  const t = useTranslations('OnboardingProfile');
  const locale = useLocale();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

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
            interests: data.author.interests || []
          };
          setProfile(p);
          // Pre-fill visibility if data exists
          if (p.gender) setGenderAnswered(true);
          if (p.literaryAge) setAgeAnswered(true);
          if (p.primaryGoals.length) setGoalsAnswered(true);
          if (p.audiences.length) setAudiencesAnswered(true);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const patchProfile = useCallback(async (patch: Partial<ProfileData>) => {
    if (!profile) return;
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      if (res.ok) {
        const data = await res.json();
  // Merge server authoritative fields; server returns plural arrays now
  setProfile(p => ({ ...(p as ProfileData), ...patch, ...data.author }));
        setSaveMessage('Saved ✓');
        setTimeout(() => setSaveMessage(null), 2000);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Save failed');
      }
    } catch {
      alert('Network error');
    } finally {
      setSaving(false);
    }
  }, [profile]);

  const debouncedPatch = useCallback((patch: Partial<ProfileData>) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => patchProfile(patch), 500);
  }, [patchProfile]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!profile) {
    return <div className="p-6 text-center">Could not load profile. Please try again later.</div>;
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto p-4 sm:p-8">
        <div className="hero bg-base-100 rounded-box shadow-xl mb-8">
          <div className="hero-content text-center">
            <div className="max-w-md">
              <h1 className="text-4xl font-bold text-primary">{t('title')}</h1>
              <p className="py-6">{t('intro')}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Preferred Name */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-2xl">{t('preferredName.section')}</h2>
                <p>{t('preferredName.help')}</p>
                <div className="form-control w-full max-w-xs">
                  <label className="label">
                    <span className="label-text">{t('preferredName.label')}</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Type here"
                    className="input input-bordered w-full"
                    value={profile.displayName}
                    onChange={e => setProfile(p => p ? { ...p, displayName: e.target.value } : p)}
                    onBlur={() => {
                      if (profile.displayName.trim()) {
                        patchProfile({ displayName: profile.displayName.trim() });
                      } else {
                        alert(t('errors.displayNameRequired'));
                      }
                    }}
                    required
                  />
                  {saveMessage && <span className="text-xs text-success mt-1">{t('saved')}</span>}
                </div>
              </div>
            </div>

            {/* Interactive Questions */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-2xl">{t('tailor.section')}</h2>
                <p></p>
                
                <div className="space-y-6 mt-4">
                  {/* Gender */}
                  <div className="form-control w-full max-w-xs">
                    <label className="label"><span className="label-text flex items-center"><FaVenusMars className="mr-2" /> {t('gender.label')}</span></label>
                    <select className="select select-bordered" value={profile.gender || ''} onChange={e => { debouncedPatch({ gender: e.target.value || null }); setGenderAnswered(true); }}>
                      <option disabled value="">Pick one</option>
                      {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>

                  {/* Literary Age */}
                  <FadeInSection isVisible={genderAnswered}>
                    <div className="form-control w-full max-w-xs">
                      <label className="label"><span className="label-text flex items-center"><FaBirthdayCake className="mr-2" /> {t('literaryAge.label')}</span></label>
                      <select className="select select-bordered" value={profile.literaryAge || ''} onChange={e => { debouncedPatch({ literaryAge: e.target.value || null }); setAgeAnswered(true); }}>
                        <option disabled value="">Pick one</option>
                        {LITERARY_AGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </FadeInSection>

                  {/* Primary Goals (multi-select) */}
                  <FadeInSection isVisible={ageAnswered}>
                    <div className="form-control w-full">
                      <label className="label"><span className="label-text flex items-center"><FaBullseye className="mr-2" /> {t('primaryGoal.label')}</span></label>
                      <div className="space-y-2">
                        {GOAL_OPTIONS.map(o => {
                          const checked = profile.primaryGoals.includes(o.value);
                          return (
                            <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                className="checkbox checkbox-primary"
                                checked={checked}
                                onChange={() => {
                                  const next = checked
                                    ? profile.primaryGoals.filter(v => v !== o.value)
                                    : [...profile.primaryGoals, o.value];
                                  patchProfile({ primaryGoals: next });
                                  setGoalsAnswered(next.length > 0);
                                }}
                              />
                              <span>{o.label}</span>
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
                            onChange={e => setProfile(p => p ? { ...p, primaryGoalOther: e.target.value } : p)}
                            onBlur={() => patchProfile({ primaryGoalOther: profile.primaryGoalOther || '' })}
                          />
                        </div>
                      )}
                    </div>
                  </FadeInSection>

                  {/* Audiences (multi-select) */}
                  <FadeInSection isVisible={goalsAnswered}>
                    <div className="form-control w-full">
                      <label className="label"><span className="label-text flex items-center"><FaUsers className="mr-2" /> {t('audience.label')}</span></label>
                      <div className="space-y-2">
                        {AUDIENCE_OPTIONS.map(o => {
                          const checked = profile.audiences.includes(o.value);
                          return (
                            <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                className="checkbox checkbox-primary"
                                checked={checked}
                                onChange={() => {
                                  const next = checked
                                    ? profile.audiences.filter(v => v !== o.value)
                                    : [...profile.audiences, o.value];
                                  patchProfile({ audiences: next });
                                  setAudiencesAnswered(next.length > 0);
                                }}
                              />
                              <span>{o.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </FadeInSection>

                  {/* Interests */}
                  <FadeInSection isVisible={audiencesAnswered}>
                    <div className="form-control w-full">
                      <label className="label"><span className="label-text flex items-center"><FaLightbulb className="mr-2" /> {t('interests.label')}</span></label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {INTEREST_OPTIONS.map(opt => {
                          const checked = profile.interests.includes(opt.value);
                          return (
                            <label key={opt.value} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-base-200">
                              <input type="checkbox" checked={checked} className="checkbox checkbox-primary" onChange={() => {
                                const next = checked ? profile.interests.filter(i => i !== opt.value) : [...profile.interests, opt.value];
                                debouncedPatch({ interests: next });
                              }} />
                              <span>{opt.label}</span>
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
                  <Link href={`/${locale}/tell-your-story`} className="btn btn-secondary btn-wide">Start Your Story</Link>
                </div>
              </div>
            </div>

            {/* What can you create? */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-2xl">{t('ideas.section')}</h2>
                <p></p>
                <ul className="list-none space-y-2 mt-4">
                  <li className="flex items-start"><FaChild className="text-secondary mr-3 mt-1 flex-shrink-0" /><span>{t('ideas.item1')}</span></li>
                  <li className="flex items-start"><FaHeart className="text-secondary mr-3 mt-1 flex-shrink-0" /><span>{t('ideas.item2')}</span></li>
                  <li className="flex items-start"><FaGift className="text-secondary mr-3 mt-1 flex-shrink-0" /><span>{t('ideas.item3')}</span></li>
                </ul>
              </div>
            </div>

            {/* Get Inspired */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-2xl">{t('inspiration.section')}</h2>
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
  {saving && <div className="toast toast-center toast-middle"><div className="alert alert-info"><span>{t('saving')}</span></div></div>}
      </div>
    </div>
  );
}
