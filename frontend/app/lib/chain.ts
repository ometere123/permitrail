import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { ExecutionResult, TransactionStatus } from "genlayer-js/types";
import { CONFIG, required } from "./config";

export type Provider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
export type Receipt = { txExecutionResultName?: string };

export function provider() {
  return (window as Window & { ethereum?: Provider }).ethereum;
}

export function readClient() {
  return createClient({ chain: studionet, endpoint: required(CONFIG.rpc, "NEXT_PUBLIC_GENLAYER_RPC") });
}

export function walletClient(account: string) {
  const injected = provider();
  if (!injected) throw new Error("No injected wallet found.");
  return createClient({ chain: studionet, account: account as `0x${string}`, provider: injected });
}

export async function connectWallet() {
  const injected = provider();
  if (!injected) throw new Error("Install MetaMask or another EIP-1193 wallet.");
  const accounts = await injected.request({ method: "eth_requestAccounts" }) as string[];
  const account = accounts[0] ?? "";
  if (account) await createClient({ chain: studionet, account: account as `0x${string}`, provider: injected }).connect("studionet");
  return account;
}

export async function finalize(hash: string) {
  const receipt = await readClient().waitForTransactionReceipt({ hash: hash as unknown as `0x${string}` & { length: 66 }, status: TransactionStatus.FINALIZED, interval: 3000, retries: 120 }) as Receipt;
  if (receipt.txExecutionResultName && receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) {
    throw new Error(`Finalized with execution result ${receipt.txExecutionResultName}. State was not advanced.`);
  }
  return receipt;
}

export function rememberActivity(label: string, hash: string, detail: string) {
  const key = "permitrail.activity";
  const existing = JSON.parse(window.localStorage.getItem(key) ?? "[]") as Array<Record<string, string>>;
  existing.unshift({ label, hash, detail, at: new Date().toISOString() });
  window.localStorage.setItem(key, JSON.stringify(existing.slice(0, 30)));
}

export async function digestScope(lei: string, services: string, domain: string, policy: string) {
  const canonical = [lei.trim().toUpperCase(), services.trim().toUpperCase(), domain.trim().toLowerCase(), policy.trim()].join("|");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function genToWei(value: string) {
  const [whole, fraction = ""] = value.trim().split(".");
  const padded = `${fraction}000000000000000000`.slice(0, 18);
  return BigInt(whole || "0") * 1000000000000000000n + BigInt(padded || "0");
}
