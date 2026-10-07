# PermitRail

PermitRail is a clean-room GenLayer application for regulatory-scope checks that can directly gate bilateral GEN escrow.

The project has two Intelligent Contracts:

- `RegulatoryScope`: canonical scope IDs, source-grounded assessments, separate attempt/authoritative heads, and a 30-jurisdiction result matrix.
- `RegulatedEscrow`: two-party mandates whose immutable scope and policy are checked again before release; denied mandates become refundable after expiry.

The contract boundary is deliberately fail-closed. Structured evidence may establish coverage, while semantic consensus can only restrict or withhold it. Source failures are recorded as failed attempts and never overwrite the last authoritative determination.

## Network

- Studionet: chain `61999`
- RPC: `https://studio.genlayer.com/api`
- Explorer: `https://explorer-studio.genlayer.com`

## Commands

```bash
python -m pip install -r requirements.txt
pytest -q
genvm-lint check contracts/regscope.py contracts/regulated_escrow.py
cd frontend && npm install && npm run build
```

Deployment is intentionally explicit and records finalized transaction receipts in `deployments/`.
