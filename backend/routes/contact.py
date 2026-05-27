"""Contact form endpoint. Sends submissions to designated Active Recovery 360
team inboxes via Resend. Form data is also persisted to the `contact_messages`
collection so messages aren't lost if email delivery fails."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId
from bson.errors import InvalidId

from services.database import get_collection
from services.email import send_email
from routes.auth import require_admin

router = APIRouter()

# Where contact-form submissions are delivered
CONTACT_RECIPIENTS = ["reggie@coolgeek.me", "kevin@activerecovery360.com"]


class ContactSubmission(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    subject: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=5000)


def _escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("\n", "<br>")
    )


def _transform(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name", ""),
        "email": doc.get("email", ""),
        "subject": doc.get("subject", ""),
        "message": doc.get("message", ""),
        "isRead": bool(doc.get("isRead", False)),
        "createdAt": doc.get("createdAt"),
    }


@router.post("/contact")
async def submit_contact_form(payload: ContactSubmission):
    record = {
        "name": payload.name.strip(),
        "email": payload.email,
        "subject": payload.subject.strip(),
        "message": payload.message.strip(),
        "isRead": False,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    # Persist first so nothing is lost even if email send fails
    await get_collection("contact_messages").insert_one(dict(record))

    html_body = f"""
    <!DOCTYPE html>
    <html><body style="font-family: Arial, sans-serif; color: #1f2937;">
      <h2 style="color:#1e3a8a;">New Contact Form Submission</h2>
      <p><strong>From:</strong> {_escape(record['name'])} &lt;{_escape(record['email'])}&gt;</p>
      <p><strong>Subject:</strong> {_escape(record['subject'])}</p>
      <hr/>
      <p style="white-space:pre-wrap;">{_escape(record['message'])}</p>
      <hr/>
      <p style="color:#6b7280;font-size:12px;">Sent {record['createdAt']} from activerecovery360.com</p>
    </body></html>
    """

    results = []
    for recipient in CONTACT_RECIPIENTS:
        result = await send_email(
            to_email=recipient,
            subject=f"[Contact Form] {record['subject']}",
            html_content=html_body,
        )
        results.append({"recipient": recipient, **result})

    any_failure = any(r.get("status") == "error" for r in results)
    if any_failure:
        # Don't 500 the user — message was saved; just include status
        return {
            "status": "partial",
            "message": "Your message was received. Email delivery had an issue but the team will see it.",
            "delivery": results,
        }

    return {
        "status": "success",
        "message": "Thanks! Your message has been sent. We'll get back to you soon.",
    }


# ---------- Admin ----------

@router.get("/admin/contact-messages")
async def admin_list_messages(admin: dict = Depends(require_admin)):
    coll = get_collection("contact_messages")
    cursor = coll.find({}).sort("createdAt", -1)
    docs = await cursor.to_list(length=500)
    return [_transform(d) for d in docs]


@router.get("/admin/contact-messages/unread-count")
async def admin_unread_count(admin: dict = Depends(require_admin)):
    coll = get_collection("contact_messages")
    count = await coll.count_documents({"isRead": {"$ne": True}})
    return {"unread": count}


def _oid_or_404(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Message not found")


@router.post("/admin/contact-messages/{message_id}/mark-read")
async def admin_mark_read(message_id: str, admin: dict = Depends(require_admin)):
    coll = get_collection("contact_messages")
    result = await coll.find_one_and_update(
        {"_id": _oid_or_404(message_id)},
        {"$set": {"isRead": True}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Message not found")
    return _transform(result)


@router.post("/admin/contact-messages/{message_id}/mark-unread")
async def admin_mark_unread(message_id: str, admin: dict = Depends(require_admin)):
    coll = get_collection("contact_messages")
    result = await coll.find_one_and_update(
        {"_id": _oid_or_404(message_id)},
        {"$set": {"isRead": False}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Message not found")
    return _transform(result)


@router.delete("/admin/contact-messages/{message_id}")
async def admin_delete_message(message_id: str, admin: dict = Depends(require_admin)):
    coll = get_collection("contact_messages")
    result = await coll.delete_one({"_id": _oid_or_404(message_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Deleted"}
