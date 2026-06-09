const db = require("../db");

const VALID_STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

const orderResolver = {
  Query: {
    orders: async () => {
      try {
        const [rows] = await db.query(
          "SELECT * FROM orders ORDER BY created_at DESC"
        );
        return rows;
      } catch (error) {
        throw new Error(`Gagal mengambil data order: ${error.message}`);
      }
    },
  },

  Mutation: {
    createOrder: async (_, { input }) => {
      const conn = await db.getConnection();

      try {
        const { customerName, items } = input;

        if (!customerName || customerName.trim() === "") {
          throw new Error("Nama pelanggan tidak boleh kosong");
        }
        if (!items || items.length === 0) {
          throw new Error("Order harus memiliki minimal 1 item");
        }

        await conn.beginTransaction();

        let totalPrice = 0;
        const resolvedItems = [];

        for (const item of items) {
          if (!item.productId || item.quantity <= 0) {
            throw new Error("Setiap item harus memiliki productId dan quantity yang valid");
          }

          const [productRows] = await conn.query(
            "SELECT * FROM products WHERE id = ? FOR UPDATE",
            [item.productId]
          );
          if (!productRows.length) {
            throw new Error(`Produk dengan id ${item.productId} tidak ditemukan`);
          }

          const product = productRows[0];
          if (product.stock < item.quantity) {
            throw new Error(
              `Stok produk "${product.name}" tidak cukup. Tersedia: ${product.stock}, diminta: ${item.quantity}`
            );
          }

          const subtotal = product.price * item.quantity;
          totalPrice += subtotal;
          resolvedItems.push({ product, quantity: item.quantity, subtotal });

          await conn.query(
            "UPDATE products SET stock = stock - ? WHERE id = ?",
            [item.quantity, item.productId]
          );
        }

        const [orderResult] = await conn.query(
          "INSERT INTO orders (customer_name, total_price, status) VALUES (?, ?, 'PENDING')",
          [customerName.trim(), totalPrice]
        );
        const orderId = orderResult.insertId;

        for (const item of resolvedItems) {
          await conn.query(
            "INSERT INTO order_items (order_id, product_id, quantity, subtotal) VALUES (?, ?, ?, ?)",
            [orderId, item.product.id, item.quantity, item.subtotal]
          );
        }

        await conn.commit();

        const [orderRows] = await conn.query("SELECT * FROM orders WHERE id = ?", [orderId]);
        return orderRows[0];
      } catch (err) {
        await conn.rollback();
        throw new Error(`Gagal membuat order: ${err.message}`);
      } finally {
        conn.release();
      }
    },

    updateOrderStatus: async (_, { id, status }) => {
      try {
        if (!VALID_STATUSES.includes(status)) {
          throw new Error(`Status tidak valid. Pilihan: ${VALID_STATUSES.join(", ")}`);
        }

        const [existing] = await db.query("SELECT id FROM orders WHERE id = ?", [id]);
        if (!existing.length) throw new Error(`Order dengan id ${id} tidak ditemukan`);

        await db.query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);

        const [rows] = await db.query("SELECT * FROM orders WHERE id = ?", [id]);
        return rows[0];
      } catch (error) {
        throw new Error(`Gagal mengupdate status order: ${error.message}`);
      }
    },
  },

  Order: {
    // Mapping snake_case kolom DB → camelCase field GraphQL
    customerName: (order) => order.customer_name,
    totalPrice:   (order) => order.total_price,
    createdAt:    (order) => order.created_at?.toISOString?.() || order.created_at,

    items: async (order) => {
      try {
        const [rows] = await db.query(
          "SELECT * FROM order_items WHERE order_id = ?",
          [order.id]
        );
        return rows;
      } catch (error) {
        throw new Error(`Gagal mengambil items order: ${error.message}`);
      }
    },
  },

  OrderItem: {
    product: async (item) => {
      try {
        const [rows] = await db.query(
          "SELECT * FROM products WHERE id = ?",
          [item.product_id]
        );
        return rows[0] || null;
      } catch (error) {
        throw new Error(`Gagal mengambil produk order item: ${error.message}`);
      }
    },
  },
};

module.exports = orderResolver;