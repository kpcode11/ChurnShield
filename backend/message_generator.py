"""
Module 6 — AI Message Generator + Twilio WhatsApp Dispatch

LLM Priority chain:
  1. Ollama  (Llama 3.2 via http://localhost:11434)   — local, free, private
  2. Claude  (Anthropic API via ANTHROPIC_API_KEY env) — cloud fallback
  3. Template (built-in rule-based)                   — always available

WhatsApp dispatch:
  Uses Twilio Messaging API. Requires three env vars:
    TWILIO_ACCOUNT_SID
    TWILIO_AUTH_TOKEN
    TWILIO_WHATSAPP_FROM  (default: +14155238886  — Twilio sandbox number)

Environment variables (all optional — feature degrades gracefully):
  OLLAMA_BASE_URL     http://localhost:11434  (override if Ollama runs elsewhere)
  OLLAMA_MODEL        llama3.2               (any Ollama model name)
  ANTHROPIC_API_KEY   sk-ant-...             (enables Claude fallback)
  TWILIO_ACCOUNT_SID  AC...
  TWILIO_AUTH_TOKEN   ...
  TWILIO_WHATSAPP_FROM +14155238886
"""

from __future__ import annotations
import os
import logging

log = logging.getLogger(__name__)

# ── Config from environment ─────────────────────────────────────────
_OLLAMA_BASE_URL    = os.environ.get("OLLAMA_BASE_URL",     "http://localhost:11434")
_OLLAMA_MODEL       = os.environ.get("OLLAMA_MODEL",         "llama3.2")
_ANTHROPIC_API_KEY  = os.environ.get("ANTHROPIC_API_KEY",    "")
_TWILIO_SID         = os.environ.get("TWILIO_ACCOUNT_SID",   "")
_TWILIO_TOKEN       = os.environ.get("TWILIO_AUTH_TOKEN",    "")
_TWILIO_FROM        = os.environ.get("TWILIO_WHATSAPP_FROM", "+14155238886")


# ────────────────────────────────────────────────────────────────
# Prompt builder
# ────────────────────────────────────────────────────────────────

def _build_prompt(
    customer_segment: str,
    suggestion: str,
    tone: str = "warm, concise",
    channel: str = "WhatsApp",
    churn_signals: list[dict] | None = None,
) -> str:
    """
    Build a rich LLM prompt that includes the customer's churn signal context
    so the generated message feels genuinely personalised.
    """
    signals_txt = ""
    if churn_signals:
        top = churn_signals[:3]
        lines = [f"  - {s['label']}: {s['reason']}" for s in top]
        signals_txt = "\nCustomer churn signals (top 3):\n" + "\n".join(lines)

    return (
        f"You are a customer retention specialist writing a short {channel} message.\n"
        f"Customer segment: {customer_segment}\n"
        f"Retention offer: {suggestion}{signals_txt}\n"
        f"Tone: {tone}\n\n"
        f"Requirements:\n"
        f"- Under 80 words\n"
        f"- Include a warm greeting, the specific offer, and a clear call to action\n"
        f"- Use simple, conversational English suitable for Indian e-commerce customers\n"
        f"- Keep the message concise and friendly\n"
        f"- Do NOT include placeholders like [name] or [link]; write a ready-to-send message\n\n"
        f"Write only the message text, nothing else."
    )


# ────────────────────────────────────────────────────────────────
# LLM backends
# ────────────────────────────────────────────────────────────────

def _generate_with_ollama(prompt: str) -> str:
    """
    Call the local Ollama HTTP API (Llama 3.2).

    Ollama must be running:  ollama serve
    Model must be pulled:    ollama pull llama3.2

    Uses /api/chat with stream=false for a single synchronous response.
    Raises RuntimeError if Ollama is unreachable or returns an error.
    """
    import requests  # stdlib-adjacent; always available in the project venv

    url = f"{_OLLAMA_BASE_URL.rstrip('/')}/api/chat"
    payload = {
        "model":  _OLLAMA_MODEL,
        "stream": False,
        "messages": [{"role": "user", "content": prompt}],
        "options": {
            "temperature": 0.75,
            "top_p":       0.9,
            "num_predict": 200,   # max tokens in reply
        },
    }
    try:
        resp = requests.post(url, json=payload, timeout=60)
        resp.raise_for_status()
    except requests.exceptions.ConnectionError as exc:
        raise RuntimeError(
            f"Ollama not reachable at {_OLLAMA_BASE_URL}. "
            "Run `ollama serve` and `ollama pull llama3.2`."
        ) from exc
    except requests.exceptions.HTTPError as exc:
        raise RuntimeError(f"Ollama API error {resp.status_code}: {resp.text}") from exc

    data = resp.json()
    # /api/chat response: {"message": {"role": "assistant", "content": "..."}}
    content = (
        data.get("message", {}).get("content")
        or data.get("response")   # /api/generate fallback shape
        or ""
    ).strip()
    if not content:
        raise RuntimeError(f"Ollama returned empty content. Raw response: {data}")
    return content


def _generate_with_claude(prompt: str) -> str:
    """
    Call Anthropic Claude API.
    Requires ANTHROPIC_API_KEY environment variable.
    """
    import anthropic
    client  = anthropic.Anthropic(api_key=_ANTHROPIC_API_KEY)
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=256,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text.strip()


def _generate_template(customer_segment: str, suggestion: str) -> str:
    """Rule-based template fallback — requires no external services."""
    templates = {
        "inactive": (
            "Hi there! We noticed you haven't shopped with us in a while. "
            "We'd love to have you back! {suggestion} "
            "Shop now and enjoy the savings"
        ),
        "complaint": (
            "Hi! We're truly sorry about your recent experience. "
            "Your satisfaction means everything to us. {suggestion} "
            "Reply here to connect with our team — we'll make it right."
        ),
        "low_satisfaction": (
            "Hello! We value your feedback and want to do better for you. "
            "{suggestion} Give us another chance — we promise a better experience!"
        ),
        "new_customer": (
            "Welcome to the family! "
            "We're thrilled to have you on board. {suggestion} "
            "Explore our top picks and make your next order even better!"
        ),
        "default": (
            "Hi! We have something special just for you. "
            "{suggestion} Don't miss out — this offer is exclusively for you!"
        ),
    }
    seg = customer_segment.lower()
    if any(w in seg for w in ("inactive", "miss", "no order", "dormant")):
        key = "inactive"
    elif any(w in seg for w in ("complaint", "complain")):
        key = "complaint"
    elif any(w in seg for w in ("satisfaction", "low")):
        key = "low_satisfaction"
    elif any(w in seg for w in ("new", "onboarding")):
        key = "new_customer"
    else:
        key = "default"
    return templates[key].format(suggestion=suggestion)


# ────────────────────────────────────────────────────────────────
# Twilio WhatsApp dispatch
# ────────────────────────────────────────────────────────────────

def send_whatsapp(
    to_number: str,
    message_text: str,
) -> dict:
    """
    Send a WhatsApp message via Twilio.

    Parameters
    ----------
    to_number   : str  E.164 format, e.g. '+919876543210'
    message_text: str  The message body (80 words max recommended)

    Returns
    -------
    {
      success  : bool
      sid      : str   Twilio message SID (if successful)
      status   : str   Twilio message status string
      error    : str   Error description (if failed)
    }

    Environment variables required:
      TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
    Optional:
      TWILIO_WHATSAPP_FROM  (defaults to Twilio sandbox +14155238886)

    Sandbox setup (one-time):
      1. Go to https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
      2. Send 'join <your-sandbox-keyword>' from the customer's WhatsApp
      3. Set TWILIO_WHATSAPP_FROM to the sandbox number shown in console
    """
    if not _TWILIO_SID or not _TWILIO_TOKEN:
        return {
            "success": False,
            "sid":     None,
            "status":  "skipped",
            "error":   (
                "Twilio credentials not configured. "
                "Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables."
            ),
        }

    try:
        from twilio.rest import Client  # noqa: PLC0415
        client  = Client(_TWILIO_SID, _TWILIO_TOKEN)
        msg     = client.messages.create(
            from_=f"whatsapp:{_TWILIO_FROM}",
            body=message_text,
            to=f"whatsapp:{to_number}",
        )
        log.info("WhatsApp sent via Twilio: SID=%s status=%s", msg.sid, msg.status)
        return {
            "success": True,
            "sid":     msg.sid,
            "status":  msg.status,
            "error":   None,
        }
    except Exception as exc:  # noqa: BLE001
        log.error("Twilio send failed: %s", exc)
        return {
            "success": False,
            "sid":     None,
            "status":  "failed",
            "error":   str(exc),
        }


# ────────────────────────────────────────────────────────────────
# Public API
# ────────────────────────────────────────────────────────────────

def generate_message(
    customer_segment: str,
    suggestion: str,
    tone: str = "warm, concise",
    channel: str = "WhatsApp",
    churn_signals: list[dict] | None = None,
) -> dict:
    """
    Generate a personalised retention message.

    Priority chain: Ollama (Llama 3.2) → Claude → Template

    Returns
    -------
    {
      message : str
      source  : 'ollama' | 'claude' | 'template'
    }
    """
    prompt = _build_prompt(customer_segment, suggestion, tone, channel, churn_signals)

    # 1. Try Ollama (local Llama 3.2)
    try:
        text = _generate_with_ollama(prompt)
        return {"message": text, "source": "ollama"}
    except Exception as exc:
        log.warning("Ollama unavailable (%s). Trying Claude...", exc)

    # 2. Try Claude if key is set
    if _ANTHROPIC_API_KEY:
        try:
            text = _generate_with_claude(prompt)
            return {"message": text, "source": "claude"}
        except Exception as exc:
            log.warning("Claude API error (%s). Falling back to template.", exc)

    # 3. Template fallback — always works
    text = _generate_template(customer_segment, suggestion)
    return {"message": text, "source": "template"}


def generate_and_send(
    customer_segment: str,
    suggestion: str,
    to_number: str,
    tone: str = "warm, concise",
    channel: str = "WhatsApp",
    churn_signals: list[dict] | None = None,
) -> dict:
    """
    Generate a retention message and immediately dispatch it via Twilio WhatsApp.

    Parameters
    ----------
    customer_segment  str   e.g. 'at-risk', 'inactive', 'complaint'
    suggestion        str   retention offer text
    to_number         str   recipient E.164 phone number, e.g. '+919876543210'
    tone              str   tone instruction passed to the LLM
    channel           str   channel label sent to the LLM prompt
    churn_signals     list  optional ranked signal list from suggestions.map_churn_reasons()

    Returns
    -------
    {
      message  : str   — the generated message text
      source   : str   — 'ollama' | 'claude' | 'template'
      delivery : {
        success : bool
        sid     : str | None   — Twilio SID
        status  : str          — Twilio status string
        error   : str | None
      }
    }
    """
    gen     = generate_message(customer_segment, suggestion, tone, channel, churn_signals)
    delivery = send_whatsapp(to_number, gen["message"])
    return {
        "message":  gen["message"],
        "source":   gen["source"],
        "delivery": delivery,
    }
