import { config } from 'dotenv';
import { reconcileProductAnalytics } from '../src/lib/analytics/product-reconciliation';

config({ path: '.env.local', quiet: true });

reconcileProductAnalytics()
  .then((report) => {
    console.log(JSON.stringify(report, null, 2));
    if (report.alerts.length > 0) process.exitCode = 1;
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
