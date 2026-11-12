from fastapi import APIRouter

from app.database import (cursor, connection)

router = APIRouter()

@router.post("/products")
def create_product(name: str, category: str, price: float, stock: int, description: str = ""):
     cursor.execute("""INSERT INTO watches (name, category, price, stock, description) VALUES (?, ?, ?, ?, ?)""",
                        (name, category, price, stock, description))
     connection.commit()
     
     return {"message": "Product created successfully"}

@router.get("/products")
def get_products():
    cursor.execute("SELECT * FROM watches")

    rows = cursor.fetchall()

    watches = []

    for row in rows:
         watches.append({
            "id": row["id"], "name": row["name"], "category": row["category"],
              "price": row["price"], "stock": row["stock"], "description": row["description"]
        })
    return watches

@router.get("/products/{product_id}")
def get_product(product_id: int):
    cursor.execute("""SELECT * FROM watches WHERE id=?""", (product_id,))
    row = cursor.fetchone()

    if not row:
        return {"error": "Product not found"}
    return {
        "id": row["id"], "name": row["name"], "category": row["category"],
        "price": row["price"], "stock": row["stock"], "description": row["description"]
    }
@router.put("/products/{product_id}")
def update_product(product_id: int, price: float, stock: int
                   ):
    cursor.execute("""UPDATE watches SET price=?, stock=? WHERE id=?""", (price, stock, product_id
                                                                          )
                                                                          )
    connection.commit()
    return {"message": "Product updated successfully"}

@router.delete("""/products/{product_id}""")
def delete_product(product_id: int):
    cursor.execute("""DELETE FROM watches WHERE id=?""", (product_id,))
    connection.commit()
    return {
        "message": "Product deleted successfully"
        }