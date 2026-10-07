"use client";
import { useState } from "react";

const states = "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IS IT LV LI LT LU MT NL NO PL PT RO SK SI ES SE".split(" ");

export default function Home() {
  const [account, setAccount] = useState<string>("");
  const connect = async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    setAccount(accounts[0] ?? "");
  };
  return <main>
    <nav><span className="mark">PERMITRAIL</span><button onClick={connect}>{account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "connect wallet"}</button></nav>
    <section className="hero"><p className="eyebrow">REGULATORY EXECUTION LAYER · STUDIONET 61999</p><h1>Move regulated value<br/><i>with evidence.</i></h1><p className="lede">PermitRail turns independently verified regulatory scope into a bilateral settlement decision. Evidence is visible. Authority is pinned. Release is mechanical.</p><div className="actions"><button className="primary" onClick={connect}>connect to begin</button><a href="https://explorer-studio.genlayer.com" target="_blank">open explorer ↗</a></div></section>
    <section className="panel"><div><p className="eyebrow">EU / EEA COVERAGE MATRIX</p><h2>One scope. Thirty jurisdictions.</h2></div><div className="matrix">{states.map((s) => <span key={s} className={s === "DE" ? "restricted" : "clear"}>{s}</span>)}</div></section>
    <section className="grid"><article><small>01 / PIN</small><h3>Immutable scope</h3><p>LEI, services, domain and policy are canonicalized into one consumer-bound identity.</p></article><article><small>02 / VERIFY</small><h3>Independent evidence</h3><p>ESMA, GLEIF and regulator-authored restrictions are re-fetched and recorded with source-specific freshness.</p></article><article><small>03 / SETTLE</small><h3>Bilateral consequence</h3><p>GEN moves only when a fresh authoritative determination permits it. Otherwise the buyer can reclaim after expiry.</p></article></section>
  </main>;
}
