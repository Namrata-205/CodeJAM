"""Email helper used for collaboration invites.

Resend is preferred for deployed apps because it sends through an HTTPS API.
SMTP is kept as a fallback for local/private deployments.
"""
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import formataddr
import smtplib

import httpx

from app.config import (
    RESEND_API_KEY,
    RESEND_FROM_EMAIL,
    RESEND_FROM_NAME,
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
    return bool((RESEND_API_KEY and RESEND_FROM_EMAIL) or (SMTP_HOST and SMTP_FROM_EMAIL))


def send_email(to_email: str, subject: str, body: str) -> EmailResult:
    if RESEND_API_KEY and RESEND_FROM_EMAIL:
        return _send_with_resend(to_email, subject, body)

    if SMTP_HOST and SMTP_FROM_EMAIL:
        return _send_with_smtp(to_email, subject, body)

    return EmailResult(
        sent=False,
        error="Email is not configured. Add RESEND_API_KEY + RESEND_FROM_EMAIL, or SMTP settings.",
    )


def _send_with_resend(to_email: str, subject: str, body: str) -> EmailResult:
    try:
        response = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": formataddr((RESEND_FROM_NAME, RESEND_FROM_EMAIL)),
                "to": [to_email],
                "subject": subject,
                "text": body,
            },
            timeout=15,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        return EmailResult(
            sent=False,
            error=f"Resend API error {exc.response.status_code}: {exc.response.text}",
        )
    except Exception as exc:
        return EmailResult(sent=False, error=f"Resend API error: {exc}")

    return EmailResult(sent=True)


def _send_with_smtp(to_email: str, subject: str, body: str) -> EmailResult:
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
        return EmailResult(sent=False, error=f"SMTP error: {exc}")

    return EmailResult(sent=True)
