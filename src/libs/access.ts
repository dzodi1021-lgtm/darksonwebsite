const DEFAULT_IP = "88.182.116.156";

function clean(ip: string) {
  return ip.trim().replace(/^::ffff:/, "");
}

export function ip(headers: Headers) {
  const value =
    headers.get("x-forwarded-for") ||
    headers.get("x-vercel-forwarded-for") ||
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    "";

  return clean(value.split(",")[0] || "");
}

export function canUseDashboard(headers: Headers) {
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  const allowed = (
    process.env.DASHBOARD_ALLOWED_IPS ||
    process.env.DASHBOARD_ALLOWED_IP ||
    DEFAULT_IP
  )
    .split(",")
    .map(clean)
    .filter(Boolean);

  return allowed.includes(ip(headers));
}
