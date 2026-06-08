// Status order yang valid dan urutan transisinya
const VALID_STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

const ALLOWED_TRANSITIONS = {
  PENDING:    ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED",    "CANCELLED"],
  SHIPPED:    ["DELIVERED"],
  DELIVERED:  [],   
  CANCELLED:  [],   
};

const orderResolver = {
  Query: {
    // Ambil semua order (bisa difilter berdasarkan status)
    orders: async (_, { status }, { db }) => {
      try {
        let query = `
          SELECT 
            o.*,
            JSON_ARRAYAGG(
              JSON_OBJECT(
                'id',         oi.id,
                'product_id', oi.product_id,
                'product_name', p.name,
                'quantity',   oi.quantity,
                'price',      oi.price
              )
            ) AS items
          FROM orders o
          LEFT JOIN order_items oi ON o.id = oi.order_id
          LEFT JOIN products p ON oi.product_id = p.id
        `;
        const params = [];

        if (status) {
          if (!VALID_STATUSES.includes(status)) {
            throw new Error(`Status tidak valid. Pilihan: ${VALID_STATUSES.join(", ")}`);
          }
          query += ` WHERE o.status = ?`;
          params.push(status);
        }

        query += ` GROUP BY o.id ORDER BY o.created_at DESC`;

        const [rows] = await db.query(query, params);

        // Parse JSON items dari database
        return rows.map((row) => ({
          ...row,
          items: typeof row.items === "string" ? JSON.parse(row.items) : row.items,
        }));
      } catch (error) {
        throw new Error(`Gagal mengambil data order: ${error.message}`);
      }
    },

    // Ambil satu order berdasarkan ID
    order: async (_, { id }, { db }) => {
      try {
        const [rows] = await db.query(
          `SELECT 
            o.*,
            JSON_ARRAYAGG(
              JSON_OBJECT(
                'id',           oi.id,
                'product_id',   oi.product_id,
                'product_name', p.name,
                'quantity',     oi.quantity,
                'price',        oi.price
              )
            ) AS items
          FROM orders o
          LEFT JOIN order_items oi ON o.id = oi.order_id
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE o.id = ?
          GROUP BY o.id`,
          [id]
        );

        if (rows.length === 0) {
          throw new Error(`Order dengan ID ${id} tidak ditemukan`);
        }

        const row = rows[0];
        return {
          ...row,
          items: typeof row.items === "string" ? JSON.parse(row.items) : row.items,
        };
      } catch (error) {
        throw new Error(`Gagal mengambil order: ${error.message}`);
      }
    },
  },

  Mutation: {
    // Buat order baru — menggunakan transaction agar stok & order konsisten
    createOrder: async (_, { customer_name, customer_email, items }, { db }) => {
      const connection = await db.getConnection();

      try {
        // Validasi input dasar
        if (!customer_name || customer_name.trim() === "") {
          throw new Error("Nama pelanggan tidak boleh kosong");
        }
        if (!customer_email || !customer_email.includes("@")) {
          throw new Error("Email pelanggan tidak valid");
        }
        if (!items || items.length === 0) {
          throw new Error("Order harus memiliki minimal 1 item");
        }

        // Mulai transaction
        await connection.beginTransaction();

        let total_price = 0;
        const orderItemsToInsert = [];

        // Cek stok dan hitung total untuk setiap item
        for (const item of items) {
          if (!item.product_id || item.quantity <= 0) {
            throw new Error("Setiap item harus memiliki product_id dan quantity yang valid");
          }

          // Kunci baris produk agar tidak ada race condition (stok tidak menjadi minus)
          const [products] = await connection.query(
            `SELECT id, name, price, stock FROM products WHERE id = ? FOR UPDATE`,
            [item.product_id]
          );

          if (products.length === 0) {
            throw new Error(`Produk dengan ID ${item.product_id} tidak ditemukan`);
          }

          const product = products[0];

          if (product.stock < item.quantity) {
            throw new Error(
              `Stok produk "${product.name}" tidak cukup. Stok tersedia: ${product.stock}, diminta: ${item.quantity}`
            );
          }

          // Kurangi stok
          await connection.query(
            `UPDATE products SET stock = stock - ? WHERE id = ?`,
            [item.quantity, item.product_id]
          );

          total_price += product.price * item.quantity;
          orderItemsToInsert.push({
            product_id: item.product_id,
            quantity:   item.quantity,
            price:      product.price,
          });
        }

        // Simpan order ke tabel orders
        const [orderResult] = await connection.query(
          `INSERT INTO orders (customer_name, customer_email, total_price, status) VALUES (?, ?, ?, 'PENDING')`,
          [customer_name.trim(), customer_email.trim(), total_price]
        );
        const orderId = orderResult.insertId;

        // Simpan setiap item ke tabel order_items
        for (const oi of orderItemsToInsert) {
          await connection.query(
            `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`,
            [orderId, oi.product_id, oi.quantity, oi.price]
          );
        }

        // Semua berhasil → commit
        await connection.commit();

        // Kembalikan order yang baru dibuat lengkap dengan items
        const [newOrder] = await connection.query(
          `SELECT 
            o.*,
            JSON_ARRAYAGG(
              JSON_OBJECT(
                'id',           oi.id,
                'product_id',   oi.product_id,
                'product_name', p.name,
                'quantity',     oi.quantity,
                'price',        oi.price
              )
            ) AS items
          FROM orders o
          LEFT JOIN order_items oi ON o.id = oi.order_id
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE o.id = ?
          GROUP BY o.id`,
          [orderId]
        );

        const row = newOrder[0];
        return {
          ...row,
          items: typeof row.items === "string" ? JSON.parse(row.items) : row.items,
        };
      } catch (error) {
        // Ada error → rollback semua perubahan
        await connection.rollback();
        throw new Error(`Gagal membuat order: ${error.message}`);
      } finally {
        // Selalu lepas connection kembali ke pool
        connection.release();
      }
    },

    // Update status order
    updateOrderStatus: async (_, { id, status }, { db }) => {
      try {
        if (!VALID_STATUSES.includes(status)) {
          throw new Error(`Status tidak valid. Pilihan: ${VALID_STATUSES.join(", ")}`);
        }

        const [existing] = await db.query(`SELECT id, status FROM orders WHERE id = ?`, [id]);
        if (existing.length === 0) {
          throw new Error(`Order dengan ID ${id} tidak ditemukan`);
        }

        const currentStatus = existing[0].status;

        // Cek apakah transisi status diperbolehkan
        const allowedNext = ALLOWED_TRANSITIONS[currentStatus];
        if (!allowedNext.includes(status)) {
          if (allowedNext.length === 0) {
            throw new Error(
              `Order dengan status "${currentStatus}" sudah final dan tidak bisa diubah`
            );
          }
          throw new Error(
            `Tidak bisa mengubah status dari "${currentStatus}" ke "${status}". Status yang diperbolehkan: ${allowedNext.join(", ")}`
          );
        }

        await db.query(`UPDATE orders SET status = ? WHERE id = ?`, [status, id]);

        // Kembalikan order yang sudah diupdate
        const [updated] = await db.query(
          `SELECT 
            o.*,
            JSON_ARRAYAGG(
              JSON_OBJECT(
                'id',           oi.id,
                'product_id',   oi.product_id,
                'product_name', p.name,
                'quantity',     oi.quantity,
                'price',        oi.price
              )
            ) AS items
          FROM orders o
          LEFT JOIN order_items oi ON o.id = oi.order_id
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE o.id = ?
          GROUP BY o.id`,
          [id]
        );

        const row = updated[0];
        return {
          ...row,
          items: typeof row.items === "string" ? JSON.parse(row.items) : row.items,
        };
      } catch (error) {
        throw new Error(`Gagal mengupdate status order: ${error.message}`);
      }
    },
  },
};

module.exports = orderResolver;