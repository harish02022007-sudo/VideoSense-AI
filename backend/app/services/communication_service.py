import os
import re
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from dotenv import load_dotenv

from app.core.logging import get_logger

logger = get_logger("communication")

# Explicitly search for and load .env or .env.example
env_file = Path(__file__).resolve().parents[3] / ".env"
if not env_file.exists():
    env_file = Path(__file__).resolve().parents[3] / ".env.example"
if env_file.exists():
    load_dotenv(dotenv_path=env_file)
else:
    load_dotenv()


def get_smtp_config():
    """Retrieve up-to-date SMTP settings from environment."""
    host = os.getenv("SMTP_HOST", "").strip()
    port = int(os.getenv("SMTP_PORT", "587").strip())
    username = os.getenv("SMTP_USERNAME", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()
    tls = os.getenv("SMTP_TLS", "true").strip().lower() in ("true", "1", "yes")

    raw_sender = os.getenv("SMTP_SENDER", "").strip()
    sender_match = re.search(r"<([^>]+)>", raw_sender)
    if sender_match:
        sender_email = sender_match.group(1).strip()
    elif "@" in raw_sender:
        sender_email = raw_sender.strip('"').strip("'")
    else:
        sender_email = username

    # If using Gmail SMTP, envelope sender must match the authenticated username
    if "gmail.com" in host.lower():
        envelope_from = username
    else:
        envelope_from = sender_email

    return {
        "host": host,
        "port": port,
        "username": username,
        "password": password,
        "tls": tls,
        "sender_email": sender_email,
        "envelope_from": envelope_from,
    }


def is_email_configured() -> bool:
    """Returns True if SMTP host and credentials are configured."""
    cfg = get_smtp_config()
    return bool(cfg["host"] and cfg["username"] and cfg["password"])


def send_email_otp(
    recipient_email: str,
    otp_code: str,
    purpose: str = "email_verification",
    recipient_name: str = "User",
) -> bool:
    """
    Sends a cryptographically secure 6-digit OTP code via real SMTP server.
    Returns True if successfully dispatched, False otherwise.
    """
    cfg = get_smtp_config()
    if not is_email_configured():
        logger.warning(
            f"SMTP email service is not configured. Please set SMTP_HOST, SMTP_USERNAME, "
            f"and SMTP_PASSWORD in .env. Skipping delivery to {recipient_email}."
        )
        return False

    subject_map = {
        "email_verification": "Verify Your VideoSense AI Account",
        "password_reset": "VideoSense AI Security: Password Reset Code",
    }
    subject = subject_map.get(purpose, "VideoSense AI One-Time Verification Code")

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050811; color: #e2e8f0; margin: 0; padding: 20px; }}
    .card {{ max-width: 520px; margin: 30px auto; background-color: #0c1222; border: 1px solid #1e293b; border-radius: 16px; padding: 36px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }}
    .header {{ text-align: center; margin-bottom: 24px; }}
    .logo-text {{ font-size: 22px; font-weight: 800; color: #38bdf8; letter-spacing: -0.5px; }}
    .subtitle {{ font-size: 13px; color: #94a3b8; margin-top: 4px; }}
    .otp-box {{ background-color: #060b17; border: 1px solid #0284c7; border-radius: 12px; padding: 18px; text-align: center; margin: 28px 0; }}
    .otp-code {{ font-size: 32px; font-weight: 800; font-family: monospace; letter-spacing: 8px; color: #38bdf8; }}
    .notice {{ font-size: 12px; color: #64748b; line-height: 1.6; text-align: center; }}
    .footer {{ font-size: 11px; color: #475569; text-align: center; margin-top: 32px; border-top: 1px solid #1e293b; padding-top: 16px; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo-text">VIDEOSENSE AI</div>
      <div class="subtitle">Intelligent Multimodal Video Intelligence Platform</div>
    </div>
    <p style="font-size: 14px; color: #cbd5e1;">Hello <strong>{recipient_name}</strong>,</p>
    <p style="font-size: 14px; color: #94a3b8; line-height: 1.5;">
      Use the one-time verification code below to authorize your account. This code is confidential and valid for <strong>10 minutes</strong>.
    </p>
    <div class="otp-box">
      <div class="otp-code">{otp_code}</div>
    </div>
    <div class="notice">
      If you did not request this verification code, please ignore this email. Never share this code with anyone. VideoSense AI staff will never ask for your code.
    </div>
    <div class="footer">
      &copy; 2026 VideoSense AI Platform. All rights reserved.
    </div>
  </div>
</body>
</html>"""

    plain_content = f"""VideoSense AI - Account Verification
-----------------------------------
Hello {recipient_name},

Your one-time verification code is: {otp_code}

This code expires in 10 minutes. If you did not request this code, please disregard this message.

(c) 2026 VideoSense AI Platform.
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"VideoSense AI <{cfg['envelope_from']}>"
    msg["To"] = recipient_email

    msg.attach(MIMEText(plain_content, "plain"))
    msg.attach(MIMEText(html_content, "html"))

    try:
        if cfg["port"] == 465:
            server = smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=15)
        else:
            server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=15)
            if cfg["tls"]:
                server.starttls()

        server.login(cfg["username"], cfg["password"])
        server.sendmail(cfg["envelope_from"], [recipient_email], msg.as_string())
        server.quit()
        logger.info(f"Verification email successfully dispatched to {recipient_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to dispatch verification email to {recipient_email}: {str(e)}")
        return False
