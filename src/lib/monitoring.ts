import * as Sentry from "@sentry/react-native";

// Crash/error reporting. No-ops unless EXPO_PUBLIC_SENTRY_DSN is set, so local
// dev and the open-source build stay quiet; production builds set the DSN via
// EAS env. Keeps Sentry usage behind one tiny surface.
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initMonitoring() {
  if (!dsn) return;
  Sentry.init({
    dsn,
    tracesSampleRate: 0.2,
    // Don't ship PII to the error tracker.
    sendDefaultPii: false,
  });
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!dsn) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

// Wraps the root component with Sentry's error boundary + navigation/perf
// instrumentation. No-ops (returns the component unchanged) without a DSN.
export function wrapApp<C>(Root: C): C {
  return dsn ? (Sentry.wrap(Root as never) as C) : Root;
}
