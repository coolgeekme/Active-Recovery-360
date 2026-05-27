"""Contact form endpoint. Sends submissions to designated Active Recovery 360
team inboxes via Resend. Form data is also persisted to the `contact_messages`
collection so messages aren't lost if email delivery fails."""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field

from services.database import get_collection
from services.email import send_email

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


@router.post("/contact")
async def submit_contact_form(payload: ContactSubmission):
    record = {
        "name": payload.name.strip(),
        "email": payload.email,
        "subject": payload.subject.strip(),
        "message": payload.message.strip(),
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
