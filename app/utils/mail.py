import os
import smtplib
from email.message import EmailMessage
from typing import Optional

from app.config import FROM_EMAIL, SMTP_HOST, SMTP_PORT, SMTP_PASS, SMTP_USER


def is_smtp_configured() -> bool:
    return all([SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL])


def send_mail_delta(to_email: str, subject: str, body: str) -> None:
    """Attempt to send email via configured SMTP server. Throws exception on failure."""
    if not is_smtp_configured():
        raise RuntimeError("SMTP is not fully configured")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = FROM_EMAIL
    msg["To"] = to_email
    msg.set_content(body)

    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
    try:
        server.starttls()  # secure connection
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
    finally:
        server.quit()
