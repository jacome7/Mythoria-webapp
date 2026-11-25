/** @jest-environment node */
import { getEcbLuluRate } from './lulu-fx';

const header = 'KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE';

afterEach(() => jest.restoreAllMocks());

it('requests the last daily observation on or before the job date and preserves its exact rate', async () => {
  const fetch = jest
    .spyOn(global, 'fetch')
    .mockResolvedValue(
      new Response(`${header}\r\nEXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2026-11-20,1.09900\r\n`),
    );

  await expect(getEcbLuluRate('USD', '2026-11-22')).resolves.toEqual({
    date: '2026-11-20',
    rate: '1.09900',
  });
  expect(String(fetch.mock.calls[0][0])).toBe(
    'https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?endPeriod=2026-11-22&lastNObservations=1&detail=dataonly&format=csvdata',
  );
});

it.each([
  ['EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2026-11-23,1.09', 'future date'],
  ['EXR.D.GBP.EUR.SP00.A,D,GBP,EUR,SP00,A,2026-11-20,1.09', 'wrong currency'],
  ['EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2026-11-20,0', 'zero rate'],
])('rejects an unusable observation %s (%s)', async (row) => {
  jest.spyOn(global, 'fetch').mockResolvedValue(new Response(`${header}\n${row}`));
  await expect(getEcbLuluRate('USD', '2026-11-22')).rejects.toThrow('INVALID_OBSERVATION');
});

it('keeps a missing currency series unavailable', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));
  await expect(getEcbLuluRate('ZZZ', '2026-11-22')).resolves.toBeNull();
});
