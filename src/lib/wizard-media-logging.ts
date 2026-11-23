import { randomUUID } from 'node:crypto';
import { createLogger, format, transports } from 'winston';

export const wizardMediaLogger = createLogger({
  defaultMeta: { service: 'mythoria-webapp', component: 'wizard-media' },
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

export function wizardMediaRequestId(headers: Headers): string {
  const candidate = headers.get('x-request-id');
  return candidate && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(candidate)
    ? candidate
    : randomUUID();
}
