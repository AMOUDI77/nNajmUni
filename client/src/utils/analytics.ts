// Provider-neutral boundary; no contact or academic information is emitted.
export function trackEvent(
  name: string,
  context: Record<string, string | number> = {},
) {
  window.dispatchEvent(
    new CustomEvent("najmuni:analytics", { detail: { name, ...context } }),
  );
}
