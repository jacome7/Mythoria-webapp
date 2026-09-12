'use client';
import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useLocale, useTranslations } from 'next-intl';
import PartnerSignIn from './PartnerSignIn';
import ReferralFaq from './ReferralFaq';
type Row = Record<string, string | number | boolean | null>;
type Summary = {
  owner: { displayName: string; code: string };
  commissionRateBps: number;
  visits: Row;
  funnel: Row[];
  financial: Row[];
  payments: Row;
};
export default function PartnerPortal() {
  const { isLoaded, isSignedIn } = useUser();
  const t = useTranslations('Referrals');
  const locale = useLocale();
  const [members, setMembers] = useState<Array<{ membershipId: string; displayName: string }>>([]);
  const [membership, setMembership] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [settlements, setSettlements] = useState<Row[]>([]);
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    status: '',
    purchase: '',
    locale: '',
    country: '',
  });
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statementId, setStatementId] = useState('');
  const [statement, setStatement] = useState<{ statement: Row; items: Row[] } | null>(null);
  useEffect(() => {
    setStatement(null);
    if (!statementId || !membership) return;
    let cancelled = false;
    void fetch(
      `/api/referral-portal/statement?${new URLSearchParams({ membership, id: statementId })}`,
      { cache: 'no-store' },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error('statement');
        const data = await response.json();
        if (!cancelled) setStatement(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [statementId, membership]);
  const money = (v: unknown) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(
      Number(v || 0) / 100,
    );
  const date = (v: unknown) => (v ? new Date(String(v)).toLocaleDateString(locale) : '—');
  useEffect(() => {
    if (!isSignedIn) return;
    void fetch('/api/referral-portal/memberships', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('membership');
        const data = await response.json();
        setMembers(data);
        setMembership(data[0]?.membershipId || '');
      })
      .catch(() => setError(true));
  }, [isSignedIn]);
  useEffect(() => {
    if (!membership) return;
    if (filters.country && filters.country.length !== 2) return;
    if (filters.from && filters.to && filters.from >= filters.to) {
      setError(true);
      return;
    }
    let cancelled = false;
    setError(false);
    const params = new URLSearchParams({ membership, page: String(page), limit: '25' });
    for (const [key, value] of Object.entries(filters))
      if (value)
        params.set(
          key,
          key === 'from' || key === 'to' ? new Date(`${value}T00:00:00Z`).toISOString() : value,
        );
    void Promise.all(
      ['summary', 'commissions', 'settlements'].map(async (action) => {
        const response = await fetch(`/api/referral-portal/${action}?${params}`, {
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('request');
        return response.json();
      }),
    )
      .then(([s, c, p]) => {
        if (!cancelled) {
          setSummary(s);
          setRows(c.items);
          setSettlements(p.items);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [membership, page, filters, reload]);
  if (!isLoaded) return <p>{t('loading')}</p>;
  if (!isSignedIn) return <PartnerSignIn />;
  if (error && !summary)
    return (
      <div role="alert" className="alert">
        <p>
          {t('inviteRequired')} {t('error')}
        </p>
        <button className="btn" onClick={() => setReload((r) => r + 1)}>
          {t('refresh')}
        </button>
      </div>
    );
  if (!summary) return <p role="status">{t('loading')}</p>;
  const total = (key: string) => summary.financial.reduce((n, r) => n + Number(r[key] || 0), 0);
  const statusMoney = (status: string) =>
    summary.financial
      .filter((r) => r.status === status)
      .reduce((n, r) => n + Number(r.commission || 0), 0);
  return (
    <>
      {error && (
        <p role="alert" className="alert alert-error mb-4">
          {t('error')}
        </p>
      )}
      <div className="card bg-base-100 border border-base-300 mb-6">
        <div className="card-body">
          <h2 className="card-title">{summary.owner.displayName}</h2>
          {members.length > 1 && (
            <select
              aria-label={t('title')}
              className="select select-bordered"
              value={membership}
              onChange={(e) => {
                setMembership(e.target.value);
                setStatementId('');
                setPage(1);
              }}
            >
              {members.map((m) => (
                <option key={m.membershipId} value={m.membershipId}>
                  {m.displayName}
                </option>
              ))}
            </select>
          )}
          <p className="font-mono break-all">https://mythoria.pt/r/{summary.owner.code}</p>
          <div className="flex flex-wrap gap-4 items-center">
            <button
              className="btn btn-primary"
              onClick={() => {
                void navigator.clipboard
                  .writeText(`https://mythoria.pt/r/${summary.owner.code}`)
                  .then(() => setCopied(true));
              }}
            >
              {t(copied ? 'copied' : 'copyLink')}
            </button>
            <a href="#referral-faq" className="link">
              {t('howItWorks')}
            </a>
            <span>
              {t('yourRate')}:{' '}
              {new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 2 }).format(
                summary.commissionRateBps / 10000,
              )}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mb-6 print:hidden">
        {(['from', 'to'] as const).map((key) => (
          <label key={key}>
            <span className="block">{t(key)}</span>
            <input
              type="date"
              className="input input-bordered"
              value={filters[key]}
              onChange={(e) => {
                setFilters({ ...filters, [key]: e.target.value });
                setPage(1);
              }}
            />
          </label>
        ))}
        <label>
          <span className="block">{t('status')}</span>
          <select
            className="select select-bordered"
            value={filters.status}
            onChange={(e) => {
              setFilters({ ...filters, status: e.target.value });
              setPage(1);
            }}
          >
            <option value="">{t('all')}</option>
            {(
              [
                'blocked',
                'pending',
                'approved',
                'payable',
                'paid',
                'cancelled',
                'reversed',
              ] as const
            ).map((s) => (
              <option key={s} value={s}>
                {t(s)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="block">{t('purchaseType')}</span>
          <select
            className="select select-bordered"
            value={filters.purchase}
            onChange={(e) => setFilters({ ...filters, purchase: e.target.value })}
          >
            <option value="">{t('all')}</option>
            <option value="first">{t('first')}</option>
            <option value="repeat">{t('repeat')}</option>
          </select>
        </label>
        <label>
          <span className="block">{t('language')}</span>
          <select
            className="select select-bordered"
            value={filters.locale}
            onChange={(e) => setFilters({ ...filters, locale: e.target.value })}
          >
            <option value="">{t('all')}</option>
            {['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="block">{t('country')}</span>
          <input
            className="input input-bordered w-24"
            maxLength={2}
            value={filters.country}
            onChange={(e) => setFilters({ ...filters, country: e.target.value.toUpperCase() })}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('visits'), value: summary.visits.visits },
          { label: t('visitors'), value: summary.visits.visitors },
          { label: t('revenue'), value: money(total('revenue')) },
          { label: t('paid'), value: money(summary.payments.paid) },
          ...(['pending', 'approved', 'payable'] as const).map((s) => ({
            label: t(s),
            value: money(statusMoney(s)),
          })),
          { label: t('reversed'), value: money(total('reversals')) },
          { label: t('first'), value: total('first_purchases') },
          { label: t('repeat'), value: total('repeat_purchases') },
          ...(['registration', 'started', 'generated', 'published'] as const).map((k) => ({
            label: t(k),
            value:
              summary.funnel.find(
                (r) => r.event_type === (k === 'registration' ? k : `story_${k}`),
              )?.[k === 'started' ? 'customers' : 'count'] || 0,
          })),
        ].map((card) => (
          <div key={card.label} className="stat rounded-box bg-base-100 border border-base-300">
            <div className="stat-title whitespace-normal">{card.label}</div>
            <div className="stat-value text-2xl">{String(card.value ?? 0)}</div>
          </div>
        ))}
      </div>
      <h2 className="text-2xl font-bold mt-8 mb-4">{t('transactions')}</h2>
      <div className="overflow-x-auto">
        <table className="table bg-base-100">
          <thead>
            <tr>
              {(['date', 'customer', 'amount', 'rate', 'commission', 'status'] as const).map(
                (k) => (
                  <th key={k}>{t(k)}</th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td>{date(r.created_at)}</td>
                <td>#{String(r.customer_reference).slice(0, 8).toUpperCase()}</td>
                <td>{r.gross_amount_cents === null ? '—' : money(r.gross_amount_cents)}</td>
                <td>
                  {new Intl.NumberFormat(locale, {
                    style: 'percent',
                    maximumFractionDigits: 2,
                  }).format(Number(r.commission_rate_bps) / 10000)}
                </td>
                <td>{money(r.net_commission_cents)}</td>
                <td>
                  {t(String(r.status) as 'pending')}
                  {(r.dispute_open || r.under_review) && ` · ${t('held')}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="p-4">{t('empty')}</p>}
      </div>
      <div className="flex gap-3 my-4 print:hidden">
        <button className="btn" disabled={page === 1} onClick={() => setPage(page - 1)}>
          {t('previous')}
        </button>
        <button className="btn" disabled={rows.length < 25} onClick={() => setPage(page + 1)}>
          {t('next')}
        </button>
      </div>
      <h2 className="text-2xl font-bold mt-8 mb-4">{t('settlements')}</h2>
      <div className="overflow-x-auto">
        <table className="table bg-base-100">
          <thead>
            <tr>
              <th>{t('from')}</th>
              <th>{t('to')}</th>
              <th>{t('amount')}</th>
              <th>{t('status')}</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map((r) => (
              <tr key={String(r.id)}>
                <td>{date(r.periodStart)}</td>
                <td>{date(r.periodEnd)}</td>
                <td>
                  <button className="link" onClick={() => setStatementId(String(r.id))}>
                    {money(r.netPaymentCents)}
                  </button>
                </td>
                <td>{t(String(r.status) as 'paid')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn mt-4 print:hidden" onClick={() => window.print()}>
        {t('print')}
      </button>
      {statement && (
        <section className="mt-6">
          <h3 className="text-xl font-bold">
            {t('settlements')}: {date(statement.statement.periodStart)} –{' '}
            {date(statement.statement.periodEnd)}
          </h3>
          <p>
            {t('amount')}: {money(statement.statement.netPaymentCents)} · {t('status')}:{' '}
            {t(String(statement.statement.status) as 'paid')}
          </p>
          {!!statement.statement.paidAt && (
            <p>
              {t('paid')}: {date(statement.statement.paidAt)} ·{' '}
              {String(statement.statement.externalPaymentReference || '')}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('date')}</th>
                  <th>{t('customer')}</th>
                  <th>{t('commission')}</th>
                </tr>
              </thead>
              <tbody>
                {statement.items.map((item, i) => (
                  <tr key={i}>
                    <td>{date(item.occurred_at)}</td>
                    <td>#{String(item.customer_reference).slice(0, 8).toUpperCase()}</td>
                    <td>{money(item.signed_amount_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <ReferralFaq rateBps={summary.commissionRateBps} />
    </>
  );
}
