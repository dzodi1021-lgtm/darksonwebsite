"use client";

import { useState } from "react";

const coins = [
  {
    key: "btc",
    name: "Bitcoin",
    ticker: "BTC",
    address: "bc1qgqsmxsufh428dca5u7umedgr4qk5ejma5q2rqw",
    href: "bitcoin:bc1qgqsmxsufh428dca5u7umedgr4qk5ejma5q2rqw",
  },
  {
    key: "eth",
    name: "Ethereum",
    ticker: "ETH",
    address: "0xfe5fef32b65107a6f8c0e84f47daa94d6a5095f9",
    href: "ethereum:0xfe5fef32b65107a6f8c0e84f47daa94d6a5095f9",
  },
  {
    key: "sol",
    name: "Solana",
    ticker: "SOL",
    address: "HetgF7w9tVuND1hzBgt7WBvUaex4EDnkzwGHHLoDGQ7j",
    href: "solana:HetgF7w9tVuND1hzBgt7WBvUaex4EDnkzwGHHLoDGQ7j",
  },
] as const;

function short(value: string) {
  return `${value.slice(0, 5)}...${value.slice(-4)}`;
}

function Icon({ coin }: { coin: (typeof coins)[number]["key"] }) {
  if (coin === "btc") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="currentColor" />
        <path
          d="M19.28 14.88c1.18-.48 1.82-1.35 1.64-2.62-.25-1.77-1.78-2.35-3.77-2.52l.36-2.16-1.32-.22-.35 2.1-1.05-.18.35-2.1-1.32-.22-.36 2.16-2.1-.35-.27 1.6 1.08.18c.48.08.6.32.55.66l-1.1 6.58c-.08.46-.32.55-.68.5l-1.08-.18-.5 1.75 2.1.35-.37 2.22 1.32.22.37-2.2 1.05.18-.37 2.2 1.32.22.38-2.28c2.38.31 4.23-.02 4.84-2.27.5-1.8-.18-2.82-1.74-3.61Zm-4.1-3.63 1.03.17c.98.16 1.94.43 1.76 1.5-.18 1.1-1.17 1.04-2.3.85l-.96-.16.47-2.36Zm1.66 7.17-1.17-.2.52-2.75 1.12.19c1.18.2 2.2.55 2 1.74-.22 1.28-1.35 1.22-2.47 1.02Z"
          fill="#0a0a0a"
        />
      </svg>
    );
  }

  if (coin === "eth") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 2 7 16.25 16 21.5l9-5.25L16 2Z" fill="currentColor" />
        <path d="M16 23.3 7 18l9 12 9-12-9 5.3Z" fill="currentColor" opacity="0.65" />
        <path d="m16 12.9-9 3.35 9 5.25 9-5.25-9-3.35Z" fill="#0a0a0a" opacity="0.32" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M7.1 21.9c.24-.24.57-.38.91-.38H28.1c.58 0 .87.7.46 1.1l-3.66 3.66c-.24.24-.57.38-.91.38H3.9a.65.65 0 0 1-.46-1.1L7.1 21.9Zm0-16.18c.25-.24.58-.38.92-.38H28.1c.58 0 .87.7.46 1.1L24.9 10.1c-.24.24-.57.38-.91.38H3.9a.65.65 0 0 1-.46-1.1L7.1 5.72Zm17.8 8.09c-.24-.24-.57-.38-.91-.38H3.9a.65.65 0 0 0-.46 1.1l3.66 3.66c.24.24.57.38.91.38H28.1c.58 0 .87-.7.46-1.1l-3.66-3.66Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function CryptoButtons() {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(address: string, key: string) {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="crypto-dock" aria-label="Crypto payment links">
      {coins.map((coin) => (
        <a
          key={coin.key}
          className={`crypto-chip crypto-${coin.key}`}
          href={coin.href}
          onClick={() => copy(coin.address, coin.key)}
          title={`Send ${coin.name}`}
        >
          <span className="crypto-icon">
            <Icon coin={coin.key} />
          </span>
          <span className="crypto-text">
            <span>{coin.ticker}</span>
            <span>{copied === coin.key ? "Copied" : short(coin.address)}</span>
          </span>
        </a>
      ))}
    </div>
  );
}
