from fastapi import APIRouter
from fastapi import Depends
from pydantic import BaseModel


from app.auth.password import (hash_password, verify_password)

from app.auth.jwt_handler import(create_access_token)
from app.auth.dependencies  import (get_current_user)
from app.database import (cursor, connection)

class LoginRequest(BaseModel) :
    email: str 
    password: str

router = APIRouter()


@router.post("/register")
def register(name: str, email: str, password: str):
    hashed = hash_password(password)
    try:
        cursor.execute("SELECT id FROM users WHERE email=?", (email,))
        existing = cursor.fetchone()
        if existing:
            return {"error":"Email already exists"}
        
        cursor.execute("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", (name, email, hashed))
        connection.commit()
        return {"message": "User registered successfully"}
    except Exception as e:
        return {"error": str(e)}

@router.post("/login")
def login(payload: LoginRequest):
    cursor.execute(""" SELECT id, name, email, password FROM users WHERE email=? """,(payload.email,))
    user = cursor.fetchone()
    if not user:
        return {"error": "invalid credentials"}
    if not verify_password(payload.password, user[3]):
        return {"error": "invalid credentials"}
    token = create_access_token({"id": user[0], "name": user[1], "email": user[2]})
    return {"access_token": token,"token_type": "bearer"}

@router.get("/users")
def users():
    cursor.execute(""" SELECT id, name, email FROM users """)
    records = cursor.fetchall()
    result =[]
    for row in records:
        result.append({"id": row[0], "name": row[1], "email": row[2]})
    return result

@router.get("/me")
def me (current_user = Depends(get_current_user)
):
    return current_user