"use client";

import Link from "next/link";
import { useState } from "react";
import { Field, Notice, Page, TxLink } from "../../components/Shell";
import { CONFIG, required } from "../../lib/config";
import { connectWallet, finalize, genToWei, rememberActivity, walletClient } from "../../lib/chain";

export default function NewMandate() {
  const [form, setForm] = useState({ scopeId: "", seller: "", jurisdiction: "DE", services: "PAYMENTS", amount: "0.01", expiryHours: "24" });
  const [account, setAccount] = useState("");
  const [mandateId, setMandateId] = useState("");
  const [tx, setTx] = useState("");
  const [status, setStatus] = useState("Ready to open a bilateral mandate.");
  const [busy, setBusy] = useState(false);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const open = async () => {
    if (!form.scopeId || !form.seller) { setStatus("Scope ID and seller address are required."); return; }
    setBusy(true); setStatus("Waiting for wallet signature…");
    try {
      const signer = account || await connectWallet(); setAccount(signer);
      const expiry = BigInt(Math.floor(Date.now() / 1000) + Number(form.expiryHours) * 3600);
      const hash = await walletClient(signer).writeContract({ address: required(CONFIG.regulatedEscrow, "NEXT_PUBLIC_REGULATED_ESCROW") as `0x${string}`, functionName: "open_mandate", args: [form.seller, form.scopeId, form.jurisdiction, form.services, expiry], value: genToWei(form.amount) }) as string;
      setTx(hash); setStatus("Accepted. Waiting for FINALIZED execution…"); await finalize(hash); rememberActivity("Open mandate", hash, form.scopeId); setStatus("FINALIZED and execution verified."); setMandateId("1");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Mandate opening failed."); }
    finally { setBusy(false); }
  };

  return <Page eyebrow="Mandates / New" title="Open a bilateral mandate" intro="A buyer deposits GEN against a pinned scope. The named seller must accept, and the oracle is checked again before settlement.">
    <div className="two-column"><section className="form-card"><div className="card-kicker">MANDATE TERMS</div><Field label="Pinned scope ID"><input value={form.scopeId} onChange={(event) => update("scopeId", event.target.value)} placeholder="64-character scope ID" /></Field><Field label="Seller wallet"><input value={form.seller} onChange={(event) => update("seller", event.target.value)} placeholder="0x…" /></Field><div className="form-grid"><Field label="Jurisdiction"><input value={form.jurisdiction} onChange={(event) => update("jurisdiction", event.target.value.toUpperCase())} /></Field><Field label="Services"><input value={form.services} onChange={(event) => update("services", event.target.value)} /></Field><Field label="Deposit / GEN"><input value={form.amount} onChange={(event) => update("amount", event.target.value)} /></Field><Field label="Expiry / hours"><input value={form.expiryHours} onChange={(event) => update("expiryHours", event.target.value)} /></Field></div><button className="button dark" onClick={open} disabled={busy}>{busy ? "Processing…" : "Open mandate onchain →"}</button><Notice tone={status.includes("FINALIZED") ? "good" : "neutral"}>{status}</Notice>{tx && <p className="mono">Transaction <TxLink hash={tx} /></p>}{mandateId && <p className="success-link"><Link href={`/mandates/${mandateId}`}>Open mandate record →</Link></p>}</section><aside className="side-card"><p className="eyebrow">ECONOMIC RULE</p><h2>No admin release.</h2><p>Only the named seller can accept. Settlement requires a fresh authoritative scope result. If the expiry passes without settlement, only the buyer can refund.</p><div className="rule-list"><span>Buyer deposits</span><span>Seller accepts</span><span>Oracle authorizes</span><span>Contract releases</span></div></aside></div>
  </Page>;
}
