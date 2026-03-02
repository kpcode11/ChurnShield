"""
Module 6 — AI Message Generator
Builds prompts and calls an LLM (Claude API) to generate
personalised retention messages for at-risk customers.

Falls back to a template-based generator if no API key is set.
"""

import os

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")


def _build_prompt(customer_segment: str, suggestion: str, tone: str = "warm, concise") -> str:
    """Build the LLM prompt from segment info and retention suggestion."""
    return (
        f"Generate a friendly WhatsApp retention message for an e-commerce customer.\n"
        f"Customer segment: {customer_segment}\n"
        f"Retention offer: {suggestion}\n"
        f"Tone: {tone}\n"
        f"Keep it under 80 words. Include a greeting, the offer, and a call to action. "
        f"Use simple English suitable for Indian customers. Add one relevant emoji."
    )


def _generate_with_claude(prompt: str) -> str:
    """Call Anthropic Claude API."""
    import anthropic

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=256,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text.strip()


def _generate_template(customer_segment: str, suggestion: str) -> str:
    """Fallback template-based message generation (no API key needed)."""
    templates = {
        "inactive": (
            "Hi there! 👋 We noticed you haven't shopped with us in a while. "
            "We'd love to have you back! {suggestion} "
            "Shop now and enjoy the savings. Tap here to browse → [link]"
        ),
        "complaint": (
            "Hi! We're truly sorry about your recent experience. 🙏 "
            "Your satisfaction means everything to us. {suggestion} "
            "We'd love a chance to make it right. Reply to connect with our team."
        ),
        "low_satisfaction": (
            "Hello! We value your feedback and want to do better. "
            "{suggestion} 💛 "
            "Give us another chance — we promise a better experience. Shop now → [link]"
        ),
        "new_customer": (
            "Welcome to the family! 🎉 "
            "We're thrilled to have you on board. {suggestion} "
            "Explore our top picks and make your next order even better → [link]"
        ),
        "default": (
            "Hi! 😊 We have something special just for you. "
            "{suggestion} "
            "Don't miss out — this offer is just for you! Shop now → [link]"
        ),
    }

    # Pick best template based on segment keywords
    segment_lower = customer_segment.lower()
    if "inactive" in segment_lower or "miss" in segment_lower or "no order" in segment_lower:
        key = "inactive"
    elif "complaint" in segment_lower or "complain" in segment_lower:
        key = "complaint"
    elif "satisfaction" in segment_lower or "low" in segment_lower:
        key = "low_satisfaction"
    elif "new" in segment_lower or "onboarding" in segment_lower:
        key = "new_customer"
    else:
        key = "default"

    return templates[key].format(suggestion=suggestion)


def generate_message(customer_segment: str, suggestion: str, tone: str = "warm, concise") -> dict:
    """
    Generate a personalised retention message.
    Uses Claude API if ANTHROPIC_API_KEY is set, otherwise falls back to templates.

    Returns: { message: str, source: 'ai' | 'template' }
    """
    if ANTHROPIC_API_KEY:
        try:
            prompt = _build_prompt(customer_segment, suggestion, tone)
            msg = _generate_with_claude(prompt)
            return {"message": msg, "source": "ai"}
        except Exception as e:
            # Fall back to template on API errors
            print(f"Claude API error: {e}. Falling back to template.")

    msg = _generate_template(customer_segment, suggestion)
    return {"message": msg, "source": "template"}
