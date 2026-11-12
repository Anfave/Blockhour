from pathlib import Path
from dotenv import load_dotenv

ENV_FILE = (
    Path(__file__).resolve().parent.parent / 
    "secrets.env"
)

load_dotenv (
    dotenv_path=ENV_FILE,
    override=True
)




from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()

origins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
from app.routers.products import (router as products_router)
from app.routers.users import (router as users_router)
from app.routers.cart  import (router as cart_router)
from app.routers import (orders)
from app.routers import payments



# Include the products router
app.include_router(products_router)
app.include_router(users_router)
app.include_router(cart_router)
app.include_router(orders.router)
app.include_router(payments.router)

@app.get("/")
def home():
    return {"message": "Blockhour API is running!"}