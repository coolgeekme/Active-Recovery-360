"""Unit tests for GoAffPro conversion precedence + idempotency.

These cover `services.goaffpro.evaluate()` and `report_order()` — the rules that
decide whether a completed order is reported to GoAffPro. They are pure-logic
tests (no DB, no network) because the rules themselves are what cost real money
if they regress:

  * an order carrying an HCP referral must NOT also be reported, or one sale
    pays two commissions;
  * an already-synced order must never be reported twice on retry.

Run: pytest backend/tests/test_goaffpro_precedence.py -v
"""
import asyncio
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services import goaffpro  # noqa: E402
from services.goaffpro import (  # noqa: E402
    STATUS_FAILED,
    STATUS_SKIPPED_ALREADY,
    STATUS_SKIPPED_HCP,
    STATUS_SKIPPED_NO_REF,
    STATUS_SKIPPED_UNCONFIGURED,
    STATUS_SYNCED,
)

SHOP = "activerecovery360.com"


@pytest.fixture(autouse=True)
def configured(monkeypatch):
    """Treat the shop as configured unless a test says otherwise."""
    monkeypatch.setattr(goaffpro, "GOAFFPRO_SHOP_ID", SHOP)


def order(**overrides) -> dict:
    base = {"_id": "65f000000000000000000001", "totalAmount": 12000}
    base.update(overrides)
    return base


# --- precedence -------------------------------------------------------------

def test_hcp_referral_wins_over_affiliate():
    """The core anti-double-pay rule: HCP beats the affiliate cookie."""
    should, reason = goaffpro.evaluate(
        order(hcpReferralId="hcp-123", affiliateRef="aff-abc")
    )
    assert should is False
    assert reason == STATUS_SKIPPED_HCP


def test_affiliate_only_is_reported():
    should, reason = goaffpro.evaluate(order(affiliateRef="aff-abc"))
    assert should is True
    assert reason == "ok"


def test_whitespace_only_ref_is_not_reported():
    should, reason = goaffpro.evaluate(order(affiliateRef="   "))
    assert should is False
    assert reason == STATUS_SKIPPED_NO_REF


def test_missing_ref_is_not_reported():
    should, reason = goaffpro.evaluate(order())
    assert should is False
    assert reason == STATUS_SKIPPED_NO_REF


# --- idempotency ------------------------------------------------------------

def test_already_synced_is_never_reported_twice():
    should, reason = goaffpro.evaluate(
        order(affiliateRef="aff-abc", goaffproSyncStatus=STATUS_SYNCED)
    )
    assert should is False
    assert reason == STATUS_SKIPPED_ALREADY


def test_idempotency_beats_precedence_ordering():
    """An already-synced order short-circuits before any other rule."""
    should, reason = goaffpro.evaluate(
        order(
            affiliateRef="aff-abc",
            hcpReferralId="hcp-123",
            goaffproSyncStatus=STATUS_SYNCED,
        )
    )
    assert should is False
    assert reason == STATUS_SKIPPED_ALREADY


def test_failed_order_can_be_retried():
    """A previous FAILURE must not block a retry — only success is sticky."""
    should, reason = goaffpro.evaluate(
        order(affiliateRef="aff-abc", goaffproSyncStatus=STATUS_FAILED)
    )
    assert should is True
    assert reason == "ok"


# --- configuration ----------------------------------------------------------

def test_unconfigured_shop_skips(monkeypatch):
    monkeypatch.setattr(goaffpro, "GOAFFPRO_SHOP_ID", "")
    should, reason = goaffpro.evaluate(order(affiliateRef="aff-abc"))
    assert should is False
    assert reason == STATUS_SKIPPED_UNCONFIGURED


# --- never raises -----------------------------------------------------------

def test_report_order_swallows_transport_errors(monkeypatch):
    """A GoAffPro outage must never propagate into the order update path."""

    class BoomClient:
        def __init__(self, *a, **kw):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        async def post(self, *a, **kw):
            raise httpx_connect_error()

    def httpx_connect_error():
        import httpx

        return httpx.ConnectError("simulated outage")

    monkeypatch.setattr(goaffpro.httpx, "AsyncClient", BoomClient)

    result = asyncio.run(goaffpro.report_order(order(affiliateRef="aff-abc")))
    assert result["status"] == STATUS_FAILED
    assert result["reported"] is False


def test_report_order_skips_without_calling_out(monkeypatch):
    """The HCP case must not even attempt a request."""
    called = {"n": 0}

    class NeverClient:
        def __init__(self, *a, **kw):
            called["n"] += 1

    monkeypatch.setattr(goaffpro.httpx, "AsyncClient", NeverClient)

    result = asyncio.run(
        goaffpro.report_order(order(hcpReferralId="hcp-123", affiliateRef="aff-abc"))
    )
    assert result["status"] == STATUS_SKIPPED_HCP
    assert called["n"] == 0


def test_sync_fields_records_attempt_and_keeps_success_stamp():
    ok = goaffpro.sync_fields({"status": STATUS_SYNCED, "message": "done", "reported": True})
    assert ok["goaffproSyncStatus"] == STATUS_SYNCED
    assert "goaffproReportedAt" in ok

    bad = goaffpro.sync_fields({"status": STATUS_FAILED, "message": "nope", "reported": False})
    assert bad["goaffproSyncStatus"] == STATUS_FAILED
    assert "goaffproReportedAt" not in bad
