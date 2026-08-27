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
