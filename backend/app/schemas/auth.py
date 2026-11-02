from typing import Optional, List, Dict, Any
import re
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class PasswordStrengthResponse(BaseModel):
    is_valid: bool
    score: int
    label: str
    feedback: List[str]
    requirements: Dict[str, bool]


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, description="Full name of user")
    username: str = Field(..., min_length=3, max_length=30, description="Unique username")
    email: str = Field(..., min_length=5, max_length=255, description="Unique email address")
    country_code: Optional[str] = Field(None, max_length=5, description="Country calling code, e.g. +1 or +91")
    phone_number: Optional[str] = Field(None, max_length=20, description="Optional phone number")
    password: str = Field(..., min_length=12, max_length=128, description="Password (min 12 chars)")
    confirm_password: str = Field(..., min_length=12, max_length=128, description="Password confirmation")
    accept_terms: bool = Field(..., description="Must accept terms and conditions")

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[a-zA-Z0-9_\-\.]+$", v):
            raise ValueError("Username can only contain alphanumeric characters, dots, underscores, or hyphens.")
        return v

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Full name must be at least 2 characters long.")
        return v

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_PATTERN.match(v):
            raise ValueError("Invalid email address format.")
        return v

    @field_validator("accept_terms")
    @classmethod
    def must_accept_terms(cls, v: bool) -> bool:
        if not v:
            raise ValueError("You must accept the Terms and Conditions to register.")
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "RegisterRequest":
        if self.password and self.confirm_password and self.password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self


class LoginRequest(BaseModel):
    identifier: str = Field(..., min_length=3, max_length=255, description="Email or username")
    password: str = Field(..., min_length=1, max_length=128, description="Password")
    remember_me: Optional[bool] = Field(False, description="Extend session lifetime")


class VerifyEmailRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255, description="Email address to verify")
    otp_code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$", description="6-digit verification code")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_PATTERN.match(v):
            raise ValueError("Invalid email address format.")
        return v


class ResendEmailOTPRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255, description="Email address to receive OTP")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_PATTERN.match(v):
            raise ValueError("Invalid email address format.")
        return v


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255, description="Account email address")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_PATTERN.match(v):
            raise ValueError("Invalid email address format.")
        return v


class ResetPasswordRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255, description="Account email address")
    otp_code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$", description="6-digit reset code")
    new_password: str = Field(..., min_length=12, max_length=128, description="New password")
    confirm_password: str = Field(..., min_length=12, max_length=128, description="Confirm new password")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_PATTERN.match(v):
            raise ValueError("Invalid email address format.")
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "ResetPasswordRequest":
        if self.new_password and self.confirm_password and self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128, description="Current password")
    new_password: str = Field(..., min_length=12, max_length=128, description="New password")
    confirm_password: str = Field(..., min_length=12, max_length=128, description="Confirm new password")

    @model_validator(mode="after")
    def passwords_match(self) -> "ChangePasswordRequest":
        if self.new_password and self.confirm_password and self.new_password != self.confirm_password:
            raise ValueError("New passwords do not match.")
        return self


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="Valid refresh token")


class UserDTO(BaseModel):
    id: str
    full_name: str
    username: str
    email: str
    phone_number: Optional[str] = None
    country_code: Optional[str] = None
    is_email_verified: bool
    is_phone_verified: bool
    account_status: str
    role: str
    created_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TokenDTO(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthResponseData(BaseModel):
    user: UserDTO
    tokens: TokenDTO
