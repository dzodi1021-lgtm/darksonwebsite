import { ProfileCard } from "@/components/ProfileCard";
import {
  getLanyardUserId,
  LANYARD_REST_URL,
  normalizePresence,
  type LanyardData,
  type RawLanyardData,
} from "@/libs/lanyard";

export const dynamic = "force-dynamic";

async function presence(): Promise<LanyardData | null> {
  try {
    const response = await fetch(`${LANYARD_REST_URL}/${getLanyardUserId()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      success: boolean;
      data: RawLanyardData;
    };

    return payload.success ? normalizePresence(payload.data) : null;
  } catch {
    return null;
  }
}

export default async function Home() {
  const data = await presence();

  return <ProfileCard initialData={data} />;
}
