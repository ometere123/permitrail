# Studionet deployment procedure

The canonical deployment target is Studionet chain `61999` (`https://studio.genlayer.com/api`). Deployment requires a funded and unlocked wallet; no private key is committed to this repository.

```bash
genlayer network set studionet
genlayer deploy --contract contracts/regscope.py
genlayer deploy --contract contracts/regulated_escrow.py --args <REGSCOPE_ADDRESS>
```

After each transaction, wait for `FINALIZED` and confirm the execution result is successful before recording the address. Put the final addresses and transaction hashes in a new JSON file beside this document. Never replace an address merely because a transaction was accepted.

The current build environment could not perform the live step because its newly generated deployer account had no GEN and the runtime has no supported OS keychain. The source, tests, linter checks, and frontend build are independent of that wallet state.
