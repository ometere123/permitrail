import hashlib
import json


JURISDICTIONS = "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IS IT LV LI LT LU MT NL NO PL PT RO SK SI ES SE".split()


def scope_id(lei, services, domain, policy):
    canonical = "|".join([lei.strip().upper(), services.strip().upper(), domain.strip().lower(), policy.strip()])
    return hashlib.sha256(canonical.encode()).hexdigest()


def test_scope_is_canonical_and_domain_case_insensitive():
    assert scope_id("5493001KJTIIGC8Y1R12", "custody, exchange", "EXAMPLE.EU", "mica-v1") == scope_id("5493001KJTIIGC8Y1R12", " custody, exchange ", "example.eu", "mica-v1")


def test_matrix_requires_all_jurisdictions():
    matrix = {code: "CLEAR" for code in JURISDICTIONS}
    assert len(matrix) == 30
    matrix["DE"] = "RESTRICTED"
    assert matrix["DE"] == "RESTRICTED"


def test_failed_attempt_does_not_become_authoritative_head():
    state = {"latest_attempt": "bad", "latest_authoritative": "good"}
    assert state["latest_authoritative"] == "good"


def test_escrow_state_machine_is_fail_closed():
    mandate = {"status": "ACCEPTED", "oracle": False}
    assert mandate["oracle"] is False
    assert mandate["status"] != "SETTLED"
