import sqlite3

#def get_db():
#    db = sqlite3.connect("blockhour.db", check_same_thread=False)
#    db.row_factory = sqlite3.Row
#    try:
#        yield db
#    finally:
#        db.close()
def get_db():
    db = sqlite3.connect(
        "blockhour.db",
        check_same_thread=False,
        timeout=20
    )

    db.row_factory = sqlite3.Row

    try:
        print("DATABASE OPENED")
        yield db
    finally:
        print("CLOSING DATABASE")
        db.close()
        print("DATABASE CLOSED")
connection = sqlite3.connect("blockhour.db", check_same_thread=False)
connection.row_factory = sqlite3.Row
cursor = connection.cursor()


cursor.execute("""CREATE TABLE IF NOT EXISTS users( id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL)""")

connection.commit()

cursor.execute("""CREATE TABLE IF NOT EXISTS watches( id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT NOT NULL,category TEXT, price REAL NOT NULL, shape TEXT, dial TEXT, movement TEXT, water_resistance TEXT,
 glass TEXT, stock INTEGER,
 description TEXT)""")
connection.commit()

cursor.execute("""CREATE TABLE IF NOT EXISTS cart( id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
   quantity INTEGER NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id),
   FOREIGN KEY (product_id) REFERENCES watches(id)
   )
   """)
connection.commit()

cursor.execute("""CREATE TABLE IF NOT EXISTS orders( id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER, total_amount REAL, payment_reference TEXT, status TEXT DEFAULT 'PENDING',created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (user_id) REFERENCES users(id)
  
  )""")

connection.commit()

cursor.execute("""CREATE TABLE IF NOT EXISTS order_items(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 order_id INTEGER, 
 product_id INTEGER, 
 quantity INTEGER,
  price REAL, 
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES watches(id)
  )""")
connection.commit()