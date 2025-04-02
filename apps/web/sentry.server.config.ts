import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://378e643aa098d2a48cfd3401fe3e916d@o4509078902013952.ingest.de.sentry.io/4509078957064272',
  tracesSampleRate: 1,
  debug: false,
  enabled: process.env.NODE_ENV === 'production',
});
