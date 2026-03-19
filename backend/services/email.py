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
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://ar360-shop.preview.emergentagent.com")

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

async def send_hcp_approval_email(to_email: str, user_name: str, approved: bool) -> dict:
    """Send HCP application status email"""
    if approved:
        subject = "Your Healthcare Professional Account Has Been Approved!"
        status_message = """
            <h2 style="color: #28a745;">Congratulations!</h2>
            <p>Your Healthcare Professional account has been approved. You now have full access to:</p>
            <ul>
                <li>Professional-grade products</li>
                <li>Exclusive healthcare provider pricing</li>
                <li>Your personalized storefront</li>
            </ul>
            <p style="text-align: center;">
                <a href="{FRONTEND_URL}/shop" class="button">Start Shopping</a>
            </p>
        """
    else:
        subject = "Update on Your Healthcare Professional Application"
        status_message = """
            <h2>Application Update</h2>
            <p>Thank you for your interest in becoming a Healthcare Professional member.</p>
            <p>After reviewing your application, we were unable to verify your credentials at this time. 
            This could be due to:</p>
            <ul>
                <li>Invalid or expired license number</li>
                <li>Incomplete information</li>
                <li>Unable to verify professional status</li>
            </ul>
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
