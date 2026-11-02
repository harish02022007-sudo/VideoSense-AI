from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database.session import get_db
from app.models.user import User
from app.models.otp import OTPVerification
from app.core.security import (
    hash_password,
    verify_password,
    validate_password_strength,
    generate_otp_code,
    hash_otp,
    verify_otp_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.services.communication_service import (
    send_email_otp,
)
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    VerifyEmailRequest,
    ResendEmailOTPRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    RefreshTokenRequest,
    PasswordStrengthResponse,
    UserDTO,
    TokenDTO,
    AuthResponseData,
)
from app.schemas.common import ResponseEnvelope
from app.core.dependencies import get_current_user
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger("app.api.auth")


def to_user_dto(user: User) -> UserDTO:
    """Helper to serialize User model into UserDTO across Pydantic v1 and v2."""
    if hasattr(UserDTO, "model_validate"):
        return UserDTO.model_validate(user)
    return UserDTO.from_orm(user)


@router.post("/validate-password", response_model=ResponseEnvelope[PasswordStrengthResponse])
def check_password_strength(payload: Dict[str, str]):
    """Evaluate password strength against security policy in real-time."""
    password = payload.get("password", "")
    result = validate_password_strength(password)
    return ResponseEnvelope(
        success=True,
        message="Password strength evaluated.",
        data=PasswordStrengthResponse(
            is_valid=result["is_valid"],
            score=result["score"],
            label=result["label"],
            feedback=result["feedback"],
            requirements=result["requirements"],
        ),
        request_id=str(uuid.uuid4()),
    )


@router.post("/register", response_model=ResponseEnvelope[Dict[str, Any]], status_code=status.HTTP_201_CREATED)
def register_user(
    request: Request,
    payload: RegisterRequest,
    db: Session = Depends(get_db),
):
    """Register a new user account and dispatch email verification OTP."""
    req_id = str(uuid.uuid4())

    # 1. Enforce backend password strength policy
    strength = validate_password_strength(payload.password)
    if not strength["is_valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password does not meet security requirements: {', '.join(strength['feedback'])}",
        )

    # 2. Check for duplicate normalized username
    existing_username = db.query(User).filter(User.username == payload.username.lower()).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is already taken. Please choose another.",
        )

    # 3. Check for duplicate normalized email
    existing_email = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    # 4. Hash password securely
    hashed_pwd = hash_password(payload.password)

    # 5. Create user record
    new_user = User(
        full_name=payload.full_name.strip(),
        username=payload.username.lower().strip(),
        email=payload.email.lower().strip(),
        country_code=payload.country_code,
        phone_number=payload.phone_number,
        password_hash=hashed_pwd,
        is_email_verified=False,
        is_phone_verified=False,
        account_status="pending_verification",
        role="user",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 6. Generate and store OTP
    otp_code = generate_otp_code(6)
    hashed_otp = hash_otp(otp_code, new_user.email, "email_verification")
    now = datetime.utcnow()

    otp_record = OTPVerification(
        identifier=new_user.email,
        purpose="email_verification",
        otp_hash=hashed_otp,
        expires_at=now + timedelta(minutes=10),
        resend_available_at=now + timedelta(seconds=60),
    )
    db.add(otp_record)
    db.commit()

    # 7. Dispatch verification email
    email_sent = send_email_otp(new_user.email, otp_code, "email_verification")
    if not email_sent:
        logger.warning(f"Registration email delivery could not be completed for {new_user.email}")

    return ResponseEnvelope(
        success=True,
        message="Registration successful. Please verify your email with the 6-digit code sent.",
        data={
            "user_id": new_user.id,
            "email": new_user.email,
            "username": new_user.username,
            "verification_required": True,
            "cooldown_seconds": 60,
        },
        request_id=req_id,
    )


@router.post("/verify-email", response_model=ResponseEnvelope[AuthResponseData])
def verify_email(
    payload: VerifyEmailRequest,
    db: Session = Depends(get_db),
):
    """Verify email with 6-digit OTP code and activate account."""
    req_id = str(uuid.uuid4())
    email = payload.email.lower().strip()
    code = payload.otp_code.strip()

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account associated with this email address.",
        )

    # Find latest unconsumed OTP record
    otp_record = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.identifier == email,
            OTPVerification.purpose == "email_verification",
            OTPVerification.is_used == False,
        )
        .order_by(OTPVerification.created_at.desc())
        .first()
    )

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending verification request found. Please request a new code.",
        )

    if datetime.utcnow() > otp_record.expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new code.",
        )

    if otp_record.attempts >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many invalid attempts. Please request a new verification code.",
        )

    if not verify_otp_hash(code, otp_record.otp_hash, email, "email_verification"):
        otp_record.attempts += 1
        db.commit()
        remaining = 5 - otp_record.attempts
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid verification code. {remaining} attempt(s) remaining.",
        )

    # Code is valid - mark used and activate account
    otp_record.is_used = True
    user.is_email_verified = True
    user.account_status = "active"
    user.last_login_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    # Issue session tokens
    token_data = {"sub": user.id, "email": user.email, "role": user.role}
    access_token = create_access_token(token_data, expires_delta=timedelta(hours=2))
    refresh_token = create_refresh_token(token_data, expires_delta=timedelta(days=7))

    return ResponseEnvelope(
        success=True,
        message="Email verified successfully. Welcome to VideoSense AI!",
        data=AuthResponseData(
            user=to_user_dto(user),
            tokens=TokenDTO(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=7200,
            ),
        ),
        request_id=req_id,
    )


@router.post("/resend-email-otp", response_model=ResponseEnvelope[Dict[str, Any]])
def resend_email_otp(
    payload: ResendEmailOTPRequest,
    db: Session = Depends(get_db),
):
    """Resend 6-digit verification code with rate-limit cooldown."""
    req_id = str(uuid.uuid4())
    email = payload.email.lower().strip()

    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Generic response to prevent account enumeration
        return ResponseEnvelope(
            success=True,
            message="If an unverified account exists with this email, a new code has been sent.",
            data={"cooldown_seconds": 60},
            request_id=req_id,
        )

    if user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already verified. You can sign in directly.",
        )

    # Check cooldown on existing active OTP
    active_otp = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.identifier == email,
            OTPVerification.purpose == "email_verification",
            OTPVerification.is_used == False,
        )
        .order_by(OTPVerification.created_at.desc())
        .first()
    )

    now = datetime.utcnow()
    if active_otp and active_otp.resend_available_at and active_otp.resend_available_at > now:
        wait_seconds = int((active_otp.resend_available_at - now).total_seconds())
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {wait_seconds} seconds before requesting another code.",
        )

    # Invalidate previous unconsumed OTPs
    if active_otp:
        active_otp.is_used = True

    new_code = generate_otp_code(6)
    hashed_otp = hash_otp(new_code, email, "email_verification")
    new_otp = OTPVerification(
        identifier=email,
        purpose="email_verification",
        otp_hash=hashed_otp,
        expires_at=now + timedelta(minutes=10),
        resend_available_at=now + timedelta(seconds=60),
    )
    db.add(new_otp)
    db.commit()

    send_email_otp(email, new_code, "email_verification")

    return ResponseEnvelope(
        success=True,
        message="A new verification code has been dispatched to your email.",
        data={"cooldown_seconds": 60},
        request_id=req_id,
    )


@router.post("/login", response_model=ResponseEnvelope[AuthResponseData])
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
):
    """Authenticate user with email or username and password."""
    req_id = str(uuid.uuid4())
    ident = payload.identifier.strip().lower()

    user = (
        db.query(User)
        .filter(or_(User.email == ident, User.username == ident))
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please check your username/email and password.",
        )

    # Check account lockout
    now = datetime.utcnow()
    if user.lockout_until and user.lockout_until > now:
        remaining_mins = int((user.lockout_until - now).total_seconds() / 60) + 1
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is temporarily locked due to repeated failed logins. Please try again in {remaining_mins} minutes.",
        )

    # Verify password
    if not verify_password(payload.password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 5:
            user.lockout_until = now + timedelta(minutes=15)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please check your username/email and password.",
        )

    # Account status check
    if user.account_status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended. Please contact administrator.",
        )

    # Email verification check
    if not user.is_email_verified:
        # Auto-dispatch a new code so the user isn't stuck
        new_code = generate_otp_code(6)
        hashed_otp = hash_otp(new_code, user.email, "email_verification")
        otp_record = OTPVerification(
            identifier=user.email,
            purpose="email_verification",
            otp_hash=hashed_otp,
            expires_at=now + timedelta(minutes=10),
            resend_available_at=now + timedelta(seconds=60),
        )
        db.add(otp_record)
        db.commit()
        send_email_otp(user.email, new_code, "email_verification")

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="EMAIL_NOT_VERIFIED",
        )

    # Success: reset lockout counters
    user.failed_login_attempts = 0
    user.lockout_until = None
    user.last_login_at = now
    db.commit()
    db.refresh(user)

    # Session lifetime
    access_hours = 24 if payload.remember_me else 2
    refresh_days = 30 if payload.remember_me else 7

    token_data = {"sub": user.id, "email": user.email, "role": user.role}
    access_token = create_access_token(token_data, expires_delta=timedelta(hours=access_hours))
    refresh_token = create_refresh_token(token_data, expires_delta=timedelta(days=refresh_days))

    # Dispatch security auth notification
    try:
        from app.services.notification_service import NotificationService
        NotificationService.create_notification(
            event_id=f"auth_login_{user.id}_{int(now.timestamp())}",
            event_type="user_login",
            category="security",
            title="User Session Authenticated",
            message=f"Session established for {user.full_name} ({user.email}). Validated credentials with {access_hours}h access token.",
            severity="info",
            user_id=user.id,
            resource_type="user",
            resource_id=user.id,
            metadata={
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "sessionHours": access_hours
            }
        )
    except Exception as notif_err:
        logger.warning(f"Could not dispatch login notification: {notif_err}")

    return ResponseEnvelope(
        success=True,
        message=f"Welcome back, {user.full_name}!",
        data=AuthResponseData(
            user=to_user_dto(user),
            tokens=TokenDTO(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=access_hours * 3600,
            ),
        ),
        request_id=req_id,
    )


@router.post("/logout", response_model=ResponseEnvelope[Dict[str, str]])
def logout(current_user: User = Depends(get_current_user)):
    """Sign out the current user and invalidate client session."""
    try:
        from app.services.notification_service import NotificationService
        NotificationService.create_notification(
            event_id=f"auth_logout_{current_user.id}_{int(datetime.utcnow().timestamp())}",
            event_type="user_logout",
            category="security",
            title="User Session Terminated",
            message=f"Session terminated for user {current_user.full_name} ({current_user.username}).",
            severity="info",
            user_id=current_user.id,
            resource_type="user",
            resource_id=current_user.id,
            metadata={"username": current_user.username, "email": current_user.email}
        )
    except Exception as notif_err:
        logger.warning(f"Could not dispatch logout notification: {notif_err}")

    return ResponseEnvelope(
        success=True,
        message="Logged out successfully.",
        data={"user_id": current_user.id},
        request_id=str(uuid.uuid4()),
    )


@router.get("/me", response_model=ResponseEnvelope[UserDTO])
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Retrieve profile data for currently authenticated user."""
    return ResponseEnvelope(
        success=True,
        message="Profile retrieved.",
        data=to_user_dto(current_user),
        request_id=str(uuid.uuid4()),
    )


@router.post("/forgot-password", response_model=ResponseEnvelope[Dict[str, Any]])
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """Generate and dispatch password reset OTP (protected against user enumeration)."""
    req_id = str(uuid.uuid4())
    email = payload.email.lower().strip()

    user = db.query(User).filter(User.email == email).first()
    if user and user.account_status != "suspended":
        now = datetime.utcnow()
        reset_code = generate_otp_code(6)
        hashed_otp = hash_otp(reset_code, email, "password_reset")

        otp_record = OTPVerification(
            identifier=email,
            purpose="password_reset",
            otp_hash=hashed_otp,
            expires_at=now + timedelta(minutes=10),
            resend_available_at=now + timedelta(seconds=60),
        )
        db.add(otp_record)
        db.commit()

        send_email_otp(email, reset_code, "password_reset")

    return ResponseEnvelope(
        success=True,
        message="If an account exists with this email address, a password reset code has been sent.",
        data={"cooldown_seconds": 60},
        request_id=req_id,
    )


@router.post("/reset-password", response_model=ResponseEnvelope[Dict[str, str]])
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Verify password reset OTP and update password."""
    req_id = str(uuid.uuid4())
    email = payload.email.lower().strip()
    code = payload.otp_code.strip()

    # Enforce password strength
    strength = validate_password_strength(payload.new_password)
    if not strength["is_valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password does not meet security requirements: {', '.join(strength['feedback'])}",
        )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found.",
        )

    otp_record = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.identifier == email,
            OTPVerification.purpose == "password_reset",
            OTPVerification.is_used == False,
        )
        .order_by(OTPVerification.created_at.desc())
        .first()
    )

    if not otp_record or datetime.utcnow() > otp_record.expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset code has expired or is invalid. Please request a new code.",
        )

    if otp_record.attempts >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many invalid attempts. Please request a new reset code.",
        )

    if not verify_otp_hash(code, otp_record.otp_hash, email, "password_reset"):
        otp_record.attempts += 1
        db.commit()
        remaining = 5 - otp_record.attempts
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid reset code. {remaining} attempt(s) remaining.",
        )

    # Valid: update password and reset lockout
    otp_record.is_used = True
    user.password_hash = hash_password(payload.new_password)
    user.failed_login_attempts = 0
    user.lockout_until = None
    db.commit()

    return ResponseEnvelope(
        success=True,
        message="Your password has been successfully reset. Please log in with your new password.",
        data={"email": user.email},
        request_id=req_id,
    )


@router.post("/change-password", response_model=ResponseEnvelope[Dict[str, str]])
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change user password while logged in."""
    req_id = str(uuid.uuid4())

    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    if payload.current_password == payload.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be identical to current password.",
        )

    strength = validate_password_strength(payload.new_password)
    if not strength["is_valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"New password does not meet security requirements: {', '.join(strength['feedback'])}",
        )

    current_user.password_hash = hash_password(payload.new_password)
    db.commit()

    return ResponseEnvelope(
        success=True,
        message="Password updated successfully.",
        data={"user_id": current_user.id},
        request_id=req_id,
    )


@router.post("/refresh", response_model=ResponseEnvelope[TokenDTO])
def refresh_token(
    payload: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    """Obtain a new access token using a valid refresh token."""
    req_id = str(uuid.uuid4())
    decoded = decode_token(payload.refresh_token)

    if not decoded or decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
        )

    user_id = decoded.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.account_status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer active.",
        )

    token_data = {"sub": user.id, "email": user.email, "role": user.role}
    new_access_token = create_access_token(token_data, expires_delta=timedelta(hours=2))
    new_refresh_token = create_refresh_token(token_data, expires_delta=timedelta(days=7))

    return ResponseEnvelope(
        success=True,
        message="Tokens refreshed successfully.",
        data=TokenDTO(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            expires_in=7200,
        ),
        request_id=req_id,
    )
