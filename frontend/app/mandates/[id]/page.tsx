"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Field, Notice, Page, TxLink } from "../../components/Shell";
import { CONFIG, required, short } from "../../lib/config";
import { connectWallet, finalize, readClient, rememberActivity, walletClient } from "../../lib/chain";

type Mandate = Record<string, string | number>;

export default function MandateRecord() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [mandate, setMandate] = useState<Mandate | null>(null);
  const [account, setAccount] = useState("");
  const [tx, setTx] = useState("");
  const [status, setStatus] = useState("Loading mandate record…");
  const [oracle, setOracle] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try { const raw = await readClient().readContract({ address: required(CONFIG.regulatedEscrow, "NEXT_PUBLIC_REGULATED_ESCROW") as `0x${string}`, functionName: "get_mandate", args: [id] }) as string; setMandate(raw ? JSON.parse(raw) : null); setStatus(raw ? "Read from Studionet." : "No mandate exists for this ID."); } catch (error) { setStatus(error instanceof Error ? error.message : "Could not read mandate."); }
  };
  useEffect(() => { void refresh(); }, [id]);

  const action = async (method: "accept" | "settle" | "refund_expired") => {
    setBusy(true); setStatus("Waiting for wallet signature…");
    try {
      const signer = account || await connectWallet(); setAccount(signer);
      const args = method === "settle" ? [id, 86400n] : [id];
      const hash = await walletClient(signer).writeContract({ address: required(CONFIG.regulatedEscrow, "NEXT_PUBLIC_REGULATED_ESCROW") as `0x${string}`, functionName: method, args, value: 0n }) as string;
      setTx(hash); setStatus("Accepted. Waiting for FINALIZED execution…"); await finalize(hash); rememberActivity(method, hash, id); setStatus("FINALIZED and execution verified."); await refresh();
    } catch (error) { setStatus(error instanceof Error ? error.message : "Transaction failed."); }
    finally { setBusy(false); }
  };
  const check = async () => {
    if (!mandate) return;
    try { const value = await readClient().readContract({ address: required(CONFIG.regulatoryScope, "NEXT_PUBLIC_REGULATORY_SCOPE") as `0x${string}`, functionName: "can_settle", args: [String(mandate.scope_id), String(mandate.jurisdiction), String(mandate.services), 86400n] }) as boolean; setOracle(value); setStatus(value ? "Oracle authorizes settlement." : "Oracle is fail-closed: settlement is withheld."); } catch (error) { setStatus(error instanceof Error ? error.message : "Oracle check failed."); }
  };

  return <Page eyebrow={`Mandates / ${id}`} title="Mandate record" intro="A mandate is a bilateral economic state machine. Read it here, then use the action rail only from the correct wallet.">
    <section className="record-header"><div><p className="eyebrow">MANDATE ID</p><code className="large-code">{id}</code></div><Link className="button outline" href="/activity">View activity →</Link></section>
    <section className="record-grid"><div className="form-card"><div className="card-kicker">CURRENT STATE</div>{mandate ? <div className="detail-list"><div><span>Status</span><strong>{String(mandate.status)}</strong></div><div><span>Buyer</span><code>{short(String(mandate.buyer))}</code></div><div><span>Seller</span><code>{short(String(mandate.seller))}</code></div><div><span>Scope</span><code>{short(String(mandate.scope_id))}</code></div><div><span>Deposit</span><strong>{String(mandate.amount)} wei</strong></div><div><span>Expiry</span><strong>{new Date(Number(mandate.expiry) * 1000).toLocaleString()}</strong></div></div> : <p>No record loaded.</p>}<button className="button outline" onClick={refresh}>Refresh mandate</button><Notice tone={status.includes("FINALIZED") ? "good" : "neutral"}>{status}</Notice>{tx && <p className="mono">Transaction <TxLink hash={tx} /></p>}</div><aside className="side-card action-card"><p className="eyebrow">ACTION RAIL</p><Field label="Connected wallet"><input readOnly value={account || "Connect from the header"} /></Field><button className="button outline" onClick={check} disabled={busy || !mandate}>Check oracle authorization</button><button className="button dark" onClick={() => action("accept")} disabled={busy || !mandate}>Accept as seller</button><button className="button dark" onClick={() => action("settle")} disabled={busy || !mandate || oracle !== true}>Settle mandate</button><button className="button outline" onClick={() => action("refund_expired")} disabled={busy || !mandate}>Refund after expiry</button>{oracle !== null && <Notice tone={oracle ? "good" : "bad"}>{oracle ? "AUTHORIZED · fresh clearance" : "WITHHELD · no fresh clearance"}</Notice>}</aside></section>
  </Page>;
}
