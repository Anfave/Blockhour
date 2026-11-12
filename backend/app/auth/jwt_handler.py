import os
from pathlib import Path
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BASE_DIR / "secrets.env"

load_dotenv(dotenv_path=ENV_FILE)

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

if not SECRET_KEY:
    raise RuntimeError(
        f"JWT_SECRET was not found in {ENV_FILE}"
    )


def create_access_token(data: dict) -> str:
    payload = data.copy()

    payload["exp"] = (
        datetime.now(timezone.utc)
        + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    )

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def verify_token(token: str):
    try:
        return jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None