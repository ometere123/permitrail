"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Field, Notice, Page, TxLink } from "../../components/Shell";
import { CONFIG, required, short } from "../../lib/config";
import { connectWallet, finalize, readClient, rememberActivity, walletClient } from "../../lib/chain";

const JURISDICTIONS = "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IS IT LV LI LT LU MT NL NO PL PT RO SK SI ES SE".split(" ");

export default function ScopeRecord() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [scope, setScope] = useState("");
  const [heads, setHeads] = useState({ latest_attempt_id: "", latest_authoritative_id: "" });
  const [account, setAccount] = useState("");
  const [tx, setTx] = useState("");
  const [status, setStatus] = useState("Loading scope record…");
  const [busy, setBusy] = useState(false);
  const [assessment, setAssessment] = useState({ jurisdiction: "DE", serviceEvidence: "PAYMENTS", sourceManifest: "ESMA public register; GLEIF public record; regulator publication", matchedRows: "No restriction row matched for the pinned scope", semanticEvidence: "The pinned provider is authorized for the requested service and jurisdiction. No exclusion, limitation, warning, or identity mismatch was found." });
  const matrix = useMemo(() => Object.fromEntries(JURISDICTIONS.map((code) => [code, "CLEAR"])), []);

  const refresh = async () => {
    try {
      const client = readClient();
      const [scopeRaw, headsRaw] = await Promise.all([client.readContract({ address: required(CONFIG.regulatoryScope, "NEXT_PUBLIC_REGULATORY_SCOPE") as `0x${string}`, functionName: "get_scope", args: [id] }), client.readContract({ address: required(CONFIG.regulatoryScope, "NEXT_PUBLIC_REGULATORY_SCOPE") as `0x${string}`, functionName: "get_heads", args: [id] })]);
      setScope(String(scopeRaw)); setHeads(JSON.parse(String(headsRaw))); setStatus("Read from Studionet.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not read scope."); }
  };
  useEffect(() => { void refresh(); }, [id]);

  const record = async () => {
    setBusy(true); setStatus("Waiting for wallet signature…");
    try {
      const signer = account || await connectWallet(); setAccount(signer);
      const hash = await walletClient(signer).writeContract({ address: required(CONFIG.regulatoryScope, "NEXT_PUBLIC_REGULATORY_SCOPE") as `0x${string}`, functionName: "assess", args: [id, BigInt(Math.floor(Date.now() / 1000)), "2026-10-07", "2026-10-07", "2026-10-07", "2027-10-07", assessment.sourceManifest, assessment.matchedRows, assessment.semanticEvidence, JSON.stringify(matrix), assessment.serviceEvidence, "AUTHORITATIVE"], value: 0n }) as string;
      setTx(hash); setStatus("Accepted. Waiting for FINALIZED execution…"); await finalize(hash); rememberActivity("Record assessment", hash, id); setStatus("FINALIZED and execution verified."); await refresh();
    } catch (error) { setStatus(error instanceof Error ? error.message : "Assessment failed."); }
    finally { setBusy(false); }
  };

  return <Page eyebrow="Scopes / Record" title="Scope record" intro="This page is the public audit surface for one pinned scope: its canonical tuple, assessment heads and latest evidence attempt.">
    <section className="record-header"><div><p className="eyebrow">SCOPE ID</p><code className="large-code">{id}</code></div><Link className="button outline" href="/mandates/new">Open a mandate →</Link></section>
    <section className="record-grid"><div className="form-card"><div className="card-kicker">CANONICAL TUPLE</div><p className="record-value">{scope || "No scope data returned."}</p><button className="button outline" onClick={refresh}>Refresh record</button><Notice tone={status.includes("FINALIZED") ? "good" : "neutral"}>{status}</Notice></div><div className="side-card"><p className="eyebrow">ASSESSMENT HEADS</p><div className="head-row"><span>Latest attempt</span><code>{short(heads.latest_attempt_id)}</code></div><div className="head-row"><span>Latest authoritative</span><code>{short(heads.latest_authoritative_id)}</code></div><p className="small-copy">A failed attempt becomes visible but cannot replace the last usable authoritative result.</p></div></section>
    <section className="form-card wide-card"><div className="section-label"><span>ASSESSMENT WRITE</span><span>30-STATE MATRIX / SEMANTIC CONSENSUS</span></div><div className="form-grid"><Field label="Jurisdiction"><input value={assessment.jurisdiction} onChange={(event) => setAssessment({ ...assessment, jurisdiction: event.target.value.toUpperCase() })} /></Field><Field label="Service evidence"><input value={assessment.serviceEvidence} onChange={(event) => setAssessment({ ...assessment, serviceEvidence: event.target.value })} /></Field><Field label="Source manifest"><input value={assessment.sourceManifest} onChange={(event) => setAssessment({ ...assessment, sourceManifest: event.target.value })} /></Field><Field label="Matched rows"><input value={assessment.matchedRows} onChange={(event) => setAssessment({ ...assessment, matchedRows: event.target.value })} /></Field></div><Field label="Semantic evidence"><textarea value={assessment.semanticEvidence} onChange={(event) => setAssessment({ ...assessment, semanticEvidence: event.target.value })} /></Field><div className="matrix compact-matrix">{JURISDICTIONS.map((code) => <span className={code === assessment.jurisdiction ? "selected" : "clear"} key={code}>{code}</span>)}</div><button className="button dark" onClick={record} disabled={busy}>{busy ? "Processing…" : "Record authoritative assessment →"}</button>{tx && <p className="mono">Transaction <TxLink hash={tx} /></p>}</section>
  </Page>;
}
