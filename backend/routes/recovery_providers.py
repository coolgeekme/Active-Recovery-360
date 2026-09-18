"""Local Recovery Services provider signup.

Public application form for the Active Recovery 360 Local Exercise, Injury &
Performance Recovery Provider Network. This is deliberately SEPARATE from the
clinical HCP application (routes/auth.py register + routes/admin.py approve):
an HCP applicant must supply a licence number and a medical specialty, which a
massage therapist, mobility coach or recovery studio does not have. Kevin
flagged that the Recovery Services page was sending everyone to the clinical
form (Sep 14-15).

Submissions are persisted first and emailed second, so a missing mail
credential can never lose an application - the same ordering used by
routes/contact.py.
"""
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId
from bson.errors import InvalidId

from services.database import get_collection
from services.email import send_email
from routes.auth import require_admin

router = APIRouter()

# Where new provider applications are delivered
APPLICATION_RECIPIENTS = ["reggie@coolgeek.me", "kevin@activerecovery360.com"]

# Valid values, mirrored from the signup page and Kevin's content doc.
PROVIDER_TYPES = [
    "Physical Therapist", "Chiropractor", "Athletic Trainer", "Sports Medicine",
    "Strength & Conditioning", "Exercise Professional", "Massage Therapist",
    "Recovery Specialist", "Rehabilitation Provider", "Other",
]
SERVICE_AREAS = [
    "Local / Same City", "5-10 Miles", "10-25 Miles", "25+ Miles",
    "Telehealth / Virtual Services", "Mobile / In-Home Services",
]
NETWORK_TIERS = ["basic", "featured", "partner"]
STATUSES = ["new", "contacted", "approved", "declined", "archived"]


class RecoveryProviderApplication(BaseModel):
    # Provider information
    first_name: str = Field(..., min_length=1, max_length=80, alias="firstName")
    last_name: str = Field(..., min_length=1, max_length=80, alias="lastName")
    credentials: Optional[str] = Field(default=None, max_length=160)  # title / credentials
    business_name: str = Field(..., min_length=1, max_length=160, alias="businessName")
    provider_types: List[str] = Field(default=[], alias="providerTypes")
    provider_type_other: Optional[str] = Field(default=None, max_length=120, alias="providerTypeOther")

    # Contact information
    business_address: Optional[str] = Field(default=None, max_length=240, alias="businessAddress")
    city: Optional[str] = Field(default=None, max_length=80)
    state: Optional[str] = Field(default=None, max_length=40)
    zip_code: Optional[str] = Field(default=None, max_length=20, alias="zipCode")
    business_phone: Optional[str] = Field(default=None, max_length=40, alias="businessPhone")
    email: EmailStr
    website: Optional[str] = Field(default=None, max_length=240)

    # Services
    services: List[str] = Field(default=[])
    service_other: Optional[str] = Field(default=None, max_length=120, alias="serviceOther")
    service_description: Optional[str] = Field(default=None, max_length=4000, alias="serviceDescription")

    # Ideal clients
    ideal_clients: List[str] = Field(default=[], alias="idealClients")
    ideal_client_other: Optional[str] = Field(default=None, max_length=120, alias="idealClientOther")

    # Service area
    service_area: Optional[str] = Field(default=None, alias="serviceArea")

    # Provider profile
    bio: Optional[str] = Field(default=None, max_length=4000)
    years_in_practice: Optional[str] = Field(default=None, max_length=40, alias="yearsInPractice")
    certifications: Optional[str] = Field(default=None, max_length=1000)
    specialties: Optional[str] = Field(default=None, max_length=1000)

    # Online profile
    facebook: Optional[str] = Field(default=None, max_length=240)
    instagram: Optional[str] = Field(default=None, max_length=240)
    linkedin: Optional[str] = Field(default=None, max_length=240)
    booking_link: Optional[str] = Field(default=None, max_length=240, alias="bookingLink")

    # Which listing they are interested in
    network_tier: Optional[str] = Field(default=None, alias="networkTier")

    class Config:
        populate_by_name = True


def _transform(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "firstName": doc.get("firstName", ""),
        "lastName": doc.get("lastName", ""),
        "credentials": doc.get("credentials"),
        "businessName": doc.get("businessName", ""),
        "providerTypes": doc.get("providerTypes", []),
        "providerTypeOther": doc.get("providerTypeOther"),
        "businessAddress": doc.get("businessAddress"),
        "city": doc.get("city"),
        "state": doc.get("state"),
        "zipCode": doc.get("zipCode"),
        "businessPhone": doc.get("businessPhone"),
        "email": doc.get("email", ""),
        "website": doc.get("website"),
        "services": doc.get("services", []),
        "serviceOther": doc.get("serviceOther"),
        "serviceDescription": doc.get("serviceDescription"),
        "idealClients": doc.get("idealClients", []),
        "idealClientOther": doc.get("idealClientOther"),
        "serviceArea": doc.get("serviceArea"),
        "bio": doc.get("bio"),
        "yearsInPractice": doc.get("yearsInPractice"),
        "certifications": doc.get("certifications"),
        "specialties": doc.get("specialties"),
        "facebook": doc.get("facebook"),
        "instagram": doc.get("instagram"),
        "linkedin": doc.get("linkedin"),
        "bookingLink": doc.get("bookingLink"),
        "networkTier": doc.get("networkTier"),
        "status": doc.get("status", "new"),
        "isRead": bool(doc.get("isRead", False)),
        "createdAt": doc.get("createdAt"),
    }


def _escape(text: str) -> str:
    return (
        str(text)
        .replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        .replace('"', "&quot;").replace("\n", "<br>")
    )


def _email_body(app: dict) -> str:
    def row(label, value):
        if not value:
            return ""
        if isinstance(value, list):
            value = ", ".join(str(v) for v in value)
        return f'<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap;">{_escape(label)}</td><td style="padding:4px 0;">{_escape(value)}</td></tr>'

    sections = [
        ("Provider", [
            row("Name", f"{app.get('firstName','')} {app.get('lastName','')}".strip()),
            row("Credentials", app.get("credentials")),
            row("Business", app.get("businessName")),
            row("Provider type", app.get("providerTypes")),
            row("Provider type (other)", app.get("providerTypeOther")),
        ]),
        ("Contact", [
            row("Email", app.get("email")),
            row("Phone", app.get("businessPhone")),
            row("Address", app.get("businessAddress")),
            row("City", app.get("city")),
            row("State", app.get("state")),
            row("ZIP", app.get("zipCode")),
            row("Website", app.get("website")),
        ]),
        ("Services", [
            row("Services", app.get("services")),
            row("Service (other)", app.get("serviceOther")),
            row("Description", app.get("serviceDescription")),
            row("Ideal clients", app.get("idealClients")),
            row("Ideal clients (other)", app.get("idealClientOther")),
            row("Service area", app.get("serviceArea")),
        ]),
        ("Profile", [
            row("Bio", app.get("bio")),
            row("Years in practice", app.get("yearsInPractice")),
            row("Certifications", app.get("certifications")),
            row("Specialties", app.get("specialties")),
            row("Facebook", app.get("facebook")),
            row("Instagram", app.get("instagram")),
            row("LinkedIn", app.get("linkedin")),
            row("Booking link", app.get("bookingLink")),
        ]),
        ("Listing interest", [row("Network tier", (app.get("networkTier") or "").title())]),
    ]
    html = ['<div style="font-family:Arial,sans-serif;color:#333;max-width:680px;">']
    html.append("<h2 style=\"color:#0f4c81;\">New Local Recovery Services provider application</h2>")
    html.append(f"<p>{_escape(app.get('businessName',''))} submitted a provider profile.</p>")
    for title, rows in sections:
        body = "".join(r for r in rows if r)
        if body:
            html.append(f'<h3 style="margin:18px 0 6px;font-size:14px;color:#0f4c81;text-transform:uppercase;letter-spacing:.04em;">{title}</h3>')
            html.append(f'<table style="font-size:14px;border-collapse:collapse;">{body}</table>')
    html.append("</div>")
    return "".join(html)


@router.post("/recovery-provider-applications")
async def submit_recovery_provider_application(payload: RecoveryProviderApplication):
    """Public endpoint - no account required, matching the page copy
    ('Complete the provider profile below and we'll contact you')."""
    record = payload.model_dump(by_alias=True)
    record["email"] = str(record["email"]).lower()
    record["status"] = "new"
    record["isRead"] = False
    record["createdAt"] = datetime.now(timezone.utc).isoformat()

    # Persist first: a missing mail credential must never lose an application.
    result = await get_collection("recovery_provider_applications").insert_one(dict(record))
    record["_id"] = result.inserted_id

    email_result = {"status": "not_attempted"}
    try:
        name = f"{record.get('firstName','')} {record.get('lastName','')}".strip()
        email_result = await send_email(
            to_email=", ".join(APPLICATION_RECIPIENTS),
            subject=f"New provider application — {record.get('businessName','')}",
            html_content=_email_body(record),
        )
    except Exception as e:  # never fail the submission because email broke
        email_result = {"status": "error", "message": str(e)[:200]}

    return {
        "status": "received",
        "id": str(result.inserted_id),
        "email": email_result.get("status"),
    }


@router.get("/admin/recovery-provider-applications")
async def list_recovery_provider_applications(
    status: Optional[str] = None,
    admin: dict = Depends(require_admin),
):
    apps = get_collection("recovery_provider_applications")
    query: dict = {}
    if status and status != "all":
        query["status"] = status
    cursor = apps.find(query).sort("createdAt", -1)
    docs = await cursor.to_list(length=500)
    return [_transform(d) for d in docs]


@router.get("/admin/recovery-provider-applications/unread-count")
async def unread_recovery_provider_applications(admin: dict = Depends(require_admin)):
    apps = get_collection("recovery_provider_applications")
    return {"unread": await apps.count_documents({"isRead": False})}


@router.post("/admin/recovery-provider-applications/{application_id}/read")
async def mark_recovery_provider_read(
    application_id: str,
    read: bool = True,
    admin: dict = Depends(require_admin),
):
    apps = get_collection("recovery_provider_applications")
    try:
        oid = ObjectId(application_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Application not found")
    result = await apps.update_one({"_id": oid}, {"$set": {"isRead": read}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"status": "updated", "isRead": read}


@router.patch("/admin/recovery-provider-applications/{application_id}")
async def update_recovery_provider_application(
    application_id: str,
    payload: dict,
    admin: dict = Depends(require_admin),
):
    """Update the review status (new / contacted / approved / declined / archived)."""
    update = {}
    if "status" in payload:
        if payload["status"] not in STATUSES:
            raise HTTPException(status_code=400, detail=f"status must be one of {STATUSES}")
        update["status"] = payload["status"]
    if "isRead" in payload:
        update["isRead"] = bool(payload["isRead"])
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    apps = get_collection("recovery_provider_applications")
    try:
        oid = ObjectId(application_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Application not found")
    result = await apps.find_one_and_update({"_id": oid}, {"$set": update}, return_document=True)
    if not result:
        raise HTTPException(status_code=404, detail="Application not found")
    return _transform(result)
