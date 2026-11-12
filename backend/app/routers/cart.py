from fastapi import APIRouter, Depends, HTTPException

from app. database import (cursor, connection)
from app.auth.dependencies import (get_current_user)


router = APIRouter()


@router.post("/cart/add")
def add_to_cart(product_id: int, quantity: int, current_user: dict = Depends(get_current_user)):
    # extract user_id secureley from jwt payload
    user_id = current_user.get("id")
    cursor.execute("""INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)""",
                   (user_id, product_id, quantity))
    connection.commit()
    return {"message": "Product added to cart successfully"}

@router.get("/cart")
def get_cart(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    cursor.execute(
    """
    SELECT
        cart.id AS cart_id,
        cart.product_id AS product_id,
        watches.name AS product_name,
        watches.price AS price,
        cart.quantity AS quantity
    FROM cart
    JOIN watches
        ON cart.product_id = watches.id
    WHERE cart.user_id = ?
    """,
    (user_id,)
)
    rows = cursor.fetchall()
    items = []

    for row in rows:
        items.append({
            "cart_id": row["cart_id"],
            "product_id": row["product_id"],
            "product_name": row["product_name"],
            "price": row["price"],
            "quantity": row["quantity"]
        })
    return items

@router.delete("/cart/{cart_id}")
def delete_cart_item(cart_id: int, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    cursor.execute("""DELETE FROM cart WHERE id=? AND user_id=?""", (cart_id, user_id))
    connection.commit()
    return {"message": "Item removed from cart successfully"}

current_user: dict = Depends(get_current_user)