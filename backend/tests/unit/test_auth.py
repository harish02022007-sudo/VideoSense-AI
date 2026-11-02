import pytest
import uuid
from fastapi.testclient import TestClient

from app.main import app
from app.core.security import (
    hash_password,
    verify_password,
    validate_password_strength,
    generate_otp_code,
    hash_otp,
    verify_otp_hash,
    create_access_token,
    decode_token,
)
from app.database.session import SessionLocal
from app.models.user import User
from app.models.otp import OTPVerification


def test_password_strength_validator():
    """Verify password strength validation rules, scoring, and feedback."""
    # Too short
    weak = validate_password_strength("Short1!")
    assert weak["is_valid"] is False
    assert any("at least 12 characters" in fb for fb in weak["feedback"])

    # Common password
    common = validate_password_strength("password12345678!")
    assert common["is_valid"] is False
    assert any("easily guessed" in fb.lower() for fb in common["feedback"])

    # Strong password
    strong = validate_password_strength("VideoSense#Secure2026!StrongPass")
    assert strong["is_valid"] is True
    assert strong["score"] >= 3
    assert strong["requirements"]["length"] is True
    assert strong["requirements"]["uppercase"] is True
    assert strong["requirements"]["lowercase"] is True
    assert strong["requirements"]["number"] is True
    assert strong["requirements"]["special"] is True


def test_password_hashing_and_verification():
    """Verify cryptographic password hashing with correct verification and mismatch handling."""
    raw_pwd = "MySecretPassword2026!#Secure"
    pwd_hash = hash_password(raw_pwd)

    assert pwd_hash != raw_pwd
    assert verify_password(raw_pwd, pwd_hash) is True
    assert verify_password("WrongPassword123!", pwd_hash) is False
    assert verify_password("", pwd_hash) is False


def test_otp_cryptographic_hashing():
    """Verify 6-digit OTP generation, SHA-256 peppered hashing, and verification."""
    code = generate_otp_code(6)
    assert len(code) == 6
    assert code.isdigit()

    email = "researcher@videosense.ai"
    purpose = "email_verification"
    otp_hash = hash_otp(code, email, purpose)

    # Correct code matches
    assert verify_otp_hash(code, otp_hash, email, purpose) is True
    # Wrong code rejected
    assert verify_otp_hash("000000" if code != "000000" else "111111", otp_hash, email, purpose) is False
    # Wrong identifier rejected
    assert verify_otp_hash(code, otp_hash, "intruder@domain.com", purpose) is False


def test_validate_password_endpoint():
    """Test POST /api/v1/auth/validate-password API endpoint."""
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/auth/validate-password",
            json={"password": "VideoSense2026!SecureKey"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["is_valid"] is True
        assert data["data"]["score"] >= 3


def test_auth_full_lifecycle():
    """Test full authentication lifecycle: Register -> OTP Verification -> Login -> Me -> Password Change -> Logout."""
    unique_suffix = uuid.uuid4().hex[:8]
    test_email = f"test_{unique_suffix}@videosense.ai"
    test_username = f"user_{unique_suffix}"
    initial_password = "SecurePassword2026!@Test"
    updated_password = "NewStrongPassword2026!#Changed"

    with TestClient(app) as client:
        # 1. Register with weak password -> Expect 400
        fail_res = client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Test Engineer",
                "username": test_username,
                "email": test_email,
                "password": "weak",
                "confirm_password": "weak",
                "accept_terms": True,
            },
        )
        assert fail_res.status_code in [400, 422]

        # 2. Register with valid details
        reg_res = client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Test Engineer",
                "username": test_username,
                "email": test_email,
                "country_code": "+1",
                "phone_number": "5551234567",
                "password": initial_password,
                "confirm_password": initial_password,
                "accept_terms": True,
            },
        )
        assert reg_res.status_code == 201
        reg_data = reg_res.json()
        assert reg_data["success"] is True
        assert reg_data["data"]["email"] == test_email
        assert reg_data["data"]["verification_required"] is True

        # Duplicate registration with same email -> Expect 400
        dup_res = client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Duplicate User",
                "username": f"other_{unique_suffix}",
                "email": test_email,
                "password": initial_password,
                "confirm_password": initial_password,
                "accept_terms": True,
            },
        )
        assert dup_res.status_code == 400
        assert "already exists" in dup_res.json()["detail"].lower()

        # 3. Retrieve OTP from database for test verification
        db = SessionLocal()
        try:
            otp_record = (
                db.query(OTPVerification)
                .filter(
                    OTPVerification.identifier == test_email,
                    OTPVerification.purpose == "email_verification",
                    OTPVerification.is_used == False,
                )
                .order_by(OTPVerification.created_at.desc())
                .first()
            )
            assert otp_record is not None
            # Verify OTP is hashed in DB, never plaintext
            assert len(otp_record.otp_hash) == 64
        finally:
            db.close()

        # 4. Attempt login before email verification -> Expect 403 EMAIL_NOT_VERIFIED
        unverified_login = client.post(
            "/api/v1/auth/login",
            json={
                "identifier": test_email,
                "password": initial_password,
            },
        )
        assert unverified_login.status_code == 403
        assert "EMAIL_NOT_VERIFIED" in unverified_login.json()["detail"]

        # 5. Verify email with wrong OTP code -> Expect 400
        wrong_otp_res = client.post(
            "/api/v1/auth/verify-email",
            json={
                "email": test_email,
                "otp_code": "000000",
            },
        )
        assert wrong_otp_res.status_code == 400

        # We can simulate setting a known OTP hash for deterministic testing
        test_otp = "123456"
        db = SessionLocal()
        try:
            otp_record = (
                db.query(OTPVerification)
                .filter(
                    OTPVerification.identifier == test_email,
                    OTPVerification.purpose == "email_verification",
                    OTPVerification.is_used == False,
                )
                .order_by(OTPVerification.created_at.desc())
                .first()
            )
            otp_record.otp_hash = hash_otp(test_otp, test_email, "email_verification")
            db.commit()
        finally:
            db.close()

        # Verify email with correct OTP
        verify_res = client.post(
            "/api/v1/auth/verify-email",
            json={
                "email": test_email,
                "otp_code": test_otp,
            },
        )
        assert verify_res.status_code == 200
        verify_data = verify_res.json()
        assert verify_data["success"] is True
        assert verify_data["data"]["user"]["is_email_verified"] is True
        access_token = verify_data["data"]["tokens"]["access_token"]
        refresh_token = verify_data["data"]["tokens"]["refresh_token"]
        assert access_token is not None

        # 6. Login using Username
        login_user_res = client.post(
            "/api/v1/auth/login",
            json={
                "identifier": test_username,
                "password": initial_password,
                "remember_me": True,
            },
        )
        assert login_user_res.status_code == 200
        assert login_user_res.json()["data"]["user"]["username"] == test_username

        # 7. Login with Wrong Password -> 401
        wrong_pwd_res = client.post(
            "/api/v1/auth/login",
            json={
                "identifier": test_username,
                "password": "IncorrectPassword123!",
            },
        )
        assert wrong_pwd_res.status_code == 401

        # 8. Test Protected Endpoint /auth/me
        # Without token -> 401
        no_auth = client.get("/api/v1/auth/me")
        assert no_auth.status_code == 401

        # With valid Bearer token -> 200
        auth_headers = {"Authorization": f"Bearer {access_token}"}
        me_res = client.get("/api/v1/auth/me", headers=auth_headers)
        assert me_res.status_code == 200
        assert me_res.json()["data"]["email"] == test_email

        # 9. Change Password
        change_res = client.post(
            "/api/v1/auth/change-password",
            headers=auth_headers,
            json={
                "current_password": initial_password,
                "new_password": updated_password,
                "confirm_password": updated_password,
            },
        )
        assert change_res.status_code == 200

        # Old password no longer works
        old_login = client.post(
            "/api/v1/auth/login",
            json={
                "identifier": test_email,
                "password": initial_password,
            },
        )
        assert old_login.status_code == 401

        # New password works
        new_login = client.post(
            "/api/v1/auth/login",
            json={
                "identifier": test_email,
                "password": updated_password,
            },
        )
        assert new_login.status_code == 200

        # 10. Refresh Token Endpoint
        refresh_res = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert refresh_res.status_code == 200
        assert "access_token" in refresh_res.json()["data"]

        # 11. Logout
        logout_res = client.post("/api/v1/auth/logout", headers=auth_headers)
        assert logout_res.status_code == 200

