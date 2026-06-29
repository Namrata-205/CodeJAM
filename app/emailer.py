"""Small SMTP email helper used for collaboration invites."""
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import formataddr
import smtplib

from app.config import (
    SMTP_FROM_EMAIL,
    SMTP_FROM_NAME,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_STARTTLS,
    SMTP_USERNAME,
)


@dataclass(frozen=True)
class EmailResult:
    sent: bool
    error: str | None = None


def is_email_configured() -> bool:
    return bool(SMTP_HOST and SMTP_FROM_EMAIL)


def send_email(to_email: str, subject: str, body: str) -> EmailResult:
    if not is_email_configured():
        return EmailResult(sent=False, error="SMTP is not configured.")

    message = EmailMessage()
    message["From"] = formataddr((SMTP_FROM_NAME, SMTP_FROM_EMAIL))
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
            if SMTP_STARTTLS:
                smtp.starttls()
            if SMTP_USERNAME and SMTP_PASSWORD:
                smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
            smtp.send_message(message)
    except Exception as exc:
        return EmailResult(sent=False, error=str(exc))

    return EmailResult(sent=True)
