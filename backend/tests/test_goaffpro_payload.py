"""The GoAffPro conversion payload must match what their API actually accepts.

Regression guard for a quiet failure: the shop reported zero commissions for
weeks because the documented three-field payload is rejected by the live
endpoint. These tests pin the envelope and the arithmetic so that can't
silently come back.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("GOAFFPRO_SHOP_ID", "testshop")

from services import goaffpro  # noqa: E402


def _order(**kw):
    base = {
        "_id": "6afc9e728b2f2f1c3de7d893",
        "totalAmount": 2508,
        "shippingAmount": 800,
        "taxAmount": 209,
        "discountAmount": 0,
        "discountCode": None,
        "items": [{"productName": "CBD Patches", "quantity": 1, "price": 1499}],
        "affiliateRef": "REFTEST",
    }
    base.update(kw)
    return base


def test_uses_the_api2_host():
    """api.goaffpro.com rejects every payload from a custom-SDK store."""
    assert goaffpro.ORDER_COMPLETE_URL == "https://api2.goaffpro.com/order_complete"


def test_envelope_has_every_key_the_sdk_sends():
    payload = goaffpro.build_payload(_order(), "abc123", "REFTEST")
    for key in (
        "sub_id", "ref", "shop", "location", "navigator",
        "referrer", "discount_code", "order_id", "visit_id", "data",
    ):
        assert key in payload, f"missing envelope key {key}"
    # `data` is what makes the API accept the callback at all.
    assert isinstance(payload["data"], dict)


def test_ref_and_shop_are_carried_through():
    payload = goaffpro.build_payload(_order(), "abc123", "REFTEST")
    assert payload["ref"] == "REFTEST"
    assert payload["shop"] == goaffpro.GOAFFPRO_SHOP_ID
    assert payload["order_id"] == "abc123"


def test_amounts_reconcile_to_the_order_total():
    """subtotal + shipping + tax must equal total, or GoAffPro stores a lie."""
    d = goaffpro.build_payload(_order(), "abc123", "REF")["data"]
    assert d["subtotal"] + d["shipping"] + d["tax"] == d["total"]
    assert d["total"] == 2508
    assert d["subtotal"] == 1499  # 2508 - 800 - 209


def test_discount_is_reported_not_folded_into_subtotal():
    d = goaffpro.build_payload(_order(discountAmount=500), "abc", "R")["data"]
    assert d["discount"] == 500


def test_force_sdk_is_set():
    """Without it GoAffPro tries to enrich from a platform that doesn't exist."""
    assert goaffpro.build_payload(_order(), "abc", "R")["data"]["forceSDK"] is True


def test_line_items_are_forwarded():
    d = goaffpro.build_payload(_order(), "abc", "R")["data"]
    assert d["line_items"][0]["name"] == "CBD Patches"
    assert d["line_items"][0]["quantity"] == 1
    assert d["line_items"][0]["price"] == 1499


def test_missing_amounts_do_not_raise():
    """Historical orders predate shipping and tax fields."""
    d = goaffpro.build_payload({"_id": "x", "totalAmount": 1000}, "x", "R")["data"]
    assert d["total"] == 1000
    assert d["shipping"] == 0
    assert d["tax"] == 0
    assert d["subtotal"] == 1000


def test_hcp_referral_is_still_skipped():
    """One sale must never pay both an affiliate and a provider."""
    should, reason = goaffpro.evaluate(_order(hcpReferralId="hcp123"))
    assert should is False
    assert reason == goaffpro.STATUS_SKIPPED_HCP


def test_order_without_a_ref_is_skipped():
    should, reason = goaffpro.evaluate(_order(affiliateRef=None))
    assert should is False
    assert reason == goaffpro.STATUS_SKIPPED_NO_REF
