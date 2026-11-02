import os
import re
import hmac
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from jose import jwt, JWTError

# Configuration defaults with environment overrides
JWT_SECRET_KEY = os.getenv("VIDEOSENSE_JWT_SECRET", "videosense_production_secret_key_8f9a2b4c6e1d3f5a7b9c0e2d4f6a8b1c")
JWT_ALGORITHM = os.getenv("VIDEOSENSE_JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("VIDEOSENSE_ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("VIDEOSENSE_REFRESH_TOKEN_EXPIRE_DAYS", "7"))
OTP_PEPPER = os.getenv("VIDEOSENSE_OTP_PEPPER", "videosense_otp_pepper_sec_v3")

# Password Hasher initialization
_has_argon2 = False
try:
    import argon2
    from argon2 import PasswordHasher
    _ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)
    _has_argon2 = True
except Exception:
    _has_argon2 = False


def hash_password(password: str) -> str:
    """
    Hash a password securely using Argon2id if available,
    or PBKDF2-HMAC-SHA256 (600,000 iterations) as standard fallback.
    """
    if _has_argon2:
        return _ph.hash(password)
    
    # Fallback to PBKDF2-HMAC-SHA256 (OWASP recommended 600,000 iterations)
    salt = secrets.token_bytes(32)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 600000)
    return f"pbkdf2_sha256$600000${salt.hex()}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash with constant-time equality check.
    """
    if not plain_password or not hashed_password:
        return False

    try:
        if hashed_password.startswith("$argon2"):
            if _has_argon2:
                try:
                    return _ph.verify(hashed_password, plain_password)
                except Exception:
                    return False
            return False

        if hashed_password.startswith("pbkdf2_sha256$"):
            parts = hashed_password.split("$")
            if len(parts) != 4:
                return False
            iterations = int(parts[1])
            salt = bytes.fromhex(parts[2])
            expected_key = bytes.fromhex(parts[3])
            key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, iterations)
            return hmac.compare_digest(key, expected_key)
            
        return False
    except Exception:
        return False


def validate_password_strength(password: str) -> Dict[str, Any]:
    """
    Evaluates password strength using multi-factor checks:
    - Minimum length: 12 characters
    - Complexity: Uppercase, lowercase, numeric, symbol
    - Pattern checks: Repeating sequences, dictionary words
    Returns: Dict containing is_valid, score, label, feedback, and requirements.
    """
    checks = {
        "length": len(password) >= 12,
        "uppercase": bool(re.search(r"[A-Z]", password)),
        "lowercase": bool(re.search(r"[a-z]", password)),
        "number": bool(re.search(r"[0-9]", password)),
        "special": bool(re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?~`]", password)),
        "no_repetitive": not bool(re.search(r"(.)\1{3,}", password)),  # No 4 repeated chars
    }

    # Common weak passwords dictionary & predictable pattern checks
    COMMON_PASSWORDS = {
        "password", "password123", "password1234", "password12345",
        "admin123456", "qwerty123456", "videosense123", "welcome123456",
        "letmein123456", "iloveyou1234", "123456789012", "password12345678!"
    }
    is_exact_common = password.lower() in COMMON_PASSWORDS
    has_trivial_pattern = bool(
        re.search(r"^(password|admin|qwerty|123456)\d*[\W_]*$", password.lower())
    )
    checks["not_common"] = not (is_exact_common or has_trivial_pattern)

    score = 0
    if checks["length"]:
        score += 1
    if checks["uppercase"] and checks["lowercase"]:
        score += 1
    if checks["number"] and checks["special"]:
        score += 1
    if checks["no_repetitive"] and checks["not_common"] and len(password) >= 14:
        score += 1

    labels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"]
    score_label = labels[min(score, 4)]

    # Minimum acceptance requirement: 12 chars + mixed case + number + symbol + not common
    is_valid = (
        checks["length"] and 
        checks["uppercase"] and 
        checks["lowercase"] and 
        checks["number"] and 
        checks["special"] and 
        checks["not_common"] and 
        checks["no_repetitive"]
    )

    error_msg = ""
    feedback = []
    if not checks["length"]:
        error_msg = "Password must be at least 12 characters long."
        feedback.append(error_msg)
    if not (checks["uppercase"] and checks["lowercase"]):
        msg = "Password must contain both uppercase and lowercase letters."
        if not error_msg: error_msg = msg
        feedback.append(msg)
    if not checks["number"]:
        msg = "Password must contain at least one digit (0-9)."
        if not error_msg: error_msg = msg
        feedback.append(msg)
    if not checks["special"]:
        msg = "Password must contain at least one special symbol (e.g. !@#$%^&*)."
        if not error_msg: error_msg = msg
        feedback.append(msg)
    if not checks["no_repetitive"]:
        msg = "Password contains repetitive characters."
        if not error_msg: error_msg = msg
        feedback.append(msg)
    if not checks["not_common"]:
        msg = "This password is too common and easily guessed."
        if not error_msg: error_msg = msg
        feedback.append(msg)

    return {
        "is_valid": is_valid,
        "score": min(score, 4),
        "label": score_label,
        "feedback": feedback if feedback else ["Password satisfies security requirements."],
        "requirements": {
            "length": checks["length"],
            "uppercase": checks["uppercase"],
            "lowercase": checks["lowercase"],
            "number": checks["number"],
            "special": checks["special"],
            "no_repetitive": checks["no_repetitive"],
            "not_common": checks["not_common"],
        },
        "error_message": error_msg,
    }


def generate_otp_code(digits: int = 6) -> str:
    """Generate a cryptographically secure numeric OTP."""
    range_start = 10 ** (digits - 1)
    range_end = (10 ** digits) - 1
    code = secrets.randbelow(range_end - range_start + 1) + range_start
    return str(code)


def hash_otp(otp: str, identifier: str, purpose: str) -> str:
    """Hash OTP code with pepper, identifier, and purpose to prevent tampering and reuse."""
    raw = f"{OTP_PEPPER}:{identifier.lower()}:{purpose}:{otp}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def verify_otp_hash(otp: str, hashed_otp: str, identifier: str, purpose: str) -> bool:
    """Constant-time verification of supplied OTP code."""
    expected_hash = hash_otp(otp, identifier, purpose)
    return hmac.compare_digest(expected_hash, hashed_otp)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_refresh_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh"
    })
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a signed JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None
