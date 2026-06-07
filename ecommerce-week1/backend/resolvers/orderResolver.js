const db = require("../db");

const orderResolvers = {
  Query: {
    orders: async () => {
      const [rows] = await db.query("SELECT * FROM orders ORDER BY created_at DESC");
      return rows;
    },
  },

  Mutation: {
    createOrder: async (_, { input }) => {
      const { customerName, items } = input;
      const conn = await db.getConnection();

      try {
        await conn.beginTransaction();

        let totalPrice = 0;
        const resolvedItems = [];

        for (const item of items) {
          const [productRows] = await conn.query(
            "SELECT * FROM products WHERE id = ?",
            [item.productId]
          );
          if (!productRows.length) throw new Error(`Product ${item.productId} not found`);
          const product = productRows[0];
          if (product.stock < item.quantity)
            throw new Error(`Insufficient stock for product: ${product.name}`);

          const subtotal = product.price * item.quantity;
          totalPrice += subtotal;
          resolvedItems.push({ product, quantity: item.quantity, subtotal });

          // Deduct stock
          await conn.query(
            "UPDATE products SET stock = stock - ? WHERE id = ?",
            [item.quantity, item.productId]
          );
        }

        const [orderResult] = await conn.query(
          "INSERT INTO orders (customer_name, total_price, status) VALUES (?, ?, 'PENDING')",
          [customerName, totalPrice]
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
        throw err;
      } finally {
        conn.release();
      }
    },

    updateOrderStatus: async (_, { id, status }) => {
      const validStatuses = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
      if (!validStatuses.includes(status))
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);

      await db.query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
      const [rows] = await db.query("SELECT * FROM orders WHERE id = ?", [id]);
      if (!rows.length) throw new Error(`Order with id ${id} not found`);
      return rows[0];
    },
  },

  Order: {
    items: async (order) => {
      const [rows] = await db.query(
        "SELECT * FROM order_items WHERE order_id = ?",
        [order.id]
      );
      return rows;
    },
    createdAt: (order) => order.created_at?.toISOString?.() || order.created_at,
  },

  OrderItem: {
    product: async (item) => {
      const [rows] = await db.query("SELECT * FROM products WHERE id = ?", [item.product_id]);
      return rows[0] || null;
    },
  },
};

module.exports = orderResolvers;
