from fastapi import Depends, HTTPException
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.auth import create_access_token, decode_token
from app.core.database import get_db
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def register_user(email: str, password: str, db: Session) -> dict:
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")

    user = User(email=email, hashed_password=hash_password(password))
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "user_id": user.id,
    }


def login_user(email: str, password: str, db: Session) -> dict:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "user_id": user.id,
    }


def get_current_user(token: str, db: Session) -> User:
    user_id = decode_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Token is invalid or expired.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    return user
