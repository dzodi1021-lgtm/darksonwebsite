import type { Metadata } from "next";
import { cache } from "react";
import { ProfileCard } from "@/components/ProfileCard";
import { getInvite } from "@/libs/discord";
import {
  avatarUrl,
  getLanyardUserId,
  LANYARD_REST_URL,
  normalizePresence,
  type LanyardData,
  type RawLanyardData,
} from "@/libs/lanyard";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/libs/site";
import { readViews } from "@/libs/views";

export const dynamic = "force-dynamic";

const presence = cache(async (): Promise<LanyardData | null> => {
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
});

export async function generateMetadata(): Promise<Metadata> {
  const data = await presence();
  const url = siteUrl();
  const image = avatarUrl(data?.discord_user, 512);

  return {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      url,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
      images: [
        {
          url: image,
          width: 512,
          height: 512,
          alt: `${SITE_NAME} profile picture`,
        },
      ],
    },
    twitter: {
      card: "summary",
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: [image],
    },
  };
}

export default async function Home() {
  const [data, invite, views] = await Promise.all([
    presence(),
    getInvite(),
    readViews().catch(() => null),
  ]);

  return (
    <ProfileCard
      initialData={data}
      initialInvite={invite}
      initialViews={views}
    />
  );
}
