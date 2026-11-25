import { z } from 'zod';

const provider = 'https://data-api.ecb.europa.eu/service/data/EXR/';
const positiveRate = z.string().regex(/^\d{1,8}(?:\.\d{1,12})?$/);

export async function getEcbLuluRate(currency: string, jobDate: string) {
  const code = z
    .string()
    .regex(/^[A-Z]{3}$/)
    .parse(currency);
  const endPeriod = z.iso.date().parse(jobDate);
  const key = `D.${code}.EUR.SP00.A`;
  const url = new URL(provider + key);
  url.search = new URLSearchParams({
    endPeriod,
    lastNObservations: '1',
    detail: 'dataonly',
    format: 'csvdata',
  }).toString();

  const response = await fetch(url, {
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 404 || response.status === 204) return null;
  if (!response.ok) throw new Error('ECB_EXCHANGE_RATE_REQUEST_FAILED');
  const [header = '', ...rows] = (await response.text()).trim().split(/\r?\n/);
  const columns = header.split(',');
  const keyIndex = columns.indexOf('KEY');
  const dayIndex = columns.indexOf('TIME_PERIOD');
  const rateIndex = columns.indexOf('OBS_VALUE');
  if (keyIndex < 0 || dayIndex < 0 || rateIndex < 0 || rows.length > 1)
    throw new Error('ECB_EXCHANGE_RATE_INVALID_RESPONSE');
  if (!rows.length) return null;

  const values = rows[0].split(',');
  const date = z.iso.date().safeParse(values[dayIndex]).data;
  const rate = positiveRate.safeParse(values[rateIndex]).data;
  if (values[keyIndex] !== `EXR.${key}` || !date || date > endPeriod || !rate || Number(rate) <= 0)
    throw new Error('ECB_EXCHANGE_RATE_INVALID_OBSERVATION');
  return { date, rate };
}
