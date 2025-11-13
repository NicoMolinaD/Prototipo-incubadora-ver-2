# app/routers/auth.py
from __future__ import annotations
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models, schemas
from ..auth import (
    authenticate_user,
    create_access_token,
    get_password_hash,
    get_current_active_user,
    get_current_admin_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=schemas.UserOut)
def register(
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    db_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user_data.password)
    db_user = models.User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        is_admin=False,
        is_active=True,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "is_admin": user.is_admin},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserOut)
def read_users_me(current_user: models.User = Depends(get_current_active_user)):
    return current_user

@router.post("/create-admin", response_model=schemas.UserOut)
def create_admin(
    user_data: schemas.UserCreate,
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    db_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user_data.password)
    db_user = models.User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        is_admin=True,
        is_active=True,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/users", response_model=list[schemas.UserOut])
def list_users(
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    users = db.query(models.User).all()
    return users

@router.put("/users/{user_id}", response_model=schemas.UserOut)
def update_user(
    user_id: int,
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_update.username and user_update.username != db_user.username:
        existing = db.query(models.User).filter(models.User.username == user_update.username).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        db_user.username = user_update.username
    
    if user_update.email and user_update.email != db_user.email:
        existing = db.query(models.User).filter(models.User.email == user_update.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already taken")
        db_user.email = user_update.email
    
    if user_update.password:
        db_user.hashed_password = get_password_hash(user_update.password)
    
    db.commit()
    db.refresh(db_user)
    return db_user

@router.patch("/users/{user_id}/toggle-admin", response_model=schemas.UserOut)
def toggle_admin(
    user_id: int,
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if db_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own admin status")
    
    db_user.is_admin = not db_user.is_admin
    db.commit()
    db.refresh(db_user)
    return db_user

@router.patch("/users/{user_id}/toggle-active", response_model=schemas.UserOut)
def toggle_active(
    user_id: int,
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if db_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    
    db_user.is_active = not db_user.is_active
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if db_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    db.delete(db_user)
    db.commit()
    return {"ok": True}

