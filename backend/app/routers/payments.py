import os
import uuid
import httpx
import requests
import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from app.database import get_db
from app.auth.dependencies import get_current_user


router = APIRouter(
    prefix="/payments",
    tags=["Payments"]
)


PAYSTACK_SECRET_KEY = os.getenv(
    "PAYSTACK_SECRET_KEY"
)

FRONTEND_CALLBACK_URL = os.getenv(
    "FRONTEND_CALLBACK_URL"
)


@router.post("/initialize/{order_id}")
async def initialize_payment(
    order_id: int,
    current_user: dict = Depends(get_current_user)
):
    if not PAYSTACK_SECRET_KEY:
        raise HTTPException(
            status_code=500,
            detail="PAYSTACK_SECRET_KEY is missing"
        )

    db = sqlite3.connect(
        "blockhour.db",
        check_same_thread=False,
        timeout=20
    )

    db.row_factory = sqlite3.Row

    try:
        cursor = db.cursor()

        cursor.execute(
            """
            SELECT
                id,
                user_id,
                total_amount,
                payment_reference,
                status
            FROM orders
            WHERE id = ?
              AND user_id = ?
            """,
            (
                order_id,
                current_user["id"]
            )
        )

        order = cursor.fetchone()

        if not order:
            raise HTTPException(
                status_code=404,
                detail="Order not found"
            )

        if order["status"] == "PAID":
            raise HTTPException(
                status_code=400,
                detail="Order has already been paid"
            )

        reference = (
            "BH-" +
            uuid.uuid4().hex[:12].upper()
        )

        cursor.execute(
            """
            UPDATE orders
            SET payment_reference = ?
            WHERE id = ?
              AND user_id = ?
            """,
            (
                reference,
                order_id,
                current_user["id"]
            )
        )

        db.commit()

        total_amount = float( order["total_amount"]
        )

    finally:
        db.close()

    payload = {
        "email": current_user["email"],
        "amount": int(
            round(total_amount * 100)
        ),
        "reference": reference
    }

    if FRONTEND_CALLBACK_URL:
        payload["callback_url"] = (
            FRONTEND_CALLBACK_URL
        )

    headers = {
        "Authorization": (
            f"Bearer {PAYSTACK_SECRET_KEY}"
        ),
        "Content-Type": "application/json"
    }

    print(
        "Initializing Paystack transaction:",
        reference
    )

    try:
        timeout = httpx.Timeout(
            connect=10.0,
            read=30.0,
            write=10.0,
            pool=10.0
        )

        async with httpx.AsyncClient(
            timeout=timeout
        ) as client:
            response = await client.post(
                "https://api.paystack.co/transaction/initialize",
                json=payload,
                headers=headers
            )

        data = response.json()

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Paystack request timed out"
        )

    except httpx.RequestError as error:
        print(
            "Paystack connection error:",
            repr(error)
        )

        raise HTTPException(
            status_code=502,
            detail="Unable to connect to Paystack"
        )

    except ValueError:
        raise HTTPException(
            status_code=502,
            detail="Paystack returned invalid JSON"
        )

    print(
        "Paystack HTTP status:",
        response.status_code
    )

    print(
        "Paystack response:",
        data
    )

    if response.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=data.get(
                "message",
                "Payment initialization failed"
            )
        )

    if data.get("status") is not True:
        raise HTTPException(
            status_code=502,
            detail=data.get(
                "message",
                "Paystack could not initialize payment"
            )
        )

    provider_data = data.get("data") or {}

    authorization_url = provider_data.get(
        "authorization_url"
    )

    if not authorization_url:
        raise HTTPException(
            status_code=502,
            detail=(
                "Paystack returned no "
                "authorization URL"
            )
        )

    result = {
        "status": True,
        "message": data.get(
            "message",
            "Authorization URL created"
        ),
        "data": {
            "authorization_url":
                authorization_url,
            "access_code":
                provider_data.get(
                    "access_code"
                ),
            "reference":
                provider_data.get(
                    "reference",
                    reference
                )
        }
    }

    print(
        "Returning initialization result:",
        result
    )

    return result


@router.get("/verify/{reference}")
def verify_payment(
    reference: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    headers = {
        "Authorization": (
            f"Bearer {PAYSTACK_SECRET_KEY}"
        )
    }

    try:
        response = requests.get(
            (
                "https://api.paystack.co/"
                f"transaction/verify/{reference}"
            ),
            headers=headers,
            timeout=20
        )

        data = response.json()

    except requests.RequestException as error:
        print(
            "Paystack verification error:",
            error
        )

        raise HTTPException(
            status_code=502,
            detail="Unable to verify payment"
        )

    except ValueError:
        raise HTTPException(
            status_code=502,
            detail="Paystack returned invalid JSON"
        )

    if not response.ok:
        raise HTTPException(
            status_code=502,
            detail=data.get(
                "message",
                "Payment verification failed"
            )
        )

    payment_data = data.get("data", {})

    payment_status = payment_data.get(
        "status",
        "pending"
    )

    # Non-successful status must not fulfill the order.
    if payment_status != "success":
        return {
            "status": False,
            "payment_status": payment_status,
            "reference": reference,
            "message": data.get(
                "message",
                "Payment has not been confirmed"
            )
        }

    cursor = db.cursor()

    cursor.execute(
        """
        SELECT
            id,
            user_id,
            total_amount,
            status
        FROM orders
        WHERE payment_reference = ?
          AND user_id = ?
        """,
        (
            reference,
            current_user["id"]
        )
    )

    order = cursor.fetchone()

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Matching order not found"
        )

    expected_amount = int(
        round(
            float(order["total_amount"]) * 100
        )
    )

    paid_amount = int(
        payment_data.get("amount", 0)
    )

    if paid_amount != expected_amount:
        raise HTTPException(
            status_code=400,
            detail="Payment amount does not match order"
        )

    # Avoid processing the same payment twice.
    if order["status"] != "PAID":
        cursor.execute(
            """
            SELECT
                product_id,
                quantity
            FROM order_items
            WHERE order_id = ?
            """,
            (order["id"],)
        )

        order_items = cursor.fetchall()

        for item in order_items:
            cursor.execute(
                """
                UPDATE watches
                SET stock = stock - ?
                WHERE id = ?
                  AND stock >= ?
                """,
                (
                    item["quantity"],
                    item["product_id"],
                    item["quantity"]
                )
            )

            if cursor.rowcount == 0:
                db.rollback()

                raise HTTPException(
                    status_code=400,
                    detail=(
                        "A product is no longer "
                        "available in the required quantity"
                    )
                )

        cursor.execute(
            """
            UPDATE orders
            SET status = 'PAID'
            WHERE id = ?
            """,
            (order["id"],)
        )

        cursor.execute(
            """
            DELETE FROM cart
            WHERE user_id = ?
            """,
            (current_user["id"],)
        )

        db.commit()

    return {
        "status": True,
        "payment_status": "success",
        "reference": reference,
        "order_id": order["id"],
        "total_amount": float(
            order["total_amount"]
        ),
        "amount": paid_amount,
        "channel": payment_data.get(
            "channel"
        ),
        "paid_at": payment_data.get(
            "paid_at"
        )
    }