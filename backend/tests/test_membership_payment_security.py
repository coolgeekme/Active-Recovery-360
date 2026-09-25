"""
Security tests for the membership payment path.

These pin the invariants that were BROKEN before, so they cannot regress:

  1. The price comes from the server, never from the request body.
  2. A confirmation must be backed by a payment that actually covers the price.
  3. A payment intent can only be claimed by the user it was created for.
  4. A non-membership intent cannot activate a membership.
"""
import asyncio
from bson import ObjectId

# Real user ids are Mongo ObjectIds, so the fixtures must be valid 24-char hex.
USER_ID = "64b7f0c2a1b2c3d4e5f60001"
OTHER_USER_ID = "64b7f0c2a1b2c3d4e5f60002"

import pytest

from routes import payments
from services import discounts


# --- pricing math (pure) ----------------------------------------------------

def test_no_discount_is_full_price():
    assert discounts.apply_discount(2900, None) == 2900


def test_percentage_discount():
    assert discounts.apply_discount(2900, {"discountType": "percentage", "discountValue": 10}) == 2610


def test_flat_discount_is_dollars_not_cents():
    """A $5 flat discount must take off 500 cents, not 5."""
    assert discounts.apply_discount(2900, {"discountType": "flat", "discountValue": 5}) == 2400


def test_discount_floors_at_zero():
    """An oversized discount must never produce a negative charge."""
    assert discounts.apply_discount(2900, {"discountType": "flat", "discountValue": 500}) == 0
    assert discounts.apply_discount(2900, {"discountType": "percentage", "discountValue": 150}) == 0


# --- create_payment_intent: the price is server-side ------------------------

class _RecordingPI:
    def __init__(self, sink):
        self.sink = sink

    def create(self, **kwargs):
        self.sink.append(kwargs)

        class _Intent:
            client_secret = "pi_secret_test"
            amount = kwargs["amount"]
        return _Intent()


class _FakeStripe:
    def __init__(self, sink):
        self.PaymentIntent = _RecordingPI(sink)


def _stripe_sink(monkeypatch):
    calls = []
    monkeypatch.setattr(payments, "get_stripe", lambda: _FakeStripe(calls))
    return calls


def test_client_supplied_amount_is_ignored(monkeypatch):
    """The original vulnerability: caller set the price."""
    calls = _stripe_sink(monkeypatch)

    # Even a deliberate lowball is ignored.
    asyncio.run(payments.create_payment_intent({"amount": 0.50}, user={"id": "64b7f0c2a1b2c3d4e5f60001"}))

    assert calls[0]["amount"] == payments.MEMBERSHIP_PRICE_CENTS


def test_amount_is_never_a_parameter_at_all(monkeypatch):
    calls = _stripe_sink(monkeypatch)
    asyncio.run(payments.create_payment_intent({}, user={"id": "64b7f0c2a1b2c3d4e5f60001"}))
    assert calls[0]["amount"] == 2900


def test_metadata_records_user_and_expected_amount(monkeypatch):
    calls = _stripe_sink(monkeypatch)
    asyncio.run(payments.create_payment_intent({}, user={"id": "64b7f0c2a1b2c3d4e5f60001"}))
    meta = calls[0]["metadata"]
    assert meta["type"] == "membership"
    assert meta["userId"] == "64b7f0c2a1b2c3d4e5f60001"
    assert meta["expectedAmountCents"] == "2900"


def test_discount_is_applied_server_side(monkeypatch):
    calls = _stripe_sink(monkeypatch)

    async def fake_resolve(code):
        return {"_id": ObjectId(), "code": "SAVE10", "discountType": "percentage", "discountValue": 10}

    monkeypatch.setattr(payments, "resolve_discount_code", fake_resolve)
    asyncio.run(payments.create_payment_intent({"discountCode": "save10"}, user={"id": "64b7f0c2a1b2c3d4e5f60001"}))

    assert calls[0]["amount"] == 2610
    assert calls[0]["metadata"]["expectedAmountCents"] == "2610"
    assert calls[0]["metadata"]["discountCode"] == "SAVE10"


# --- confirm_membership_payment: verify what was actually paid --------------

class _Intent:
    def __init__(self, status="succeeded", metadata=None, amount_received=2900):
        self.status = status
        self.metadata = metadata if metadata is not None else {}
        self.amount_received = amount_received

    # Real Stripe objects are dict-like as well as attribute-accessible.
    def get(self, key, default=None):
        if key == "metadata":
            return self.metadata
        return getattr(self, key, default)


def _confirm_env(monkeypatch, intent, user_doc=None):
    """Wire up fakes for confirm_membership_payment."""
    class _PI:
        def retrieve(self, _id):
            return intent

    class _Stripe:
        PaymentIntent = _PI()

    monkeypatch.setattr(payments, "get_stripe", lambda: _Stripe())

    class _Users:
        async def find_one_and_update(self, *a, **kw):
            return user_doc if user_doc is not None else {
                "_id": ObjectId(), "email": "a@b.com", "fullName": "Ann Lee",
                "username": "ann", "isAdmin": False, "isDoctor": False,
            }

    class _Discounts:
        async def update_one(self, *a, **kw):
            return None

    def fake_get_collection(name):
        return _Users() if name == "users" else _Discounts()

    monkeypatch.setattr(payments, "get_collection", fake_get_collection)

    async def _noop(*a, **kw):
        return None

    monkeypatch.setattr(payments, "send_membership_welcome_email", _noop)


def _meta(**over):
    base = {"type": "membership", "userId": "64b7f0c2a1b2c3d4e5f60001", "expectedAmountCents": "2900"}
    base.update(over)
    return base


def test_underpayment_is_rejected(monkeypatch):
    """The core fix: paying less than the price must not grant membership."""
    _confirm_env(monkeypatch, _Intent(metadata=_meta(), amount_received=50))

    with pytest.raises(payments.HTTPException) as exc:
        asyncio.run(payments.confirm_membership_payment(
            {"paymentIntentId": "pi_1"}, user={"id": "64b7f0c2a1b2c3d4e5f60001"}
        ))
    assert exc.value.status_code == 400
    assert "does not cover" in exc.value.detail


def test_exact_payment_succeeds(monkeypatch):
    _confirm_env(monkeypatch, _Intent(metadata=_meta(), amount_received=2900))
    result = asyncio.run(payments.confirm_membership_payment(
        {"paymentIntentId": "pi_1"}, user={"id": "64b7f0c2a1b2c3d4e5f60001"}
    ))
    assert result["isMember"] is True


def test_payment_for_another_user_is_rejected(monkeypatch):
    _confirm_env(monkeypatch, _Intent(metadata=_meta(userId="64b7f0c2a1b2c3d4e5f60002")))

    with pytest.raises(payments.HTTPException) as exc:
        asyncio.run(payments.confirm_membership_payment(
            {"paymentIntentId": "pi_1"}, user={"id": "64b7f0c2a1b2c3d4e5f60001"}
        ))
    assert exc.value.status_code == 403


def test_non_membership_intent_is_rejected(monkeypatch):
    _confirm_env(monkeypatch, _Intent(metadata=_meta(type="product_order")))

    with pytest.raises(payments.HTTPException) as exc:
        asyncio.run(payments.confirm_membership_payment(
            {"paymentIntentId": "pi_1"}, user={"id": "64b7f0c2a1b2c3d4e5f60001"}
        ))
    assert exc.value.status_code == 400


def test_unpaid_intent_is_rejected(monkeypatch):
    _confirm_env(monkeypatch, _Intent(status="requires_payment_method"))

    with pytest.raises(payments.HTTPException) as exc:
        asyncio.run(payments.confirm_membership_payment(
            {"paymentIntentId": "pi_1"}, user={"id": "64b7f0c2a1b2c3d4e5f60001"}
        ))
    assert exc.value.status_code == 400


def test_intent_without_recorded_expectation_must_cover_list_price(monkeypatch):
    """Fail closed: no recorded expectation means the full price is required."""
    _confirm_env(monkeypatch, _Intent(metadata=_meta(expectedAmountCents=None), amount_received=100))

    with pytest.raises(payments.HTTPException) as exc:
        asyncio.run(payments.confirm_membership_payment(
            {"paymentIntentId": "pi_1"}, user={"id": "64b7f0c2a1b2c3d4e5f60001"}
        ))
    assert exc.value.status_code == 400


def test_discounted_payment_covering_discounted_price_succeeds(monkeypatch):
    _confirm_env(monkeypatch, _Intent(metadata=_meta(expectedAmountCents="2610"), amount_received=2610))
    result = asyncio.run(payments.confirm_membership_payment(
        {"paymentIntentId": "pi_1"}, user={"id": "64b7f0c2a1b2c3d4e5f60001"}
    ))
    assert result["isMember"] is True
