"""Stack verifier for the `deploy: verify stack` VS Code task.

Checks (no secrets printed):
  1. GET /healthz            -> 200
  2. GET /health/db          -> 200 {"db": "up"}
  3. POST /api/v1/auth/login -> 200 (ADMIN_EMAIL/ADMIN_PASSWORD env)
  4. GET  /api/v1/auth/me    -> 200 (token, masked)

Env: BASE_URL (default http://127.0.0.1:8000), ADMIN_EMAIL, ADMIN_PASSWORD.
Exit non-zero on first failure.
"""

import json
import os
import sys
import urllib.request

BASE = os.environ.get("BASE_URL", "http://127.0.0.1:8000")


def get(path, token=None):
    req = urllib.request.Request(BASE + path)
    if token:
        req.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.status, r.read().decode()


def main() -> int:
    try:
        s, body = get("/healthz")
        assert s == 200 and '"ok"' in body, body[:100]
        print(f"1. /healthz: {s} OK")

        s, body = get("/health/db")
        assert s == 200 and '"up"' in body, body[:100]
        print(f"2. /health/db: {s} db up")

        email = os.environ["ADMIN_EMAIL"]
        password = os.environ["ADMIN_PASSWORD"]
        req = urllib.request.Request(
            BASE + "/api/v1/auth/login",
            data=json.dumps({"email": email, "password": password}).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=15) as r:
            login = json.loads(r.read())
        token = login["access_token"]
        print(f"3. login ({email}): 200, token_len={len(token)}")

        s, body = get("/api/v1/auth/me", token)
        assert s == 200 and email in body, body[:100]
        print(f"4. /me: {s} OK")
    except AssertionError as e:
        print("VERIFY FAIL:", str(e)[:150])
        return 1
    except KeyError as e:
        print(f"VERIFY FAIL: missing env var {e} (set ADMIN_EMAIL/ADMIN_PASSWORD)")
        return 1
    except Exception as e:  # noqa: BLE001
        print("VERIFY FAIL:", str(e)[:150])
        return 1
    print("VERIFY: all checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
