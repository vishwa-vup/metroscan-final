"""Password hashing — stdlib PBKDF2-SHA256.

Rationale (locked-stack rule: extra deps need justification): the pinned passlib
1.7.4 is incompatible with the bcrypt 5.x present in current Python environments
(passlib reads bcrypt.__about__, removed upstream), which breaks login at import
time. PBKDF2-HMAC-SHA256 with a per-user 128-bit salt and 260k iterations is an
audited primitive with zero added dependencies.
"""

import hashlib
import hmac
import secrets

ITERATIONS = 260_000


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), ITERATIONS)
    return f"pbkdf2-sha256${ITERATIONS}${salt}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, iters, salt, digest = stored.split("$")
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(iters))
        return hmac.compare_digest(dk.hex(), digest)
    except (ValueError, TypeError):
        return False
