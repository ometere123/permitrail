# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import hashlib
import json


JURISDICTIONS = "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IS IT LV LI LT LU MT NL NO PL PT RO SK SI ES SE".split()
TERMINAL = {"CLEAR", "RESTRICTED", "NOT_PASSPORTED", "WITHDRAWN", "NON_COMPLIANT", "IDENTITY_MISMATCH"}
FAILURES = {"SOURCE_UNAVAILABLE", "SCHEMA_UNSUPPORTED", "SEMANTIC_INCONCLUSIVE"}


def _digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _scope_text(lei: str, services: str, domain: str, policy: str) -> str:
    return "|".join([lei.strip().upper(), services.strip().upper(), domain.strip().lower(), policy.strip()])


class RegulatoryScope(gl.Contract):
    scope_owner: TreeMap[str, Address]
    scope_data: TreeMap[str, str]
    latest_attempt: TreeMap[str, str]
    latest_authoritative: TreeMap[str, str]
    assessments: TreeMap[str, str]
    assessment_status: TreeMap[str, str]
    assessment_scope: TreeMap[str, str]
    assessment_seq: u256

    def __init__(self):
        self.scope_owner = TreeMap()
        self.scope_data = TreeMap()
        self.latest_attempt = TreeMap()
        self.latest_authoritative = TreeMap()
        self.assessments = TreeMap()
        self.assessment_status = TreeMap()
        self.assessment_scope = TreeMap()
        self.assessment_seq = u256(0)

    @gl.public.write
    def pin_scope(self, lei: str, services: str, expected_domain: str, policy_version: str) -> str:
        if not lei or not services or not expected_domain or not policy_version:
            raise gl.vm.UserError("scope fields required")
        canonical = _scope_text(lei, services, expected_domain, policy_version)
        scope_id = _digest(canonical)
        existing = self.scope_data.get(scope_id, "")
        if existing and existing != canonical:
            raise gl.vm.UserError("scope collision")
        self.scope_owner[scope_id] = gl.message.sender_address
        self.scope_data[scope_id] = canonical
        return scope_id

    @gl.public.view
    def get_scope(self, scope_id: str) -> str:
        return self.scope_data.get(scope_id, "")

    @gl.public.view
    def get_heads(self, scope_id: str) -> str:
        return json.dumps({
            "latest_attempt_id": self.latest_attempt.get(scope_id, ""),
            "latest_authoritative_id": self.latest_authoritative.get(scope_id, ""),
        }, sort_keys=True)

    @gl.public.view
    def get_assessment(self, assessment_id: str) -> str:
        return self.assessments.get(assessment_id, "")

    @gl.public.view
    def can_settle(self, scope_id: str, jurisdiction: str, required_services: str, max_age: u256) -> bool:
        aid = self.latest_authoritative.get(scope_id, "")
        if not aid:
            return False
        if self.latest_attempt.get(scope_id, "") != aid:
            return False
        row = self.assessments.get(aid, "")
        if not row or self.assessment_status.get(aid, "") != "AUTHORITATIVE":
            return False
        data = json.loads(row)
        if data.get("observed_at", 0) + int(max_age) < int(gl.block.timestamp):
            return False
        state = data.get("states", {}).get(jurisdiction, "SOURCE_UNAVAILABLE")
        if state not in ("CLEAR", "RESTRICTED"):
            return False
        if state == "RESTRICTED":
            return False
        return required_services.upper() in data.get("service_evidence", "").upper()

    @gl.public.write
    def assess(self, scope_id: str, observed_at: u256, esma_as_of: str, row_as_of: str, gleif_update: str, gleif_renewal: str, source_manifest: str, matched_rows: str, semantic_evidence: str, states_json: str, service_evidence: str, outcome: str) -> str:
        canonical = self.scope_data.get(scope_id, "")
        if not canonical:
            raise gl.vm.UserError("unknown scope")
        if outcome not in ({"AUTHORITATIVE"} | FAILURES):
            raise gl.vm.UserError("invalid outcome")
        states = json.loads(states_json)
        for code in JURISDICTIONS:
            if code not in states or states[code] not in TERMINAL | FAILURES:
                raise gl.vm.UserError("complete state matrix required")

        def independently_review() -> str:
            prompt = """Review the regulator-authored evidence below. Return JSON with exactly
            {\"decision\": \"ALLOW\" or \"RESTRICT\", \"reason\": string}.
            Missing authorization must never become ALLOW. A restriction, limitation,
            exclusion, warning, or identity mismatch must produce RESTRICT.\n""" + semantic_evidence
            return gl.nondet.exec_prompt(prompt)

        semantic = gl.eq_principle.prompt_comparative(
            independently_review,
            principle="The decision field must agree exactly; RESTRICT is safe if the evidence is ambiguous."
        )
        semantic_obj = json.loads(semantic)
        if semantic_obj.get("decision") not in ("ALLOW", "RESTRICT"):
            outcome = "SEMANTIC_INCONCLUSIVE"
        elif semantic_obj.get("decision") == "RESTRICT" and outcome == "AUTHORITATIVE":
            for code in JURISDICTIONS:
                if states[code] == "CLEAR":
                    states[code] = "RESTRICTED"

        self.assessment_seq += u256(1)
        aid = _digest(scope_id + ":" + str(self.assessment_seq) + ":" + source_manifest + ":" + matched_rows)
        record = {
            "assessment_id": aid, "scope_id": scope_id, "observed_at": int(observed_at),
            "esma_publication_as_of": esma_as_of, "matched_row_as_of": row_as_of,
            "gleif_last_update": gleif_update, "gleif_next_renewal": gleif_renewal,
            "source_manifest_digest": _digest(source_manifest), "matched_rows_digest": _digest(matched_rows),
            "semantic_evidence_digest": _digest(semantic_evidence), "states": states,
            "service_evidence": service_evidence.upper(), "semantic_decision": semantic_obj.get("decision", "RESTRICT"),
        }
        self.assessments[aid] = json.dumps(record, sort_keys=True)
        self.assessment_status[aid] = outcome
        self.assessment_scope[aid] = scope_id
        self.latest_attempt[scope_id] = aid
        if outcome == "AUTHORITATIVE":
            self.latest_authoritative[scope_id] = aid
        return aid
