import { Page } from "../components/Shell";
import { CONFIG } from "../lib/config";

export default function AboutPage() {
  return <Page eyebrow="About / Operating model" title="A regulatory rail with a narrow job" intro="PermitRail is deliberately split into a scope oracle and a bilateral escrow. Neither page nor wallet becomes the authority.">
    <section className="manifesto"><h2>Stake a public promise.<br /><em>Prove when it changes.</em></h2><p>The contract stores a canonical scope identity, an append-only assessment attempt and a separate authoritative head. The escrow asks the oracle again at settlement instead of trusting an old browser decision.</p></section>
    <section className="about-grid"><article><span className="eyebrow">REGULATORYSCOPE</span><h2>Evidence first</h2><p>Validators independently inspect the declared evidence, compare semantic decisions and fail closed on unavailable, stale or ambiguous reads.</p><code>{CONFIG.regulatoryScope || "configured by environment"}</code></article><article><span className="eyebrow">REGULATEDEscrow</span><h2>Consequence second</h2><p>The buyer and named seller control the mandate lifecycle. There is no admin release path and no backend that can rewrite the result.</p><code>{CONFIG.regulatedEscrow || "configured by environment"}</code></article><article><span className="eyebrow">NETWORK</span><h2>One stable target</h2><p>Browser writes use an injected EIP-1193 wallet and switch to the configured Studionet chain before signing.</p><code>{CONFIG.chainId || "configured by environment"}</code></article></section>
  </Page>;
}
