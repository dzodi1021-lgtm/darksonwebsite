interface CounterPayload {
  count?: number;
}

const COUNTER_API_BASE_URL =
  process.env.COUNTER_API_BASE_URL?.trim() || "https://api.counterapi.dev/v1";
export const VIEW_COUNTER_NAMESPACE =
  process.env.VIEW_COUNTER_NAMESPACE?.trim() || "darksonwebsite";
export const VIEW_COUNTER_NAME =
  process.env.VIEW_COUNTER_NAME?.trim() ||
  (process.env.NODE_ENV === "development" ? "views-dev-v3" : "views-v3");
export const VIEW_COOKIE_NAME = "darkson_view_seen";
export const VIEW_COOKIE_AGE = 60 * 60 * 24 * 365;

function counterUrl(action?: "up") {
  const namespace = encodeURIComponent(VIEW_COUNTER_NAMESPACE);
  const name = encodeURIComponent(VIEW_COUNTER_NAME);
  const suffix = action ? `/${action}` : "";

  return `${COUNTER_API_BASE_URL}/${namespace}/${name}${suffix}`;
}

export async function readViews(action?: "up") {
  const response = await fetch(counterUrl(action), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (response.status === 404) {
    return 0;
  }

  if (!response.ok) {
    throw new Error("Counter request failed");
  }

  const payload = (await response.json()) as CounterPayload;

  return Number.isFinite(payload.count) ? Number(payload.count) : 0;
}
