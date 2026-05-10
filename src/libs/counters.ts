interface CounterPayload {
  count?: number;
}

export interface Point {
  label: string;
  value: number;
}

export interface Stats {
  range: "day" | "week" | "month";
  total: number;
  points: Point[];
  today: number;
  week: number;
  month: number;
}

const baseUrl =
  process.env.COUNTER_API_BASE_URL?.trim() || "https://api.counterapi.dev/v1";
const namespace = process.env.VIEW_COUNTER_NAMESPACE?.trim() || "darksonwebsite";
const baseName =
  process.env.VIEW_COUNTER_NAME?.trim() ||
  (process.env.NODE_ENV === "development" ? "views-v2-dev" : "views-v2");
const zone = process.env.VIEW_COUNTER_TIME_ZONE?.trim() || "Europe/Paris";

function parts(date: Date) {
  const data = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const item = (type: string) =>
    data.find((part) => part.type === type)?.value || "00";

  return {
    year: item("year"),
    month: item("month"),
    day: item("day"),
    hour: item("hour"),
  };
}

function dayStamp(date: Date) {
  const value = parts(date);
  return `${value.year}${value.month}${value.day}`;
}

function hourStamp(date: Date) {
  const value = parts(date);
  return `${value.year}${value.month}${value.day}${value.hour}`;
}

function dayLabel(date: Date) {
  const value = parts(date);
  return `${value.day}/${value.month}`;
}

function hourLabel(date: Date) {
  return `${parts(date).hour}:00`;
}

function url(name: string, action?: "up") {
  const suffix = action ? `/${action}` : "";

  return `${baseUrl}/${encodeURIComponent(namespace)}/${encodeURIComponent(
    name,
  )}${suffix}`;
}

async function read(name: string, action?: "up") {
  const response = await fetch(url(name, action), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!action && (response.status === 400 || response.status === 404)) {
    return 0;
  }

  if (!response.ok && !action) {
    return 0;
  }

  if (!response.ok) {
    throw new Error("Counter request failed");
  }

  const payload = (await response.json()) as CounterPayload;

  return Number.isFinite(payload.count) ? Number(payload.count) : 0;
}

function dayName(date: Date) {
  return `${baseName}-day-${dayStamp(date)}`;
}

function hourName(date: Date) {
  return `${baseName}-hour-${hourStamp(date)}`;
}

function shift(days: number) {
  return new Date(Date.now() - days * 86400000);
}

function shiftHour(hours: number) {
  return new Date(Date.now() - hours * 3600000);
}

async function sum(days: number) {
  const values = await Promise.all(
    Array.from({ length: days }, (_, index) => read(dayName(shift(index)))),
  );

  return values.reduce((total, value) => total + value, 0);
}

export async function total() {
  return read(baseName);
}

export async function hit() {
  const now = new Date();
  const values = await Promise.all([
    read(baseName, "up"),
    read(dayName(now), "up"),
    read(hourName(now), "up"),
  ]);

  return values[0];
}

export async function stats(range: Stats["range"]): Promise<Stats> {
  const size = range === "day" ? 24 : range === "week" ? 7 : 30;
  const points =
    range === "day"
      ? await Promise.all(
          Array.from({ length: size }, async (_, index) => {
            const date = shiftHour(size - index - 1);

            return {
              label: hourLabel(date),
              value: await read(hourName(date)),
            };
          }),
        )
      : await Promise.all(
          Array.from({ length: size }, async (_, index) => {
            const date = shift(size - index - 1);

            return {
              label: dayLabel(date),
              value: await read(dayName(date)),
            };
          }),
        );

  const [all, today, week, month] = await Promise.all([
    total(),
    read(dayName(new Date())),
    sum(7),
    sum(30),
  ]);

  return {
    range,
    total: all,
    points,
    today,
    week,
    month,
  };
}
