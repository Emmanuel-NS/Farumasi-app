#!/usr/bin/env python3
"""Provision MTN MoMo sandbox API User + API Key from your Primary subscription key.

Usage (from farumasi_api/):
  python scripts/provision_mtn_momo.py
  python scripts/provision_mtn_momo.py --verify-only
  python scripts/provision_mtn_momo.py --callback-host api.farumasi.com

Requires in .env:
  MTN_MOMO_PRIMARY_KEY=<Primary Key from momodeveloper.mtn.com profile>

Writes (gitignored):
  scripts/output/mtn_momo_credentials.env
  scripts/output/mtn_momo_credentials.json

Copy the generated values into farumasi_api/.env and Render env vars.
"""
from __future__ import annotations

import argparse
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings

SANDBOX_PROVISION_BASE = "https://sandbox.momodeveloper.mtn.com"
PRODUCTION_COLLECTION_BASE = "https://proxy.momoapi.mtn.com"

OUTPUT_DIR = Path(__file__).resolve().parent / "output"

SUBSCRIPTION_KEY_HELP = """
HTTP 401 — MTN rejected the subscription key. Common fixes:

1. Subscribe to the COLLECTION product (not Disbursement / Remittance):
   https://momodeveloper.mtn.com → Products → Collection → Subscribe

2. Copy the key from YOUR subscription (Profile → Subscriptions → Collection):
   use Primary Key, or Secondary Key if Primary fails.

3. Sandbox keys only work on sandbox.momodeveloper.mtn.com
   (not production / partner portal keys).

4. Regenerate the key on the portal if it was rotated, then update .env.

5. No quotes around the key in .env:
   MTN_MOMO_PRIMARY_KEY=abc123   ✓
   MTN_MOMO_PRIMARY_KEY="abc123" ✗ (we strip quotes, but avoid them)

Set MTN_MOMO_SECONDARY_KEY in .env — the script tries Primary then Secondary.
Or pass:  python scripts/provision_mtn_momo.py --subscription-key YOUR_KEY
"""


def _subscription_key_candidates(cli_key: str | None = None) -> list[tuple[str, str]]:
    """Ordered (label, key) pairs to try."""
    if cli_key:
        k = cli_key.strip().strip('"').strip("'")
        return [("cli", k)] if k else []

    seen: set[str] = set()
    out: list[tuple[str, str]] = []
    for label, raw in (
        ("primary", settings.MTN_MOMO_PRIMARY_KEY),
        ("secondary", settings.MTN_MOMO_SECONDARY_KEY),
        ("subscription", settings.MTN_MOMO_SUBSCRIPTION_KEY),
    ):
        key = (raw or "").strip()
        if key and key not in seen:
            seen.add(key)
            out.append((label, key))
    return out


def _mask_key(key: str) -> str:
    if len(key) <= 12:
        return "****"
    return f"{key[:8]}…{key[-4:]}"


def _callback_host(explicit: str | None) -> str:
    if explicit:
        return explicit.strip().removeprefix("https://").removeprefix("http://").split("/")[0]
    if settings.MTN_MOMO_CALLBACK_URL:
        parsed = urlparse(settings.MTN_MOMO_CALLBACK_URL)
        if parsed.hostname:
            return parsed.hostname
    parsed = urlparse(settings.API_PUBLIC_URL)
    host = parsed.hostname or "webhook.site"
    if host in ("localhost", "127.0.0.1"):
        return "webhook.site"
    return host


def _collection_base() -> str:
    env = (settings.MTN_MOMO_ENV or "sandbox").lower()
    return PRODUCTION_COLLECTION_BASE if env == "production" else SANDBOX_PROVISION_BASE


def _target_environment() -> str:
    explicit = (settings.MTN_MOMO_TARGET_ENVIRONMENT or "").strip()
    if explicit:
        return explicit
    return "mtnrwanda" if (settings.MTN_MOMO_ENV or "").lower() == "production" else "sandbox"


class MomoProvisionError(Exception):
    def __init__(self, message: str, *, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


def create_api_user(client: httpx.Client, subscription_key: str, api_user: str, callback_host: str) -> None:
    url = f"{SANDBOX_PROVISION_BASE}/v1_0/apiuser"
    headers = {
        "X-Reference-Id": api_user,
        "Ocp-Apim-Subscription-Key": subscription_key,
        "Content-Type": "application/json",
    }
    body = {"providerCallbackHost": callback_host}
    resp = client.post(url, json=body, headers=headers)
    if resp.status_code == 201:
        return
    if resp.status_code == 409:
        raise MomoProvisionError(
            f"API user {api_user} already exists (409). Re-run without --api-user to generate a new UUID.",
            status_code=409,
        )
    raise MomoProvisionError(
        f"Create API user failed: HTTP {resp.status_code} — {resp.text[:500]}",
        status_code=resp.status_code,
    )


def create_api_key(client: httpx.Client, subscription_key: str, api_user: str) -> str:
    url = f"{SANDBOX_PROVISION_BASE}/v1_0/apiuser/{api_user}/apikey"
    headers = {
        "Ocp-Apim-Subscription-Key": subscription_key,
        "Content-Type": "application/json",
    }
    resp = client.post(url, headers=headers)
    if resp.status_code != 201:
        raise MomoProvisionError(
            f"Create API key failed: HTTP {resp.status_code} — {resp.text[:500]}",
            status_code=resp.status_code,
        )
    data = resp.json()
    api_key = (data.get("apiKey") or "").strip()
    if not api_key:
        raise MomoProvisionError(f"Create API key returned no apiKey: {resp.text[:500]}")
    return api_key


def verify_access_token(client: httpx.Client, subscription_key: str, api_user: str, api_key: str) -> str:
    url = f"{_collection_base()}/collection/token/"
    resp = client.post(
        url,
        auth=(api_user, api_key),
        headers={"Ocp-Apim-Subscription-Key": subscription_key},
    )
    if resp.status_code != 200:
        raise MomoProvisionError(
            f"Token request failed: HTTP {resp.status_code} — {resp.text[:500]}",
            status_code=resp.status_code,
        )
    token = (resp.json().get("access_token") or "").strip()
    if not token:
        raise MomoProvisionError("Token response missing access_token")
    return token


def probe_subscription_key(client: httpx.Client, subscription_key: str) -> dict:
    """Classify a key against sandbox vs production hosts."""
    fake_user = str(uuid.uuid4())
    out: dict = {"sandbox": None, "production": None}
    for env_name, base in (("sandbox", SANDBOX_PROVISION_BASE), ("production", PRODUCTION_COLLECTION_BASE)):
        try:
            resp = client.get(
                f"{base}/v1_0/apiuser/{fake_user}",
                headers={"Ocp-Apim-Subscription-Key": subscription_key},
            )
            out[env_name] = resp.status_code
        except httpx.HTTPError as exc:
            out[env_name] = f"error:{exc}"
    return out


def run_diagnose(candidates: list[tuple[str, str]]) -> None:
    print("MTN MoMo subscription key diagnosis\n")
    print("Portal: https://momodeveloper.mtn.com (sandbox)\n")
    print("If keys are from momodeveloper but sandbox returns 401, the usual cause is")
    print("subscribing to the WRONG product. You need **Collections**, not Collection Widget.\n")
    print("Products on momodeveloper.mtn.com/products:")
    print("  [OK]  Collections        - Enable remote collection (RequestToPay) <- YOU NEED THIS")
    print("  [NO]  Collection Widget  - Front-end checkout widget only (different keys)")
    print("  [NO]  Disbursements      - Payouts (different keys)")
    print("  [NO]  Remittances        - Cross-border (different keys)\n")
    print("Where to copy keys:")
    print("  https://momodeveloper.mtn.com/developer")
    print("  -> Your Subscriptions -> **Collections** row -> Show -> Primary Key")
    print("  (NOT keys from Collection Widget row; NOT a generic profile header.)\n")
    print("Also required on many accounts (fixes 401 even with Collections subscribed):")
    print("  Same page -> **Your Applications** -> Register application (name: FARUMASI)\n")
    print("Portal self-test (best proof):")
    print("  Products -> Collections -> Sandbox User Provisioning -> POST /v1_0/apiuser -> Try it")
    print("  Paste Primary Key in Ocp-Apim-Subscription-Key. If Try it returns 401, keys are wrong on MTN side.\n")

    any_sandbox_ok = False
    with httpx.Client(timeout=30.0) as client:
        for label, key in candidates:
            print(f"--- {label} key {_mask_key(key)} ---")
            result = probe_subscription_key(client, key)
            sandbox = result["sandbox"]
            production = result["production"]
            print(f"  sandbox.momodeveloper.mtn.com  -> HTTP {sandbox}")
            print(f"  proxy.momoapi.mtn.com        -> HTTP {production}")

            if sandbox == 404:
                print("  OK: Valid SANDBOX Collection subscription key.")
                any_sandbox_ok = True
            elif sandbox == 401:
                print("  FAIL: Not a valid SANDBOX key for Collections provisioning (401).")
                print("    -> Confirm **Collections** (not Collection Widget) is in Your Subscriptions")
                print("    -> Open that row and copy Primary Key again (Regenerate if unsure)")
                print("    -> Portal test: Products -> Collections -> Provisioning API -> POST /apiuser -> Try it")
            else:
                print(f"  ? Unexpected sandbox response ({sandbox}).")

            if sandbox == 401 and production == 404:
                print("  (401 + production 404 can also mean production keys — ignore if you use momodeveloper.)")

            print()

    if any_sandbox_ok:
        print("At least one key works on sandbox — run without --diagnose to provision.")
    else:
        print("No sandbox-valid Collections keys found.")
        print("If Collections is active and keys still 401:")
        print("  1. Register application under Your Applications")
        print("  2. Regenerate Primary Key on the Collections subscription row")
        print("  3. Wait 5-10 min if you just subscribed")
        print("  4. Contact MTN MoMo support if portal Try it also returns 401")
    sys.exit(0 if any_sandbox_ok else 1)


def provision_with_key(
    client: httpx.Client,
    subscription_key: str,
    api_user: str,
    callback_host: str,
    *,
    create_user: bool,
) -> str:
    if create_user:
        create_api_user(client, subscription_key, api_user, callback_host)
    return create_api_key(client, subscription_key, api_user)


def write_output(payload: dict) -> tuple[Path, Path]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    env_path = OUTPUT_DIR / "mtn_momo_credentials.env"
    json_path = OUTPUT_DIR / "mtn_momo_credentials.json"

    env_lines = [
        "# MTN MoMo credentials — generated by scripts/provision_mtn_momo.py",
        f"# {payload['generated_at']}",
        "# Copy these lines into farumasi_api/.env (and Render). Keep secret.",
        "",
        f"MTN_MOMO_PRIMARY_KEY={payload['subscription_key']}",
        f"MTN_MOMO_SUBSCRIPTION_KEY={payload['subscription_key']}",
        f"MTN_MOMO_API_USER={payload['api_user']}",
        f"MTN_MOMO_API_KEY={payload['api_key']}",
        f"MTN_MOMO_ENV={payload['env']}",
        f"MTN_MOMO_TARGET_ENVIRONMENT={payload['target_environment']}",
        f"MTN_MOMO_CURRENCY={payload['currency']}",
    ]
    if payload.get("callback_url"):
        env_lines.append(f"MTN_MOMO_CALLBACK_URL={payload['callback_url']}")

    env_path.write_text("\n".join(env_lines) + "\n", encoding="utf-8")
    json_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return env_path, json_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Provision MTN MoMo sandbox API user + key")
    parser.add_argument(
        "--callback-host",
        help="providerCallbackHost for sandbox (default: hostname from API_PUBLIC_URL, or webhook.site)",
    )
    parser.add_argument(
        "--subscription-key",
        help="Override subscription key (Primary or Secondary from Collection subscription)",
    )
    parser.add_argument(
        "--api-user",
        help="Reuse an existing sandbox API user UUID (only creates a new API key)",
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Only verify existing MTN_MOMO_* credentials in .env (no provisioning)",
    )
    parser.add_argument(
        "--diagnose",
        action="store_true",
        help="Test subscription keys against MTN and print environment guidance (no provisioning)",
    )
    args = parser.parse_args()

    candidates = _subscription_key_candidates(args.subscription_key)
    if not candidates:
        print(
            "Set MTN_MOMO_PRIMARY_KEY in farumasi_api/.env first.\n"
            "Get it after subscribing to Collection at https://momodeveloper.mtn.com",
            file=sys.stderr,
        )
        sys.exit(1)

    if args.diagnose:
        run_diagnose(candidates)

    env = (settings.MTN_MOMO_ENV or "sandbox").lower()
    if not args.verify_only and env == "production":
        print(
            "MTN_MOMO_ENV=production: sandbox provisioning API is not available.\n"
            "Create API User + API Key in the MTN Partner Portal, then use --verify-only.",
            file=sys.stderr,
        )
        sys.exit(1)

    callback_host = _callback_host(args.callback_host)
    target_env = _target_environment()
    currency = (settings.MTN_MOMO_CURRENCY or "RWF").strip()
    callback_url = (settings.MTN_MOMO_CALLBACK_URL or "").strip()
    if not callback_url and callback_host != "webhook.site":
        callback_url = f"{settings.API_PUBLIC_URL.rstrip('/')}/api/v1/webhooks/mtn-momo"

    api_user = (args.api_user or settings.MTN_MOMO_API_USER or "").strip() or str(uuid.uuid4())
    api_key = (settings.MTN_MOMO_API_KEY or "").strip()
    create_user = not args.api_user and not settings.MTN_MOMO_API_USER

    print(f"MoMo env: {env}")
    print(f"Callback host: {callback_host}")
    print(f"Subscription keys to try: {', '.join(label for label, _ in candidates)}")

    subscription_key = ""
    key_label = ""
    last_err: MomoProvisionError | None = None

    with httpx.Client(timeout=45.0) as client:
        if args.verify_only:
            if not settings.MTN_MOMO_API_USER or not api_key:
                print("Set MTN_MOMO_API_USER and MTN_MOMO_API_KEY in .env for --verify-only.", file=sys.stderr)
                sys.exit(1)
            api_user = settings.MTN_MOMO_API_USER
            subscription_key = candidates[0][1]
            key_label = candidates[0][0]
            print(f"Verifying with {key_label} key {_mask_key(subscription_key)}…")
            print("Requesting collection access token…")
            token = verify_access_token(client, subscription_key, api_user, api_key)
            print(f"Access token OK ({len(token)} chars).")
        else:
            for label, key in candidates:
                print(f"\nTrying {label} key {_mask_key(key)}…")
                try:
                    if create_user:
                        print(f"Creating API user {api_user}…")
                        create_api_user(client, key, api_user, callback_host)
                        print("API user created (201).")
                    else:
                        print(f"Using API user {api_user}")

                    print("Creating API key…")
                    api_key = create_api_key(client, key, api_user)
                    print("API key created (201).")
                    subscription_key = key
                    key_label = label
                    break
                except MomoProvisionError as exc:
                    last_err = exc
                    if exc.status_code == 401:
                        print(f"  Rejected (401) — trying next key if available…")
                        continue
                    raise

            if not subscription_key:
                print(f"\nAll subscription keys failed.", file=sys.stderr)
                if last_err:
                    print(str(last_err), file=sys.stderr)
                print(SUBSCRIPTION_KEY_HELP, file=sys.stderr)
                print("\nRun:  python scripts/provision_mtn_momo.py --diagnose", file=sys.stderr)
                sys.exit(1)

            print(f"\nWorking key: {key_label} ({_mask_key(subscription_key)})")
            print("Requesting collection access token…")
            token = verify_access_token(client, subscription_key, api_user, api_key)
            print(f"Access token OK ({len(token)} chars).")

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "env": env,
        "target_environment": target_env,
        "currency": currency,
        "subscription_key": subscription_key,
        "subscription_key_label": key_label,
        "api_user": api_user,
        "api_key": api_key,
        "callback_host": callback_host,
        "callback_url": callback_url or None,
        "collection_base_url": _collection_base(),
        "token_verified": True,
    }

    env_path, json_path = write_output(payload)

    print()
    print("Success. Credentials saved to:")
    print(f"  {env_path}")
    print(f"  {json_path}")
    print()
    print("Add to farumasi_api/.env:")
    print(f"MTN_MOMO_PRIMARY_KEY={subscription_key}")
    print(f"MTN_MOMO_API_USER={api_user}")
    print(f"MTN_MOMO_API_KEY={api_key}")
    print(f"MTN_MOMO_ENV={env}")
    print(f"MTN_MOMO_TARGET_ENVIRONMENT={target_env}")
    if callback_url:
        print(f"MTN_MOMO_CALLBACK_URL={callback_url}")


if __name__ == "__main__":
    try:
        main()
    except MomoProvisionError as exc:
        print(str(exc), file=sys.stderr)
        if exc.status_code == 401:
            print(SUBSCRIPTION_KEY_HELP, file=sys.stderr)
        sys.exit(1)
