"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { CONFIG, short } from "../lib/config";
import { connectWallet } from "../lib/chain";

export function Shell({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => { setAccount(window.localStorage.getItem("permitrail.account") ?? ""); }, []);

  const connect = async () => {
    try {
      const next = await connectWallet();
      setAccount(next);
      window.localStorage.setItem("permitrail.account", next);
    } catch (error) { window.alert(error instanceof Error ? error.message : "Wallet connection failed."); }
  };

  return <><header className="site-header"><Link className="brand" href="/">PERMITRAIL <span>FIELD OFFICE</span></Link><button className="menu-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>menu</button><nav className={open ? "site-nav open" : "site-nav"}><Link href="/">Overview</Link><Link href="/scopes/new">New scope</Link><Link href="/mandates/new">New mandate</Link><Link href="/activity">Activity</Link><Link href="/about">About</Link></nav><button className="wallet-button" onClick={connect}>{account ? short(account) : "Connect wallet"}</button></header><div className="network-strip"><span>STUDIONET {CONFIG.chainId || "—"}</span><span>INJECTED WALLET ONLY</span><span>NO BACKEND AUTHORITY</span></div>{children}</>;
}

export function Page({ eyebrow, title, intro, children }: { eyebrow: string; title: ReactNode; intro?: string; children: ReactNode }) {
  return <main className="page"><div className="page-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{intro && <p className="page-intro">{intro}</p>}</div>{children}</main>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
export function Notice({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "bad" }) { return <p className={`notice ${tone}`}>{children}</p>; }
export function TxLink({ hash }: { hash: string }) { return <a className="mono" href={`${CONFIG.explorer}/tx/${hash}`} target="_blank" rel="noreferrer">{short(hash)} ↗</a>; }
