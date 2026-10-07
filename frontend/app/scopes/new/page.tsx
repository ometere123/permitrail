"use client";

import Link from "next/link";
import { useState } from "react";
import { Field, Notice, Page, TxLink } from "../../components/Shell";
import { CONFIG, required } from "../../lib/config";
import { connectWallet, digestScope, finalize, walletClient, rememberActivity } from "../../lib/chain";

export default function NewScope() {
  const [form, setForm] = useState({ lei: "", services: "PAYMENTS", domain: "", policy: "v1" });
  const [account, setAccount] = useState("");
  const [scopeId, setScopeId] = useState("");
  const [tx, setTx] = useState("");
  const [status, setStatus] = useState("Ready to pin a new scope.");
  const [busy, setBusy] = useState(false);

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const pin = async () => {
    if (!form.lei || !form.domain) { setStatus("LEI and expected domain are required."); return; }
    setBusy(true); setStatus("Waiting for wallet signature…");
    try {
      const signer = account || await connectWallet();
      setAccount(signer);
      const id = await digestScope(form.lei, form.services, form.domain, form.policy);
      const hash = await walletClient(signer).writeContract({ address: required(CONFIG.regulatoryScope, "NEXT_PUBLIC_REGULATORY_SCOPE") as `0x${string}`, functionName: "pin_scope", args: [form.lei, form.services, form.domain, form.policy], value: 0n }) as string;
      setTx(hash); setStatus("Accepted. Waiting for FINALIZED execution…"); await finalize(hash);
      setScopeId(id); window.localStorage.setItem("permitrail.lastScope", id); rememberActivity("Pin scope", hash, id); setStatus("FINALIZED and execution verified.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Scope pin failed."); }
    finally { setBusy(false); }
  };

  return <Page eyebrow="Scopes / New" title="Pin a commercial boundary" intro="A scope is the consumer-bound identity that every assessment and mandate references. It is derived from four fields and cannot be changed in place.">
    <div className="two-column"><section className="form-card"><div className="card-kicker">SCOPE INPUT</div><Field label="LEI / legal entity identifier"><input value={form.lei} onChange={(event) => update("lei", event.target.value)} placeholder="e.g. 529900…" /></Field><Field label="Required service"><input value={form.services} onChange={(event) => update("services", event.target.value)} placeholder="PAYMENTS" /></Field><Field label="Expected regulatory domain"><input value={form.domain} onChange={(event) => update("domain", event.target.value)} placeholder="regulated payments" /></Field><Field label="Policy version"><input value={form.policy} onChange={(event) => update("policy", event.target.value)} placeholder="v1" /></Field><button className="button dark" onClick={pin} disabled={busy}>{busy ? "Processing…" : "Pin scope onchain →"}</button>{status && <Notice tone={status.includes("FINALIZED") ? "good" : "neutral"}>{status}</Notice>}{tx && <p className="mono">Transaction <TxLink hash={tx} /></p>}{scopeId && <p className="success-link"><Link href={`/scopes/${scopeId}`}>Open scope record →</Link></p>}</section><aside className="side-card"><p className="eyebrow">WHAT GETS PINNED</p><h2>One identity, reused everywhere.</h2><p>The scope ID is the SHA-256 digest of the canonical LEI, service, domain and policy tuple. Downstream writes carry only this identity.</p><div className="rule-list"><span>LEI</span><span>Service class</span><span>Regulatory domain</span><span>Policy version</span></div></aside></div>
  </Page>;
}
