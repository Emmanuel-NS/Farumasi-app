from __future__ import annotations

ORDER_STATUS_MESSAGES = {
    "en": {
        "title": "Order Update",
        "body": "Your order #{code} status has changed to: {status}.",
    },
    "rw": {
        "title": "Amakuru y'itegeko",
        "body": "Imiterere y'itegeko ryawe #{code} yahindutse: {status}.",
    },
    "fr": {
        "title": "Mise à jour de commande",
        "body": "Le statut de votre commande #{code} est passé à : {status}.",
    },
    "sw": {
        "title": "Taarifa ya agizo",
        "body": "Hali ya agizo lako #{code} imebadilika kuwa: {status}.",
    },
}


def localized_order_status(lang: str | None, *, code: str, status: str) -> tuple[str, str]:
    pack = ORDER_STATUS_MESSAGES.get(lang or "en") or ORDER_STATUS_MESSAGES["en"]
    return pack["title"], pack["body"].format(code=code, status=status)
