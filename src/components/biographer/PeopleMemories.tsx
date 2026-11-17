'use client';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { concatenate, wav } from '@/utils/biographer/audio';

type Contributor = {
  id: string;
  name: string;
  relationship?: string;
  status: string;
  accessStatus: string;
  lastActivity?: string | null;
  responseCount: number;
  recordedSeconds: number;
  wordCount: number;
  photoCount: number;
  reviewed: boolean;
  newMaterial: boolean;
  contributionRevision: number;
};
type Contribution = {
  participant: Contributor;
  turns: Array<{ id: string; text: string; role: string; included: boolean; createdAt: string }>;
  segments: Array<{ id: string; turnId: string; sequence: number }>;
  assets: Array<{ id: string; caption: string; included: boolean }>;
};
export default function PeopleMemories({ projectId }: { projectId: string }) {
  const t = useTranslations('Biographer.people');
  const base = `/api/biographer/projects/${projectId}/contributors`;
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [selected, setSelected] = useState<Contribution>();
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [link, setLink] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [playback, setPlayback] = useState('');
  const [followup, setFollowup] = useState('');
  const load = useCallback(async () => {
    const response = await fetch(base, { cache: 'no-store' });
    if (!response.ok) throw new Error();
    const data = await response.json();
    setContributors(data.contributors);
  }, [base]);
  useEffect(() => {
    void load().catch(() => setError(t('failed')));
  }, [load, t]);
  useEffect(
    () => () => {
      if (playback) URL.revokeObjectURL(playback);
    },
    [playback],
  );
  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await task();
    } catch {
      setError(t('failed'));
    } finally {
      setBusy(false);
    }
  };
  const open = async (id: string) => {
    const response = await fetch(`${base}/${id}`, { cache: 'no-store' });
    if (!response.ok) throw new Error();
    setSelected(await response.json());
  };
  const invite = () =>
    run(async () => {
      const response = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, relationship }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      const url = new URL(data.inviteUrl, window.location.origin).toString();
      setLink(url);
      setMessage(t('invitation', { name }));
      setName('');
      setRelationship('');
      await load();
    });
  const command = (action: string) =>
    run(async () => {
      if (!selected) return;
      const response = await fetch(`${base}/${selected.participant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ...(action === 'followUp' ? { text: followup } : {}),
          ...(action === 'review' ? { revision: selected.participant.contributionRevision } : {}),
        }),
      });
      if (!response.ok) throw new Error();
      const result = await response.json();
      if (result.resumeUrl || result.inviteUrl) {
        setLink(new URL(result.resumeUrl || result.inviteUrl, window.location.origin).toString());
        setMessage(
          result.inviteUrl
            ? t('invitation', { name: selected.participant.name })
            : t('recoveryMessage'),
        );
      }
      if (action === 'followUp') setFollowup('');
      await open(selected.participant.id);
      await load();
    });
  const changeTurn = (turnId: string, included: boolean) =>
    run(async () => {
      if (!selected) return;
      const response = await fetch(`${base}/${selected.participant.id}/turns/${turnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ included }),
      });
      if (!response.ok) throw new Error();
      await open(selected.participant.id);
      await load();
    });
  const changePhoto = (assetId: string, included: boolean) =>
    run(async () => {
      if (!selected) return;
      const response = await fetch(`${base}/${selected.participant.id}/photos/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ included }),
      });
      if (!response.ok) throw new Error();
      await open(selected.participant.id);
      await load();
    });
  const listen = (turnId: string) =>
    run(async () => {
      if (!selected) return;
      const segments = selected.segments
        .filter((s) => s.turnId === turnId)
        .sort((a, b) => a.sequence - b.sequence);
      const chunks = await Promise.all(
        segments.map(async (s) => {
          const r = await fetch(`${base}/${selected.participant.id}/segments/${s.id}`);
          if (!r.ok) throw new Error();
          return r.arrayBuffer();
        }),
      );
      if (chunks.length) setPlayback(URL.createObjectURL(wav(concatenate(chunks))));
    });
  return (
    <section className="space-y-5">
      <h2 className="text-xl font-bold">{t('heading')}</h2>
      <p>{t('intro')}</p>
      {error && (
        <p role="alert" className="alert alert-warning">
          {error}
        </p>
      )}
      <form
        className="card bg-base-200 p-4 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void invite();
        }}
      >
        <label>
          {t('name')}
          <input
            className="input input-bordered w-full"
            value={name}
            maxLength={100}
            required
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          {t('relationship')}
          <input
            className="input input-bordered w-full"
            value={relationship}
            maxLength={100}
            onChange={(e) => setRelationship(e.target.value)}
          />
        </label>
        <button className="btn btn-primary self-start" disabled={busy || !name.trim()}>
          {t('createInvite')}
        </button>
      </form>
      {link && (
        <div className="card bg-base-100 border p-4 gap-3">
          <p>{t('keepPrivate')}</p>
          <textarea
            aria-label={t('invitationText')}
            className="textarea textarea-bordered"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <input
            aria-label={t('link')}
            className="input input-bordered w-full"
            readOnly
            value={link}
          />
          <div className="flex gap-2 flex-wrap">
            <button
              className="btn btn-outline"
              onClick={() => void navigator.clipboard.writeText(`${message}\n${link}`)}
            >
              {t('copy')}
            </button>
            <button
              className="btn btn-outline"
              onClick={() => {
                if (navigator.share)
                  void navigator.share({ text: message, url: link }).catch(() => undefined);
                else void navigator.clipboard.writeText(`${message}\n${link}`);
              }}
            >
              {t('share')}
            </button>
            <a
              className="btn btn-outline"
              target="_blank"
              rel="noopener noreferrer"
              href={`https://wa.me/?text=${encodeURIComponent(`${message}\n${link}`)}`}
            >
              {t('whatsapp')}
            </a>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>{t('name')}</th>
              <th>{t('status')}</th>
              <th>{t('contributions')}</th>
              <th>{t('lastActivity')}</th>
              <th>{t('review')}</th>
            </tr>
          </thead>
          <tbody>
            {contributors.map((person) => (
              <tr key={person.id}>
                <td>
                  <button className="link" onClick={() => void run(() => open(person.id))}>
                    {person.name}
                  </button>{' '}
                  {person.relationship && (
                    <span className="opacity-70">— {person.relationship}</span>
                  )}
                </td>
                <td>{t(`statuses.${person.status}` as 'statuses.invited')}</td>
                <td>{t(`accessStates.${person.accessStatus}` as 'accessStates.active')}</td>
                <td>
                  {t('counts', {
                    responses: person.responseCount,
                    minutes: Math.round(person.recordedSeconds / 60),
                    words: person.wordCount,
                    photos: person.photoCount,
                  })}
                </td>
                <td>
                  {person.lastActivity ? new Date(person.lastActivity).toLocaleString() : '—'}
                </td>
                <td>
                  {person.newMaterial ? t('newMaterial') : person.reviewed ? t('reviewed') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <article className="card border p-5 gap-4">
          <h3 className="text-lg font-semibold">{selected.participant.name}</h3>
          <div className="flex gap-2 flex-wrap">
            <button className="btn btn-sm" disabled={busy} onClick={() => void command('review')}>
              {t('markReviewed')}
            </button>
            <button
              className="btn btn-sm"
              disabled={busy}
              onClick={() =>
                void command(selected.participant.status === 'closed' ? 'reopen' : 'close')
              }
            >
              {selected.participant.status === 'closed' ? t('reopen') : t('close')}
            </button>
            <button
              className="btn btn-sm"
              disabled={busy}
              onClick={() =>
                void command(selected.participant.status === 'invited' ? 'renew' : 'rotate')
              }
            >
              {t('replaceLink')}
            </button>
            <button className="btn btn-sm" disabled={busy} onClick={() => void command('revoke')}>
              {t('revokeAccess')}
            </button>
          </div>
          <p className="text-sm">{t('rotationWarning')}</p>
          <label>
            {t('followup')}
            <textarea
              className="textarea textarea-bordered w-full"
              maxLength={1000}
              value={followup}
              onChange={(e) => setFollowup(e.target.value)}
            />
          </label>
          <button
            className="btn btn-sm self-start"
            disabled={busy || !followup.trim()}
            onClick={() => void command('followUp')}
          >
            {t('saveFollowup')}
          </button>
          {playback && <audio controls src={playback} />}
          {selected.turns.map((turn) => (
            <div key={turn.id} className="border-t pt-3">
              <p className="text-xs opacity-70">
                {new Date(turn.createdAt).toLocaleString()} ·{' '}
                {turn.role === 'user' ? selected.participant.name : t('biographer')}
              </p>
              <p className="whitespace-pre-wrap">{turn.text || t('transcriptPending')}</p>
              {turn.role === 'user' && (
                <div className="flex gap-2">
                  {selected.segments.some((s) => s.turnId === turn.id) && (
                    <button className="btn btn-sm" onClick={() => void listen(turn.id)}>
                      {t('listen')}
                    </button>
                  )}
                  <button
                    className="btn btn-sm"
                    onClick={() => void changeTurn(turn.id, !turn.included)}
                  >
                    {turn.included ? t('exclude') : t('include')}
                  </button>
                </div>
              )}
            </div>
          ))}
          <div className="grid gap-3 sm:grid-cols-3">
            {selected.assets.map((asset) => (
              <figure key={asset.id}>
                <Image
                  unoptimized
                  width={400}
                  height={300}
                  alt={asset.caption || t('photo')}
                  src={`${base}/${selected.participant.id}/photos/${asset.id}`}
                />
                <figcaption>{asset.caption}</figcaption>
                <button
                  className="btn btn-sm"
                  disabled={busy}
                  onClick={() => void changePhoto(asset.id, !asset.included)}
                >
                  {asset.included ? t('exclude') : t('include')}
                </button>
              </figure>
            ))}
          </div>
        </article>
      )}
    </section>
  );
}
