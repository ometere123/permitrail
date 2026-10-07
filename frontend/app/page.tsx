import Link from "next/link";
import { Page } from "./components/Shell";
import { CONFIG, short } from "./lib/config";

const steps = [
  ["01", "Pin a scope", "Bind an entity, service, domain and policy into one consumer-facing identity.", "/scopes/new"],
  ["02", "Record evidence", "Store a complete jurisdiction matrix and let semantic consensus restrict ambiguous evidence.", "/activity"],
  ["03", "Open a mandate", "Hold bilateral GEN until the oracle authorizes settlement or expiry enables a refund.", "/mandates/new"],
];

export default function Home() {
  return <Page eyebrow={`Regulatory execution layer / Studionet ${CONFIG.chainId || "—"}`} title={<>Move regulated value<br /><em>with evidence.</em></>} intro="PermitRail turns independently verified regulatory scope into a bilateral settlement decision. Evidence is visible. Authority is pinned. Release is mechanical.">
    <section className="hero-actions"><Link className="button dark" href="/scopes/new">Start a scope →</Link><Link className="text-link" href="/about">Read the operating model ↗</Link></section>
    <section className="signal-grid"><div><span className="eyebrow">LIVE CONTRACTS</span><strong>{short(CONFIG.regulatoryScope)}</strong><small>RegulatoryScope</small></div><div><span className="eyebrow">ESCROW RAIL</span><strong>{short(CONFIG.regulatedEscrow)}</strong><small>RegulatedEscrow</small></div><div><span className="eyebrow">SETTLEMENT RULE</span><strong>FAIL-CLOSED</strong><small>Fresh authoritative result required</small></div></section>
    <section className="route-list"><div className="section-label"><span>THE RAIL</span><span>THREE OPERATING MOVES</span></div>{steps.map(([number, title, copy, href]) => <Link className="route-card" href={href} key={number}><span className="route-number">{number}</span><div><h2>{title}</h2><p>{copy}</p></div><span className="arrow">↗</span></Link>)}</section>
    <section className="split-note"><div><p className="eyebrow">WHY THIS EXISTS</p><h2>Regulatory truth should be a state, not a screenshot.</h2></div><p>PermitRail separates the scope identity, evidence attempt and economic consequence. A failed or stale read cannot silently become clearance, and the escrow checks the oracle again at release.</p></section>
  </Page>;
}
