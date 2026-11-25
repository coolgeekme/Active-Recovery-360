import os
import asyncio
import logging
import resend
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Initialize Resend
resend.api_key = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://activerecovery360.com")
# Teams & Trainers is not a separate program — a team joins the same affiliate
# program, so their "team code" is an ordinary affiliate referral link and the
# email should send them straight to the portal to collect it.
AFFILIATE_PORTAL_URL = os.environ.get(
    "AFFILIATE_PORTAL_URL", "https://activerecovery360.goaffpro.com"
)

async def send_email(to_email: str, subject: str, html_content: str) -> dict:
    """Send an email using Resend"""
    if not resend.api_key:
        logger.warning("RESEND_API_KEY not set, skipping email send")
        return {"status": "skipped", "message": "Email service not configured"}
    
    params = {
        "from": SENDER_EMAIL,
        "to": [to_email],
        "subject": subject,
        "html": html_content
    }
    
    try:
        # Run sync SDK in thread to keep FastAPI non-blocking
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to_email}")
        return {
            "status": "success",
            "message": f"Email sent to {to_email}",
            "email_id": email.get("id")
        }
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return {"status": "error", "message": str(e)}

async def send_password_reset_email(to_email: str, reset_token: str, user_name: str = "User") -> dict:
    """Send password reset email"""
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #0f4c81; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 30px; background-color: #f9f9f9; }}
            .button {{ display: inline-block; padding: 12px 30px; background-color: #0f4c81; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Active Recovery 360</h1>
            </div>
            <div class="content">
                <h2>Password Reset Request</h2>
                <p>Hi {user_name},</p>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                <p style="text-align: center;">
                    <a href="{reset_link}" class="button">Reset Password</a>
                </p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request a password reset, you can safely ignore this email.</p>
                <p style="font-size: 12px; color: #666;">
                    Or copy and paste this link into your browser:<br>
                    {reset_link}
                </p>
            </div>
            <div class="footer">
                <p>&copy; 2026 Active Recovery 360. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return await send_email(to_email, "Reset Your Password - Active Recovery 360", html_content)

async def send_membership_welcome_email(to_email: str, first_name: str = "there") -> dict:
    """Send the membership welcome email after a successful purchase."""
    subject = "Welcome to Active Recovery 360 – Your Recovery Journey Starts Here"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #0f4c81; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 30px; background-color: #f9f9f9; }}
            .button {{ display: inline-block; padding: 12px 30px; background-color: #0f4c81; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Active Recovery 360</h1>
            </div>
            <div class="content">
                <p>Hi {first_name},</p>
                <p>Welcome to Active Recovery 360!</p>
                <p>We're excited to have you as a member of a growing community dedicated to moving better, recovering smarter, preventing injuries, and performing at your best.</p>
                <p>Active Recovery 360 was created to bring exercise, injury and performance recovery resources together in one place.</p>
                <h3>Your Membership Gives You Access To:</h3>
                <p><strong>Exercise &amp; Performance Recovery</strong><br>Resources, products, programs, and tools designed to help you recover from training and stay ready for your next workout.</p>
                <p><strong>Injury Recovery &amp; Prevention</strong><br>Discover recovery solutions and resources to help support your return to activity and reduce the risk of setbacks.</p>
                <p><strong>Healthcare &amp; Recovery Professionals</strong><br>Connect with qualified professionals, clinics, therapists, athletic trainers, chiropractors, and other providers in our growing recovery network.</p>
                <p><strong>🛍️ Recovery Products &amp; Equipment</strong><br>Shop products selected for athletes, active adults, weekend warriors, and healthcare professionals.</p>
                <p>Whether you're recovering from an injury, returning to exercise, training for your next event, or simply trying to stay active and healthy, we're here to help you recover, perform, and keep moving.</p>
                <p>Thank you for becoming part of the Active Recovery 360 community.</p>
                <p>Welcome aboard!</p>
                <p style="text-align: center;">
                    <a href="{FRONTEND_URL}/shop" class="button">Browse Member Products</a>
                </p>
            </div>
            <div class="footer">
                <p>The Active Recovery 360 Team<br>Exercise • Injury &amp; Performance Recovery</p>
            </div>
        </div>
    </body>
    </html>
    """
    return await send_email(to_email, subject, html_content)

async def send_hcp_approval_email(
    to_email: str,
    user_name: str,
    approved: bool,
    storefront_slug: str | None = None,
    reason: str | None = None,
) -> dict:
    """Send HCP application status email"""
    if approved:
        subject = "Your Healthcare Professional Account Has Been Approved!"
        storefront_url = f"{FRONTEND_URL}/hcp/{storefront_slug}" if storefront_slug else None
        storefront_line = (
            f'<p>Your storefront will be live at <a href="{storefront_url}" style="color: #0f4c81;">{storefront_url}</a>.</p>'
            if storefront_url else ""
        )
        status_message = f"""
            <h2 style="color: #28a745;">Congratulations!</h2>
            <p>Your Healthcare Professional account has been approved. You now have access to:</p>
            <ul>
                <li>Professional-grade products</li>
                <li>Exclusive healthcare provider pricing</li>
                <li>Your personalized storefront</li>
            </ul>
            <p style="text-align: center;">
                <a href="{FRONTEND_URL}/hcp/dashboard" class="button">Set Up Your Storefront</a>
            </p>
            {storefront_line}
        """
    else:
        subject = "Update on Your Healthcare Professional Application"
        reason_block = (
            f'<p style="color: #b32d2d;"><strong>Reason:</strong> {reason}</p>'
            if reason else ""
        )
        status_message = f"""
            <h2>Application Update</h2>
            <p>Thank you for your interest in becoming a Healthcare Professional member.</p>
            <p>After reviewing your application, we were unable to verify your credentials at this time.</p>
            {reason_block}
            <p>You're welcome to reapply with updated information. If you believe this is an error,
            please contact our support team.</p>
        """
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #0f4c81; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 30px; background-color: #f9f9f9; }}
            .button {{ display: inline-block; padding: 12px 30px; background-color: #0f4c81; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Active Recovery 360</h1>
            </div>
            <div class="content">
                <p>Hi {user_name},</p>
                {status_message}
            </div>
            <div class="footer">
                <p>&copy; 2026 Active Recovery 360. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return await send_email(to_email, subject, html_content)

async def send_hcp_signup_received_email(to_email: str, user_name: str = "there") -> dict:
    """Send the acknowledgement email when a provider submits an HCP application."""
    subject = "We received your Active Recovery 360 provider application"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #0f4c81; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 30px; background-color: #f9f9f9; }}
            .button {{ display: inline-block; padding: 12px 30px; background-color: #0f4c81; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Active Recovery 360</h1>
            </div>
            <div class="content">
                <p>Hi {user_name},</p>
                <p>Thank you for applying to provide clinical recovery services with Active Recovery 360.</p>
                <p>We've received your application and our team is reviewing your credentials. This usually takes 1&ndash;2 business days.</p>
                <p><strong>What happens next:</strong></p>
                <ul>
                    <li>We verify your license and practice information.</li>
                    <li>You'll get an email the moment your account is approved.</li>
                    <li>Once approved, you can publish your storefront and start listing your services.</li>
                </ul>
                <p>You can check your application status any time from your dashboard:</p>
                <p style="text-align: center;">
                    <a href="{FRONTEND_URL}/hcp/dashboard" class="button">View Application Status</a>
                </p>
                <p>Questions in the meantime? Just reply to this email.</p>
                <p>&mdash; The Active Recovery 360 Team</p>
            </div>
            <div class="footer">
                <p>&copy; 2026 Active Recovery 360. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    return await send_email(to_email, subject, html_content)


async def send_team_signup_welcome_email(
    to_email: str,
    contact_name: str = "there",
    organization: str | None = None,
    role: str = "team",
) -> dict:
    """Acknowledge a Teams & Trainers signup.

    Teams join the SAME affiliate program as everyone else, with their own
    commission rate, so this email sends them straight to the portal to collect
    their referral link rather than promising a code that nobody ever issues.
    """
    role_labels = {
        "team": "Team / Coach",
        "trainer": "Athletic Trainer",
        "both": "Team & Athletic Trainer",
    }
    role_label = role_labels.get((role or "").strip().lower(), "Team / Coach")
    first_name = (contact_name or "there").split(" ")[0] or "there"

    details = [f"<strong>Role:</strong> {role_label}"]
    if organization:
        details.insert(0, f"<strong>Organization:</strong> {organization}")
    details_html = "<br>".join(details)

    subject = "Your Active Recovery 360 team code is ready"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #0f4c81; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 30px; background-color: #f9f9f9; }}
            .button {{ display: inline-block; padding: 12px 30px; background-color: #0f4c81; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Active Recovery 360</h1>
            </div>
            <div class="content">
                <p>Hi {first_name},</p>
                <p>Thanks for signing up for the Active Recovery 360 Teams &amp; Trainers
                program.</p>
                <p><strong>Your signup details</strong><br>
                {details_html}</p>
                <p><strong>Your code is ready now.</strong> Teams aren&apos;t a separate
                program &mdash; you join the same Active Recovery 360 affiliate program as
                everyone else, with your own commission rate.</p>
                <ul>
                    <li>Your referral link and code are available immediately in the
                    affiliate portal.</li>
                    <li>Every qualifying referral earns your team a commission on the
                    products.</li>
                    <li>Share the link with your athletes, parents or clients &mdash; we
                    track the sales for you.</li>
                </ul>
                <p style="text-align: center;">
                    <a href="{AFFILIATE_PORTAL_URL}" class="button">Get Your Affiliate Link</a>
                </p>
                <p>We&apos;ll be in touch separately about your team&apos;s commission rate
                &mdash; reply to this email if you&apos;d like to talk it through.</p>
                <p>In the meantime, take a look at the products your team will be earning
                toward:</p>
                <p style="text-align: center;">
                    <a href="{FRONTEND_URL}/shop" class="button">Browse Recovery Products</a>
                </p>
                <p>Questions? Just reply to this email.</p>
                <p>&mdash; The Active Recovery 360 Team</p>
            </div>
            <div class="footer">
                <p>&copy; 2026 Active Recovery 360. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    return await send_email(to_email, subject, html_content)


# ---------------------------------------------------------------------------
# Order emails
#
# These did not exist at all before: the shop could take a card payment and
# send nobody anything. Kevin reported exactly that ("not getting any email
# notifications on orders").
# ---------------------------------------------------------------------------

# Who hears about a new order. info@ is an alias on the admin@ M365 mailbox.
ORDER_NOTIFICATION_RECIPIENTS = [
    "info@activerecovery360.com",
    "reggie@coolgeek.me",
]


def _esc(value) -> str:
    """Minimal HTML escape — order fields come from user input."""
    return (
        str(value if value is not None else "")
        .replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _money(cents) -> str:
    try:
        return f"${(int(cents or 0) / 100):,.2f}"
    except (TypeError, ValueError):
        return "$0.00"


def _order_rows_html(order: dict) -> str:
    rows = []
    for item in order.get("items", []) or []:
        name = _esc(item.get("name", ""))
        variant = item.get("variantName")
        if variant:
            name += f" <span style='color:#666'>({_esc(variant)})</span>"
        qty = item.get("quantity", 1)
        line = (item.get("price", 0) or 0) * (qty or 1)
        rows.append(
            f"<tr><td style='padding:6px 0'>{name}</td>"
            f"<td style='text-align:center'>{qty}</td>"
            f"<td style='text-align:right'>{_money(line)}</td></tr>"
        )
    return "".join(rows) or "<tr><td colspan='3'>No items</td></tr>"


def _order_totals_html(order: dict) -> str:
    parts = [
        f"<tr><td>Subtotal</td><td style='text-align:right'>{_money(order.get('subtotal'))}</td></tr>"
    ]
    if (order.get("discountAmount") or 0) > 0:
        parts.append(
            f"<tr><td>Discount {_esc(order.get('discountCode') or '')}</td>"
            f"<td style='text-align:right'>-{_money(order.get('discountAmount'))}</td></tr>"
        )
    parts.append(
        f"<tr><td>{_esc(order.get('shippingLabel') or 'Shipping')}</td>"
        f"<td style='text-align:right'>"
        f"{'Free' if not order.get('shippingAmount') else _money(order.get('shippingAmount'))}</td></tr>"
    )
    if (order.get("taxAmount") or 0) > 0:
        parts.append(
            f"<tr><td>Sales tax</td><td style='text-align:right'>{_money(order.get('taxAmount'))}</td></tr>"
        )
    parts.append(
        f"<tr><td style='font-weight:bold;padding-top:10px;border-top:1px solid #ddd'>Total</td>"
        f"<td style='text-align:right;font-weight:bold;padding-top:10px;border-top:1px solid #ddd'>"
        f"{_money(order.get('totalAmount'))}</td></tr>"
    )
    return "".join(parts)


_ORDER_WRAPPER = """
    <div class="container">
      <div class="header"><h1>Active Recovery 360</h1></div>
      <div class="content">{body}</div>
      <div class="footer">
        <p>The Active Recovery 360 Team<br>Exercise &bull; Injury &amp; Performance Recovery</p>
      </div>
    </div>"""

_ORDER_STYLE = """
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #0f4c81; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background-color: #f9f9f9; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; }
        .items td { border-bottom: 1px solid #eee; }
    """


async def send_order_admin_notification(order: dict, customer_name: str = "", customer_email: str = "") -> dict:
    """Tell the shop owner an order came in."""
    order_id = str(order.get("id") or order.get("_id") or "")
    paid = (order.get("paymentStatus") == "paid")
    status_line = (
        "<p style='color:#12703a;font-weight:bold'>Payment received — this order is PAID.</p>"
        if paid else
        "<p style='color:#b26a00;font-weight:bold'>Awaiting payment.</p>"
    )

    body = f"""
      <h2>New order #{_esc(order_id[:10])}</h2>
      {status_line}
      <p><strong>Customer:</strong> {_esc(customer_name or 'Unknown')} &lt;{_esc(customer_email)}&gt;</p>
      <p><strong>Ship to:</strong> {_esc(order.get('shippingAddress'))}</p>
      <table class="items">
        <tr style="border-bottom:2px solid #ddd">
          <th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Price</th>
        </tr>
        {_order_rows_html(order)}
      </table>
      <table style="margin-top:14px">{_order_totals_html(order)}</table>
    """
    html_content = (
        "<!DOCTYPE html><html><head><style>" + _ORDER_STYLE + "</style></head><body>"
        + _ORDER_WRAPPER.format(body=body) + "</body></html>"
    )

    subject = (
        f"{'PAID' if paid else 'New'} order #{order_id[:10]} — {_money(order.get('totalAmount'))}"
    )

    results = []
    for recipient in ORDER_NOTIFICATION_RECIPIENTS:
        results.append(await send_email(recipient, subject, html_content))
    sent = [r for r in results if r.get("status") == "success"]
    return {
        "status": "success" if sent else "error",
        "sent_to": len(sent),
        "of": len(ORDER_NOTIFICATION_RECIPIENTS),
    }


async def send_order_confirmation_email(to_email: str, order: dict, customer_name: str = "there") -> dict:
    """Confirm the order to the customer."""
    if not to_email:
        return {"status": "skipped", "message": "No customer email on the order"}

    order_id = str(order.get("id") or order.get("_id") or "")
    paid = (order.get("paymentStatus") == "paid")

    body = f"""
      <h2>Thanks{customer_name and ', ' + _esc(customer_name) or ''}!</h2>
      <p>We've received your order <strong>#{_esc(order_id[:10])}</strong>.</p>
      {'<p>Your payment has gone through and your order is confirmed.</p>'
       if paid else
       '<p>Our team will be in touch shortly to arrange payment and confirm shipping.</p>'}
      <table class="items">
        <tr style="border-bottom:2px solid #ddd">
          <th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Price</th>
        </tr>
        {_order_rows_html(order)}
      </table>
      <table style="margin-top:14px">{_order_totals_html(order)}</table>
      <p style="margin-top:20px"><strong>Shipping to:</strong><br>{_esc(order.get('shippingAddress'))}</p>
      <p style="text-align:center">
        <a href="{FRONTEND_URL}/account/orders" style="display:inline-block;padding:12px 30px;background-color:#0f4c81;color:white;text-decoration:none;border-radius:5px;margin:20px 0">View Your Order</a>
      </p>
    """
    html_content = (
        "<!DOCTYPE html><html><head><style>" + _ORDER_STYLE + "</style></head><body>"
        + _ORDER_WRAPPER.format(body=body) + "</body></html>"
    )
    subject = f"Your Active Recovery 360 order #{order_id[:10]}"
    return await send_email(to_email, subject, html_content)


# --------------------------------------------------------------------------
# Fulfilment updates
#
# Until now the customer heard from us exactly once: the payment confirmation.
# Nothing told them the order was being packed, that it had shipped, or that it
# had arrived. These three close that gap.
# --------------------------------------------------------------------------

_FULFILMENT_COPY = {
    "shipped": {
        "heading": "Your order is on its way",
        "lead": "Good news &mdash; your order has shipped.",
        "subject": "Your Active Recovery 360 order #{ref} has shipped",
    },
    "delivered": {
        "heading": "Your order was delivered",
        "lead": "Your order has been marked as delivered. We hope it helps.",
        "subject": "Your Active Recovery 360 order #{ref} was delivered",
    },
    "cancelled": {
        "heading": "Your order was cancelled",
        "lead": "Your order has been cancelled. If this is a surprise, reply to this "
                "email and we will sort it out.",
        "subject": "Your Active Recovery 360 order #{ref} was cancelled",
    },
}


async def send_order_fulfilment_email(
    to_email: str,
    order: dict,
    event: str,
    customer_name: str = "there",
) -> dict:
    """Tell the customer their order shipped, arrived, or was cancelled.

    `event` is one of: shipped, delivered, cancelled.
    """
    if not to_email:
        return {"status": "skipped", "message": "No customer email on the order"}

    copy = _FULFILMENT_COPY.get(event)
    if not copy:
        return {"status": "skipped", "message": f"Unknown fulfilment event {event!r}"}

    order_id = str(order.get("id") or order.get("_id") or "")
    ref = _esc(order_id[:10])
    tracking = (order.get("trackingNumber") or "").strip()
    carrier = (order.get("carrier") or "").strip()

    tracking_html = ""
    if tracking:
        label = f"{_esc(carrier)} tracking" if carrier else "Tracking number"
        tracking_html = (
            f'<p style="margin-top:16px;font-size:15px"><strong>{label}:</strong> '
            f'<span style="font-family:monospace">{_esc(tracking)}</span></p>'
        )

    body = f"""\
      <h2>{_esc(copy['heading'])}</h2>
      <p>Hi {_esc(customer_name)},</p>
      <p>{copy['lead']}</p>
      <p>Order <strong>#{ref}</strong></p>
      {tracking_html}
      <table class="items" style="margin-top:18px">
        <tr style="border-bottom:2px solid #ddd">
          <th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Price</th>
        </tr>
        {_order_rows_html(order)}
      </table>
      <p style="margin-top:18px"><strong>Shipping to:</strong><br>{_esc(order.get('shippingAddress'))}</p>
      <p style="text-align:center">
        <a href="{FRONTEND_URL}/account/orders" style="display:inline-block;padding:12px 30px;background-color:#0f4c81;color:white;text-decoration:none;border-radius:5px;margin:20px 0">View Your Order</a>
      </p>
    """
    html_content = (
        "<!DOCTYPE html><html><head><style>" + _ORDER_STYLE + "</style></head><body>"
        + _ORDER_WRAPPER.format(body=body) + "</body></html>"
    )
    subject = copy["subject"].format(ref=order_id[:10])
    return await send_email(to_email, subject, html_content)
