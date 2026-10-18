import crypto from "node:crypto";
import type { NextRequest } from "next/server";

export function getClientIp(req: NextRequest | Request): string {
  const headers = "headers" in req ? req.headers : (req as Request).headers;
  const xff = headers.get("x-forwarded-for") || "";
  let ip = "";

  if (xff) {
    ip = xff.split(",")[0].trim();
  } else {
    ip = headers.get("x-real-ip") || headers.get("cf-connecting-ip") || "";
  }

  ip = ip.replace(/:\d+$/, "");
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  return ip || "unknown";
}

export function getUserAgent(req: NextRequest | Request): string {
  const headers = "headers" in req ? req.headers : (req as Request).headers;
  return headers.get("user-agent") || "";
}

export function sha256Hex(input: string): string {
  return crypto
    .createHash("sha256")
    .update(String(input || ""), "utf8")
    .digest("hex");
}

export function sameSourceIp(a: string, b: string): boolean {
  const l = String(a || "").trim().replace(/^::ffff:/, "");
  const r = String(b || "").trim().replace(/^::ffff:/, "");
  return l === r && l !== "" && l !== "unknown";
}
