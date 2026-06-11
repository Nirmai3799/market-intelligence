from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.user import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.services.auth_service import get_current_user, login_user, register_user

router = APIRouter(prefix="/auth", tags=["Auth"])
security = HTTPBearer()


@router.post("/register", response_model=TokenResponse)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """Create a new account. Returns a JWT token on success."""
    return register_user(body.email, body.password, db)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Log in with email and password. Returns a JWT token."""
    return login_user(body.email, body.password, db)


@router.get("/me", response_model=UserResponse)
def me(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """Return the currently logged-in user. Requires a Bearer token."""
    user = get_current_user(credentials.credentials, db)
    return user
