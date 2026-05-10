import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type NameStyle =
  | "clean"
  | "glow"
  | "frost"
  | "chrome"
  | "ghost"
  | "pulse"
  | "outline";

export interface SiteConfig {
  displayName: string;
  username: string;
  avatarUrl: string;
  backgroundUrl: string;
  musicUrl: string;
  musicTitle: string;
  nameStyle: NameStyle;
  pageUrl: string;
  updatedAt: string;
}

interface GithubFile {
  content?: string;
  sha?: string;
}

const styles: NameStyle[] = [
  "clean",
  "glow",
  "frost",
  "chrome",
  "ghost",
  "pulse",
  "outline",
];

const fallback: SiteConfig = {
  displayName: "DarkSon",
  username: "1vm5",
  avatarUrl: "",
  backgroundUrl: "",
  musicUrl: "",
  musicTitle: "",
  nameStyle: "glow",
  pageUrl: "https://darkson.xyz",
  updatedAt: "",
};

const repo = process.env.SITE_CONFIG_REPO?.trim() || "dzodi1021-lgtm/darksonwebsite";
const branch = process.env.SITE_CONFIG_BRANCH?.trim() || "main";
const filePath = process.env.SITE_CONFIG_PATH?.trim() || "site-data/profile.json";
const token = process.env.GITHUB_CONTENT_TOKEN?.trim();
const localPath = path.join(process.cwd(), filePath);

function text(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function style(value: unknown): NameStyle {
  return styles.includes(value as NameStyle) ? (value as NameStyle) : "glow";
}

export function fixConfig(input: Partial<SiteConfig> = {}): SiteConfig {
  return {
    displayName: text(input.displayName, 40) || fallback.displayName,
    username: text(input.username, 40) || fallback.username,
    avatarUrl: text(input.avatarUrl, 1000),
    backgroundUrl: text(input.backgroundUrl, 1000),
    musicUrl: text(input.musicUrl, 1000),
    musicTitle: text(input.musicTitle, 80),
    nameStyle: style(input.nameStyle),
    pageUrl: text(input.pageUrl, 1000) || fallback.pageUrl,
    updatedAt: text(input.updatedAt, 80),
  };
}

function decode(value = "") {
  return Buffer.from(value.replace(/\n/g, ""), "base64").toString("utf8");
}

function encode(value: SiteConfig) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`).toString("base64");
}

function githubUrl() {
  return `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(
    filePath,
  ).replace(/%2F/g, "/")}`;
}

async function githubFile(): Promise<GithubFile | null> {
  const response = await fetch(`${githubUrl()}?ref=${encodeURIComponent(branch)}`, {
    cache: "no-store",
    headers: token
      ? {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        }
      : {
          Accept: "application/vnd.github+json",
        },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Could not read GitHub config");
  }

  return (await response.json()) as GithubFile;
}

async function localConfig() {
  try {
    return fixConfig(JSON.parse(await readFile(localPath, "utf8")) as SiteConfig);
  } catch {
    return fallback;
  }
}

export async function getConfig() {
  if (!token && process.env.NODE_ENV === "development") {
    return localConfig();
  }

  try {
    const file = await githubFile();

    if (!file?.content) {
      return localConfig();
    }

    return fixConfig(JSON.parse(decode(file.content)) as SiteConfig);
  } catch {
    return localConfig();
  }
}

export async function saveConfig(input: Partial<SiteConfig>) {
  const next = fixConfig({
    ...input,
    updatedAt: new Date().toISOString(),
  });

  if (!token && process.env.NODE_ENV === "development") {
    await mkdir(path.dirname(localPath), { recursive: true });
    await writeFile(localPath, `${JSON.stringify(next, null, 2)}\n`);
    return next;
  }

  if (!token) {
    throw new Error("Missing GITHUB_CONTENT_TOKEN");
  }

  const current = await githubFile();
  const response = await fetch(githubUrl(), {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      branch,
      content: encode(next),
      message: "Update site dashboard settings",
      sha: current?.sha,
    }),
  });

  if (!response.ok) {
    throw new Error("Could not save GitHub config");
  }

  return next;
}
