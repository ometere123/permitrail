# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json


@gl.contract_interface
class ScopeOracle:
    class View:
        def can_settle(self, scope_id: str, jurisdiction: str, required_services: str, max_age: u256) -> bool: ...


class RegulatedEscrow(gl.Contract):
    oracle: Address
    mandates: TreeMap[str, str]
    next_id: u256

    def __init__(self, oracle: Address):
        self.oracle = oracle
        self.next_id = u256(0)

    @gl.public.write.payable
    def open_mandate(self, seller: Address, scope_id: str, jurisdiction: str, services: str, expiry: u256) -> str:
        if gl.message.value == u256(0) or seller == gl.message.sender_address:
            raise gl.vm.UserError("invalid counterparties or value")
        if expiry <= gl.block.timestamp:
            raise gl.vm.UserError("expiry must be in the future")
        self.next_id += u256(1)
        mandate_id = str(self.next_id)
        self.mandates[mandate_id] = json.dumps({
            "buyer": str(gl.message.sender_address), "seller": str(seller), "scope_id": scope_id,
            "jurisdiction": jurisdiction.upper(), "services": services.upper(), "expiry": int(expiry),
            "amount": int(gl.message.value), "status": "OPEN", "created_at": int(gl.block.timestamp),
        }, sort_keys=True)
        return mandate_id

    @gl.public.write
    def accept(self, mandate_id: str) -> None:
        raw = self.mandates.get(mandate_id, "")
        if not raw:
            raise gl.vm.UserError("unknown mandate")
        item = json.loads(raw)
        if item["status"] != "OPEN" or str(gl.message.sender_address) != item["seller"]:
            raise gl.vm.UserError("only named seller can accept")
        item["status"] = "ACCEPTED"
        item["accepted_at"] = int(gl.block.timestamp)
        self.mandates[mandate_id] = json.dumps(item, sort_keys=True)

    @gl.public.write
    def settle(self, mandate_id: str, max_age: u256) -> None:
        raw = self.mandates.get(mandate_id, "")
        if not raw:
            raise gl.vm.UserError("unknown mandate")
        item = json.loads(raw)
        if item["status"] != "ACCEPTED":
            raise gl.vm.UserError("mandate not accepted")
        oracle = ScopeOracle(self.oracle)
        allowed = oracle.view().can_settle(item["scope_id"], item["jurisdiction"], item["services"], max_age)
        if not allowed:
            raise gl.vm.UserError("regulatory check did not authorize settlement")
        item["status"] = "SETTLED"
        item["settled_at"] = int(gl.block.timestamp)
        self.mandates[mandate_id] = json.dumps(item, sort_keys=True)
        gl.message.send(Address(item["seller"]), u256(item["amount"]))

    @gl.public.write
    def refund_expired(self, mandate_id: str) -> None:
        raw = self.mandates.get(mandate_id, "")
        if not raw:
            raise gl.vm.UserError("unknown mandate")
        item = json.loads(raw)
        if item["status"] not in ("OPEN", "ACCEPTED") or int(gl.block.timestamp) < item["expiry"]:
            raise gl.vm.UserError("not refundable")
        if str(gl.message.sender_address) != item["buyer"]:
            raise gl.vm.UserError("only buyer can refund")
        item["status"] = "REFUNDED"
        item["refunded_at"] = int(gl.block.timestamp)
        self.mandates[mandate_id] = json.dumps(item, sort_keys=True)
        gl.message.send(Address(item["buyer"]), u256(item["amount"]))

    @gl.public.view
    def get_mandate(self, mandate_id: str) -> str:
        return self.mandates.get(mandate_id, "")
