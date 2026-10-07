export const CONFIG = {
  chainId: process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID ?? "",
  rpc: process.env.NEXT_PUBLIC_GENLAYER_RPC ?? "",
  explorer: process.env.NEXT_PUBLIC_GENLAYER_EXPLORER ?? "",
  regulatoryScope: process.env.NEXT_PUBLIC_REGULATORY_SCOPE ?? "",
  regulatedEscrow: process.env.NEXT_PUBLIC_REGULATED_ESCROW ?? "",
};

export function required(value: string, name: string) {
  if (!value) throw new Error(`Missing ${name}. Add it to Vercel Environment Variables.`);
  return value;
}

export function short(value: string) {
  return value ? `${value.slice(0, 8)}…${value.slice(-6)}` : "—";
}
