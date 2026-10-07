"use client";

import { useMemo, useState } from "react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { ExecutionResult, TransactionStatus } from "genlayer-js/types";

const SCOPE = "0xC6b1e8beF3501E8b2439968D4f6FB6d3b0176003" as `0x${string}`;
const ESCROW = "0x7F8aec2fd9665D3f37482540001F4e43E8C8524E" as `0x${string}`;
const RPC = "https://studio.genlayer.com/api";
const EXPLORER = "https://explorer-studio.genlayer.com";
const JURISDICTIONS = "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IS IT LV LI LT LU MT NL NO PL PT RO SK SI ES SE".split(" ");

type Provider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
type Receipt = { txExecutionResultName?: string };

function readClient() { return createClient({ chain: studionet, endpoint: RPC }); }
function walletClient(account: string) { return createClient({ chain: studionet, account: account as `0x${string}`, provider: (window as Window & { ethereum?: Provider }).ethereum }); }
function short(value: string) { return value ? `${value.slice(0, 8)}…${value.slice(-6)}` : "—"; }
function genToWei(value: string) {
  const [whole, fraction = ""] = value.trim().split(".");
  const padded = `${fraction}000000000000000000`.slice(0, 18);
  return BigInt(whole || "0") * 1000000000000000000n + BigInt(padded || "0");
}
async function scopeDigest(lei: string, services: string, domain: string, policy: string) {
  const canonical = [lei.trim().toUpperCase(), services.trim().toUpperCase(), domain.trim().toLowerCase(), policy.trim()].join("|");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default function Home() {
  const [account, setAccount] = useState("");
  const [message, setMessage] = useState("Connect a wallet to begin a live flow.");
  const [busy, setBusy] = useState(false);
  const [scopeId, setScopeId] = useState("");
  const [mandateId, setMandateId] = useState("1");
  const [mandate, setMandate] = useState<Record<string, unknown> | null>(null);
  const [heads, setHeads] = useState<Record<string, string> | null>(null);
  const [lastTx, setLastTx] = useState("");
  const [canSettle, setCanSettle] = useState<boolean | null>(null);
  const [scope, setScope] = useState({ lei: "", services: "PAYMENTS", domain: "", policy: "v1" });
  const [assessment, setAssessment] = useState({ jurisdiction: "DE", serviceEvidence: "PAYMENTS", sourceManifest: "ESMA public register; GLEIF public record; regulator publication", matchedRows: "No restriction row matched for the pinned scope", semanticEvidence: "The pinned provider is authorized for the requested service and jurisdiction. No exclusion, limitation, warning, or identity mismatch was found." });
  const [mandateForm, setMandateForm] = useState({ seller: "", amount: "0.01", expiryHours: "24" });
  const matrix = useMemo(() => Object.fromEntries(JURISDICTIONS.map((code) => [code, "CLEAR"])), []);

  const connect = async () => {
    const ethereum = (window as Window & { ethereum?: Provider }).ethereum;
    if (!ethereum) { setMessage("No injected wallet found. Install MetaMask or another EIP-1193 wallet."); return; }
    try {
      const accounts = await ethereum.request({ method: "eth_requestAccounts" }) as string[];
      const next = accounts[0] ?? "";
      if (next) await createClient({ chain: studionet, account: next as `0x${string}`, provider: ethereum }).connect("studionet");
      setAccount(next); setMessage("Wallet connected. The write client is pinned to Studionet 61999.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Wallet connection was rejected."); }
  };

  const runWrite = async (label: string, action: (client: ReturnType<typeof walletClient>) => Promise<string>) => {
    if (!account) { await connect(); return ""; }
    setBusy(true); setMessage(`${label}: waiting for wallet signature…`); setLastTx("");
    try {
      const hash = await action(walletClient(account)); setLastTx(hash); setMessage(`${label}: accepted. Waiting for finalized execution…`);
      const receipt = await readClient().waitForTransactionReceipt({ hash: hash as unknown as `0x${string}` & { length: 66 }, status: TransactionStatus.FINALIZED, interval: 3000, retries: 120 }) as Receipt;
      if (receipt.txExecutionResultName && receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) throw new Error(`Finalized with execution result ${receipt.txExecutionResultName}. State was not advanced.`);
      setMessage(`${label}: FINALIZED and execution verified.`); return hash;
    } catch (error) { setMessage(error instanceof Error ? error.message : `${label} failed.`); throw error; }
    finally { setBusy(false); }
  };

  const pinScope = async () => {
    if (!scope.lei || !scope.domain) { setMessage("LEI and expected domain are required."); return; }
    const id = await scopeDigest(scope.lei, scope.services, scope.domain, scope.policy);
    try { await runWrite("Pin scope", (client) => client.writeContract({ address: SCOPE, functionName: "pin_scope", args: [scope.lei, scope.services, scope.domain, scope.policy], value: 0n })); setScopeId(id); setMessage(`Scope pinned: ${id}.`); } catch { /* status already shown */ }
  };

  const refreshHeads = async () => {
    if (!scopeId) { setMessage("Enter or create a scope first."); return; }
    try { const raw = await readClient().readContract({ address: SCOPE, functionName: "get_heads", args: [scopeId] }) as string; setHeads(JSON.parse(raw)); setMessage("Scope heads refreshed from Studionet."); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not read scope heads."); }
  };

  const recordAssessment = async () => {
    if (!scopeId) { setMessage("Pin a scope before recording an assessment."); return; }
    try { await runWrite("Record assessment", (client) => client.writeContract({ address: SCOPE, functionName: "assess", args: [scopeId, BigInt(Math.floor(Date.now() / 1000)), "2026-10-07", "2026-10-07", "2026-10-07", "2027-10-07", assessment.sourceManifest, assessment.matchedRows, assessment.semanticEvidence, JSON.stringify(matrix), assessment.serviceEvidence, "AUTHORITATIVE"], value: 0n })); await refreshHeads(); } catch { /* status already shown */ }
  };

  const openMandate = async () => {
    if (!scopeId || !mandateForm.seller) { setMessage("Scope ID and seller address are required."); return; }
    try { await runWrite("Open mandate", (client) => client.writeContract({ address: ESCROW, functionName: "open_mandate", args: [mandateForm.seller, scopeId, assessment.jurisdiction, scope.services, BigInt(Math.floor(Date.now() / 1000) + Number(mandateForm.expiryHours) * 3600)], value: genToWei(mandateForm.amount) })); } catch { /* status already shown */ }
  };

  const readMandate = async () => {
    try { const raw = await readClient().readContract({ address: ESCROW, functionName: "get_mandate", args: [mandateId] }) as string; setMandate(raw ? JSON.parse(raw) : null); setMessage(raw ? "Mandate read from Studionet." : "No mandate exists for that ID."); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not read mandate."); }
  };
  const mandateWrite = async (method: "accept" | "settle" | "refund_expired") => {
    try { await runWrite(method === "refund_expired" ? "Refund mandate" : `${method[0].toUpperCase()}${method.slice(1)} mandate`, (client) => client.writeContract({ address: ESCROW, functionName: method, args: method === "settle" ? [mandateId, 86400n] : [mandateId], value: 0n })); await readMandate(); } catch { /* status already shown */ }
  };
  const checkSettlement = async () => {
    if (!scopeId) { setMessage("Pin a scope first."); return; }
    try { const allowed = await readClient().readContract({ address: SCOPE, functionName: "can_settle", args: [scopeId, assessment.jurisdiction, scope.services, 86400n] }) as boolean; setCanSettle(allowed); setMessage(allowed ? "Oracle authorizes settlement." : "Oracle is fail-closed: settlement is not authorized."); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not check settlement."); }
  };
  const input = (value: string, onChange: (next: string) => void, placeholder?: string) => <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />;

  return <main>
    <nav><span className="mark">PERMITRAIL</span><button onClick={connect} disabled={busy}>{account ? short(account) : "connect wallet"}</button></nav>
    <section className="hero"><p className="eyebrow">REGULATORY EXECUTION LAYER · STUDIONET 61999</p><h1>Move regulated value<br /><i>with evidence.</i></h1><p className="lede">PermitRail turns independently verified regulatory scope into a bilateral settlement decision. Evidence is visible. Authority is pinned. Release is mechanical.</p><div className="actions"><button className="primary" onClick={connect} disabled={busy}>connect to begin</button><a href={`${EXPLORER}/`} target="_blank" rel="noreferrer">open explorer ↗</a></div><p className="status"><span className={busy ? "pulse" : "dot"} />{message}</p></section>
    <section className="panel"><div><p className="eyebrow">EU / EEA COVERAGE MATRIX</p><h2>One scope. Thirty jurisdictions.</h2><p className="panel-note">A live assessment is stored as a complete matrix. The view below is the proposed assessment payload; the oracle remains fail-closed until an authoritative result is finalized.</p></div><div className="matrix">{JURISDICTIONS.map((code) => <span key={code} className={code === assessment.jurisdiction ? "selected" : "clear"}>{code}</span>)}</div></section>
    <section className="workspace"><div className="section-head"><div><p className="eyebrow">01 / SCOPE</p><h2>Pin the commercial boundary</h2></div><span className="contract">{short(SCOPE)}</span></div><div className="form-grid">{input(scope.lei, (value) => setScope({ ...scope, lei: value }), "LEI / legal entity identifier")}{input(scope.services, (value) => setScope({ ...scope, services: value }), "Required service, e.g. PAYMENTS")}{input(scope.domain, (value) => setScope({ ...scope, domain: value }), "Expected regulatory domain")}{input(scope.policy, (value) => setScope({ ...scope, policy: value }), "Policy version")}</div><div className="row"><button className="primary" onClick={pinScope} disabled={busy}>pin scope onchain</button>{scopeId && <code>{scopeId}</code>}</div></section>
    <section className="workspace"><div className="section-head"><div><p className="eyebrow">02 / EVIDENCE</p><h2>Record the authoritative read</h2></div><button onClick={refreshHeads} disabled={busy || !scopeId}>refresh heads</button></div><div className="form-grid">{input(assessment.jurisdiction, (value) => setAssessment({ ...assessment, jurisdiction: value.toUpperCase() }), "Jurisdiction code")}{input(assessment.serviceEvidence, (value) => setAssessment({ ...assessment, serviceEvidence: value }), "Service evidence")}{input(assessment.sourceManifest, (value) => setAssessment({ ...assessment, sourceManifest: value }), "Source manifest")}{input(assessment.matchedRows, (value) => setAssessment({ ...assessment, matchedRows: value }), "Matched regulator rows")}</div><textarea value={assessment.semanticEvidence} onChange={(event) => setAssessment({ ...assessment, semanticEvidence: event.target.value })} /><div className="row"><button className="primary" onClick={recordAssessment} disabled={busy || !scopeId}>record assessment</button>{heads && <span className="readout">attempt {short(heads.latest_attempt_id)} · authority {short(heads.latest_authoritative_id)}</span>}</div></section>
    <section className="workspace"><div className="section-head"><div><p className="eyebrow">03 / MANDATE</p><h2>Put bilateral GEN behind the result</h2></div><span className="contract">{short(ESCROW)}</span></div><div className="form-grid">{input(mandateForm.seller, (value) => setMandateForm({ ...mandateForm, seller: value }), "Seller wallet address")}{input(mandateForm.amount, (value) => setMandateForm({ ...mandateForm, amount: value }), "Amount in GEN")}{input(mandateForm.expiryHours, (value) => setMandateForm({ ...mandateForm, expiryHours: value }), "Expiry in hours")}{input(mandateId, setMandateId, "Mandate ID")}</div><div className="row"><button className="primary" onClick={openMandate} disabled={busy || !scopeId}>open mandate</button><button onClick={readMandate} disabled={busy}>read mandate</button>{mandate && <span className="readout">{String(mandate.status)} · {short(String(mandate.seller))}</span>}</div><div className="row compact"><button onClick={() => mandateWrite("accept")} disabled={busy || !mandate}>accept as seller</button><button onClick={checkSettlement} disabled={busy || !mandate}>check oracle</button><button onClick={() => mandateWrite("settle")} disabled={busy || !mandate || canSettle !== true}>settle</button><button onClick={() => mandateWrite("refund_expired")} disabled={busy || !mandate}>refund after expiry</button></div>{canSettle !== null && <p className={canSettle ? "decision allow" : "decision deny"}>{canSettle ? "AUTHORIZED · fresh authoritative scope permits settlement" : "WITHHELD · no fresh authoritative clearance"}</p>}</section>
    {lastTx && <p className="txline">Last transaction <a href={`${EXPLORER}/tx/${lastTx}`} target="_blank" rel="noreferrer">{short(lastTx)} ↗</a></p>}
    <section className="grid"><article><small>01 / PIN</small><h3>Immutable scope</h3><p>LEI, services, domain and policy are canonicalized into one consumer-bound identity.</p></article><article><small>02 / VERIFY</small><h3>Independent evidence</h3><p>Source records, freshness and semantic consensus are stored before any value can move.</p></article><article><small>03 / SETTLE</small><h3>Bilateral consequence</h3><p>GEN moves only when a fresh authoritative determination permits it. Otherwise the buyer can reclaim after expiry.</p></article></section>
  </main>;
}
