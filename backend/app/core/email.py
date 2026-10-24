import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

def render_otp_email_html(recipient_name: str, otp_code: str) -> str:
    """Renders a modern, branded King Khalid University / SmartCV email template."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SmartCV Verification Code</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
    }}
    .email-container {{
      max-width: 580px;
      margin: 30px auto;
      background: #ffffff;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
      border: 1px solid #e2e8f0;
    }}
    .header {{
      background: linear-gradient(135deg, #059669 0%, #047857 50%, #0f766e 100%);
      padding: 34px 28px;
      text-align: center;
      color: #ffffff;
    }}
    .brand-title {{
      margin: 0;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }}
    .brand-sub {{
      margin: 6px 0 0;
      font-size: 13px;
      color: #a7f3d0;
      font-weight: 500;
    }}
    .body-content {{
      padding: 36px 32px 28px;
      line-height: 1.6;
    }}
    .greeting {{
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 14px;
    }}
    .intro-text {{
      font-size: 14px;
      color: #475569;
      margin: 0 0 24px;
    }}
    .otp-wrapper {{
      background: #f8fafc;
      border: 2px dashed #cbd5e1;
      border-radius: 14px;
      padding: 24px 20px;
      text-align: center;
      margin: 28px 0;
    }}
    .otp-label {{
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 8px;
    }}
    .otp-digits {{
      font-family: 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 10px;
      color: #047857;
      margin: 4px 0;
      user-select: all;
    }}
    .otp-expiry {{
      font-size: 12px;
      color: #dc2626;
      font-weight: 600;
      margin-top: 8px;
    }}
    .security-notice {{
      background: #f0fdf4;
      border-left: 4px solid #10b981;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 12px;
      color: #065f46;
      margin: 24px 0 10px;
    }}
    .footer {{
      background: #f8fafc;
      padding: 20px 32px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
    }}
    .footer a {{
      color: #059669;
      text-decoration: none;
    }}
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1 class="brand-title">SmartCV</h1>
      <p class="brand-sub">King Khalid University • College of Computer Science</p>
    </div>
    
    <div class="body-content">
      <p class="greeting">Hello {recipient_name},</p>
      <p class="intro-text">
        Thank you for creating an account on <strong>SmartCV</strong>. To verify your email address and activate your account, please enter the one-time verification code below:
      </p>
      
      <div class="otp-wrapper">
        <div class="otp-label">Your Verification Code</div>
        <div class="otp-digits">{otp_code}</div>
        <div class="otp-expiry">Valid for 10 minutes</div>
      </div>
      
      <div class="security-notice">
        <strong>Security Notice:</strong> If you did not initiate this registration, please disregard this email. Never share your verification code with anyone.
      </div>
    </div>
    
    <div class="footer">
      <p style="margin: 0 0 6px;">Sent by <strong>SmartCV System</strong> • smartcv2027@gmail.com</p>
      <p style="margin: 0;">Explainable AI Recruitment & Resume Screening Portal</p>
    </div>
  </div>
</body>
</html>"""


def send_otp_email(recipient_email: str, recipient_name: str, otp_code: str) -> bool:
    """
    Sends the 6-digit OTP code to the recipient using Gmail SMTP (smartcv2027@gmail.com).
    Falls back gracefully if SMTP password is not set or network fails in dev environment.
    """
    subject = f"SmartCV — Verification Code: {otp_code}"
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = recipient_email

    # Plain text fallback
    plain_text = (
        f"Hello {recipient_name},\n\n"
        f"Your SmartCV registration verification code is: {otp_code}\n\n"
        f"This code will expire in 10 minutes.\n"
        f"If you did not request this code, please ignore this email.\n\n"
        f"— SmartCV Team (King Khalid University)"
    )
    
    html_content = render_otp_email_html(recipient_name, otp_code)
    
    msg.attach(MIMEText(plain_text, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    # If no SMTP password provided, log clearly to console for local testing
    if not settings.SMTP_PASSWORD or settings.SMTP_PASSWORD.strip() == "":
        print(f"\n[EMAIL SIMULATION] SMTP_PASSWORD not set in .env. Falling back to Console Dispatch:")
        print(f"  To: {recipient_email} ({recipient_name})")
        print(f"  Subject: {subject}")
        print(f"  >>> OTP CODE: {otp_code} <<< (Expires in 10 mins)\n")
        return True

    try:
        if settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            server.starttls()
            
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM_EMAIL, [recipient_email], msg.as_string())
        server.quit()
        print(f"[EMAIL SUCCESS] Dispatched OTP code to {recipient_email} via {settings.SMTP_USER}.")
        return True
    except Exception as exc:
        print(f"[EMAIL WARNING] Could not send email via Gmail SMTP ({exc}).")
        print(f"  >>> Fallback OTP for {recipient_email}: {otp_code} <<<\n")
        return False

