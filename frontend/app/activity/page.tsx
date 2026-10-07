"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Notice, Page, TxLink } from "../components/Shell";

type Activity = { label: string; hash: string; detail: string; at: string };

export default function ActivityPage() {
  const [items, setItems] = useState<Activity[]>([]);
  useEffect(() => { setItems(JSON.parse(window.localStorage.getItem("permitrail.activity") ?? "[]")); }, []);
  return <Page eyebrow="Activity / Session log" title="A visible transaction trail" intro="PermitRail keeps the browser-side activity trail lightweight. The authoritative record remains the finalized Studionet transaction and contract state.">
    <section className="activity-toolbar"><div><span className="eyebrow">LOCAL SESSION</span><p>Writes made from this browser appear here with explorer links.</p></div><Link className="button dark" href="/scopes/new">New scope →</Link></section>
    {items.length === 0 ? <section className="empty-state"><span className="empty-mark">∅</span><h2>No activity in this browser yet.</h2><p>Start with a scope, then come back here to inspect the finalized transaction trail.</p><Link className="text-link" href="/scopes/new">Create the first scope →</Link></section> : <section className="activity-list">{items.map((item) => <article key={`${item.hash}-${item.at}`} className="activity-row"><div><span className="eyebrow">{item.label}</span><h2>{item.detail}</h2><small>{new Date(item.at).toLocaleString()}</small></div><div className="activity-status"><Notice tone="good">FINALIZED</Notice><TxLink hash={item.hash} /></div></article>)}</section>}
  </Page>;
}
