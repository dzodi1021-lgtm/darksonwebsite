import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/libs/supabase";
import { verifyWorkinkToken } from "@/libs/workink";
import { generateKey } from "@/libs/keys";
import { getClientIp, sameSourceIp, sha256Hex } from "@/libs/ip";
import type { NextRequest } from "next/server";
import { Shell } from "./Shell";
import { BypassScreen, StepScreen } from "./StepScreen";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FLOW_TTL_MS = 30 * 60 * 1000;

function pickToken(sp: Record<string, string | string[] | undefined>): string {
  const raw = sp.wk ?? sp.hash ?? sp.t ?? "";
  const first = Array.isArray(raw) ? raw[0] : raw;
  return String(first || "").trim();
}

async function getFlow(ipHash: string) {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("key_flows")
    .select("*")
    .eq("ip_hash", ipHash)
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return data[0] as {
    ip_hash: string;
    stage: number;
    expires_at: string;
    updated_at: string;
  };
}

async function saveFlow(ipHash: string, stage: number) {
  const sb = supabaseAdmin();
  const expiresAt = new Date(Date.now() + FLOW_TTL_MS).toISOString();
  await sb.from("key_flows").upsert(
    [
      {
        ip_hash: ipHash,
        stage,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: "ip_hash" },
  );
}

async function dropFlow(ipHash: string) {
  const sb = supabaseAdmin();
  await sb.from("key_flows").delete().eq("ip_hash", ipHash);
}

export default async function KeyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const h = await headers();

  // Reconstruct a Request-ish object so helpers below can read headers
  // regardless of runtime shape.
  const headerCarrier: Pick<NextRequest, "headers"> = {
    headers: {
      get: (name: string) => h.get(name),
    } as unknown as NextRequest["headers"],
  };

  const ip = getClientIp(headerCarrier as unknown as NextRequest);
  const ipHash = sha256Hex(ip);

  const stepRaw = sp.step;
  const stepStr = Array.isArray(stepRaw) ? stepRaw[0] : stepRaw;
  let step = parseInt(String(stepStr || "0"), 10);
  if (Number.isNaN(step) || step < 0) step = 0;
  if (step > 2) step = 2;

  const token = pickToken(sp);

  // -------- STEP 0 ----------
  if (step === 0) {
    return (
      <Shell stepLabel="Step 0 / 2">
        <StepScreen
          title="Get Key"
          subtitle="Verify once with work.ink, then grab your key. Everything is HWID-locked so you only need to do this per machine."
          progressPct={0}
          progressLabel="Step 0 / 2"
          showSteps
          button={{ href: "/key/goto-step1", text: "Get my key" }}
          statusRight={
            <>
              <div>
                <span>Protection</span>
                <br />
                <span className={""} style={{ color: "#f6c04b", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase" }}>Antibypass • Live</span>
              </div>
            </>
          }
        />
      </Shell>
    );
  }

  // -------- STEP 1 ----------
  if (step === 1) {
    if (token) {
      // Returning from workink step 1
      const checked = await verifyWorkinkToken({
        token,
        expectedLinkId: process.env.WORKINK_STEP1_LINK_ID,
        clientIp: ip,
        deleteToken: true,
      });

      if (!checked.ok) {
        return (
          <Shell stepLabel="Blocked">
            <BypassScreen />
          </Shell>
        );
      }

      // workink's byIp check is already inside verifyWorkinkToken, this
      // double-checks against our own IP read.
      if (checked.info?.byIp && !sameSourceIp(ip, String(checked.info.byIp))) {
        return (
          <Shell stepLabel="Blocked">
            <BypassScreen />
          </Shell>
        );
      }

      await saveFlow(ipHash, 1);
      // Redirect to the clean step=1 URL so refreshing doesn't re-consume
      // the one-shot workink token.
      redirect("/key?step=1");
    }

    const flow = await getFlow(ipHash);
    if (!flow || flow.stage !== 1 || new Date(flow.expires_at) < new Date()) {
      return (
        <Shell stepLabel="Blocked">
          <BypassScreen />
        </Shell>
      );
    }

    return (
      <Shell stepLabel="Step 1 / 2">
        <StepScreen
          title="Almost there"
          subtitle="One more quick workink and your key is unlocked."
          progressPct={50}
          progressLabel="Step 1 / 2"
          showSteps
          button={{ href: "/key/goto-step2", text: "Continue (Step 2)" }}
          statusRight={
            <>
              <div>
                <span>Step 1</span>
                <br />
                <span style={{ color: "#f6c04b", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase" }}>Completed</span>
              </div>
              <div style={{ marginTop: 6 }}>
                <span>Protection</span>
                <br />
                <span style={{ color: "#f6c04b", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase" }}>Antibypass • Live</span>
              </div>
            </>
          }
        />
      </Shell>
    );
  }

  // -------- STEP 2 ----------
  const flow = await getFlow(ipHash);
  if (!flow || flow.stage !== 1 || new Date(flow.expires_at) < new Date()) {
    return (
      <Shell stepLabel="Blocked">
        <BypassScreen />
      </Shell>
    );
  }

  if (!token) {
    return (
      <Shell stepLabel="Blocked">
        <BypassScreen />
      </Shell>
    );
  }

  const checked = await verifyWorkinkToken({
    token,
    expectedLinkId: process.env.WORKINK_STEP2_LINK_ID,
    clientIp: ip,
    deleteToken: true,
  });
  if (!checked.ok) {
    return (
      <Shell stepLabel="Blocked">
        <BypassScreen />
      </Shell>
    );
  }
  if (checked.info?.byIp && !sameSourceIp(ip, String(checked.info.byIp))) {
    return (
      <Shell stepLabel="Blocked">
        <BypassScreen />
      </Shell>
    );
  }

  // Generate a unique key with retries.
  const sb = supabaseAdmin();
  let finalKey = "";
  for (let i = 0; i < 10; i++) {
    const candidate = generateKey();
    const { data: exists, error } = await sb
      .from("keys")
      .select("id")
      .eq("key_value", candidate)
      .limit(1);
    if (error) {
      return (
        <Shell stepLabel="Blocked">
          <BypassScreen />
        </Shell>
      );
    }
    if (!exists || exists.length === 0) {
      finalKey = candidate;
      break;
    }
  }
  if (!finalKey) {
    return (
      <Shell stepLabel="Blocked">
        <BypassScreen />
      </Shell>
    );
  }

  const { error: insertErr } = await sb
    .from("keys")
    .insert([{ key_value: finalKey, duration_type: "1d" }]);
  if (insertErr) {
    return (
      <Shell stepLabel="Blocked">
        <BypassScreen />
      </Shell>
    );
  }

  await dropFlow(ipHash);

  return (
    <Shell stepLabel="Step 2 / 2">
      <StepScreen
        title="Key received"
        subtitle="Your key is ready. Copy it and paste it into your Roblox UI."
        progressPct={100}
        progressLabel="Step 2 / 2"
        keyValue={finalKey}
        statusRight={
          <>
            <div>
              <span>Duration</span>
              <br />
              <span className={""} style={{ color: "#ebe6e7", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase" }}>24 hours</span>
            </div>
            <div style={{ marginTop: 6 }}>
              <span>Binding</span>
              <br />
              <span style={{ color: "#f6c04b", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase" }}>HWID lock on first use</span>
            </div>
          </>
        }
      />
    </Shell>
  );
}
