import uuid

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status
)

from app.database import get_db
from app.auth.dependencies import get_current_user


router = APIRouter(
    prefix="/orders",
    tags=["Orders"]
)


@router.post(
    "/checkout",
    status_code=status.HTTP_201_CREATED
)
def checkout(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    user_id = current_user.get("id")
    cursor = db.cursor()

    cursor.execute(
        """
        SELECT
            cart.product_id,
            cart.quantity,
            watches.price,
            watches.stock,
            watches.name
        FROM cart
        JOIN watches
            ON cart.product_id = watches.id
        WHERE cart.user_id = ?
        """,
        (user_id,)
    )

    cart_items = cursor.fetchall()

    if not cart_items:
        raise HTTPException(
            status_code=400,
            detail="Your cart is empty"
        )

    total_amount = 0

    for item in cart_items:
        quantity = int(item["quantity"])
        stock = int(item["stock"])

        if quantity > stock:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Insufficient stock for "
                    f"'{item['name']}'. "
                    f"Only {stock} left."
                )
            )

        total_amount += (
            float(item["price"]) * quantity
        )

    payment_reference = (
        "BH-" +
        uuid.uuid4().hex[:12].upper()
    )

    cursor.execute(
        """
        INSERT INTO orders
        (
            user_id,
            total_amount,
            payment_reference,
            status
        )
        VALUES (?, ?, ?, ?)
        """,
        (
            user_id,
            total_amount,
            payment_reference,
            "PENDING"
        )
    )

    order_id = cursor.lastrowid

    for item in cart_items:
        cursor.execute(
            """
            INSERT INTO order_items
            (
                order_id,
                product_id,
                quantity,
                price
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                order_id,
                item["product_id"],
                item["quantity"],
                item["price"]
            )
        )

    # Do not clear the cart here.
    # Do not reduce stock here.
    # Both happen only after verified payment.

    db.commit()

    return {
        "message": "Checkout created",
        "order_id": order_id,
        "payment_reference": payment_reference,
        "total_amount": total_amount,
        "status": "PENDING"
    }


@router.get(
    "/",
    status_code=status.HTTP_200_OK
)
def get_user_orders(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    user_id = current_user.get("id")
    cursor = db.cursor()

    cursor.execute(
        """
        SELECT *
        FROM orders
        WHERE user_id = ?
        ORDER BY created_at DESC
        """,
        (user_id,)
    )

    orders = cursor.fetchall()

    return [
        dict(order)
        for order in orders
    ]
