const productResolver = {
  Query: {
    // Ambil semua produk (bisa difilter berdasarkan category_id)
    products: async (_, { category_id }, { db }) => {
      try {
        let query = `
          SELECT p.*, c.name AS category_name
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
        `;
        const params = [];

        if (category_id) {
          query += ` WHERE p.category_id = ?`;
          params.push(category_id);
        }

        query += ` ORDER BY p.created_at DESC`;

        const [rows] = await db.query(query, params);
        return rows;
      } catch (error) {
        throw new Error(`Gagal mengambil data produk: ${error.message}`);
      }
    },

    // Ambil satu produk berdasarkan ID
    product: async (_, { id }, { db }) => {
      try {
        const [rows] = await db.query(
          `SELECT p.*, c.name AS category_name
           FROM products p
           LEFT JOIN categories c ON p.category_id = c.id
           WHERE p.id = ?`,
          [id]
        );

        if (rows.length === 0) {
          throw new Error(`Produk dengan ID ${id} tidak ditemukan`);
        }

        return rows[0];
      } catch (error) {
        throw new Error(`Gagal mengambil produk: ${error.message}`);
      }
    },
  },

  Mutation: {
    // Tambah produk baru
    createProduct: async (_, { name, price, stock, category_id, description }, { db }) => {
      try {
        // Validasi input
        if (!name || name.trim() === "") {
          throw new Error("Nama produk tidak boleh kosong");
        }
        if (price === undefined || price < 0) {
          throw new Error("Harga produk tidak boleh negatif");
        }
        if (stock === undefined || stock < 0) {
          throw new Error("Stok produk tidak boleh negatif");
        }

        // Cek apakah category_id valid (jika diberikan)
        if (category_id) {
          const [cat] = await db.query(`SELECT id FROM categories WHERE id = ?`, [category_id]);
          if (cat.length === 0) {
            throw new Error(`Kategori dengan ID ${category_id} tidak ditemukan`);
          }
        }

        const [result] = await db.query(
          `INSERT INTO products (name, price, stock, category_id, description) VALUES (?, ?, ?, ?, ?)`,
          [name.trim(), price, stock, category_id || null, description || null]
        );

        // Kembalikan produk yang baru dibuat
        const [newProduct] = await db.query(
          `SELECT p.*, c.name AS category_name
           FROM products p
           LEFT JOIN categories c ON p.category_id = c.id
           WHERE p.id = ?`,
          [result.insertId]
        );

        return newProduct[0];
      } catch (error) {
        throw new Error(`Gagal membuat produk: ${error.message}`);
      }
    },

    // Update data produk
    updateProduct: async (_, { id, name, price, stock, category_id, description }, { db }) => {
      try {
        // Cek apakah produk ada
        const [existing] = await db.query(`SELECT id FROM products WHERE id = ?`, [id]);
        if (existing.length === 0) {
          throw new Error(`Produk dengan ID ${id} tidak ditemukan`);
        }

        // Validasi nilai jika diberikan
        if (price !== undefined && price < 0) {
          throw new Error("Harga produk tidak boleh negatif");
        }
        if (stock !== undefined && stock < 0) {
          throw new Error("Stok produk tidak boleh negatif");
        }

        // Bangun query update secara dinamis (hanya field yang dikirim)
        const fields = [];
        const values = [];

        if (name !== undefined) { fields.push("name = ?"); values.push(name.trim()); }
        if (price !== undefined) { fields.push("price = ?"); values.push(price); }
        if (stock !== undefined) { fields.push("stock = ?"); values.push(stock); }
        if (category_id !== undefined) { fields.push("category_id = ?"); values.push(category_id); }
        if (description !== undefined) { fields.push("description = ?"); values.push(description); }

        if (fields.length === 0) {
          throw new Error("Tidak ada field yang diperbarui");
        }

        values.push(id);
        await db.query(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`, values);

        // Kembalikan produk yang sudah diupdate
        const [updated] = await db.query(
          `SELECT p.*, c.name AS category_name
           FROM products p
           LEFT JOIN categories c ON p.category_id = c.id
           WHERE p.id = ?`,
          [id]
        );

        return updated[0];
      } catch (error) {
        throw new Error(`Gagal mengupdate produk: ${error.message}`);
      }
    },

    // Hapus produk
    deleteProduct: async (_, { id }, { db }) => {
      try {
        const [existing] = await db.query(`SELECT id FROM products WHERE id = ?`, [id]);
        if (existing.length === 0) {
          throw new Error(`Produk dengan ID ${id} tidak ditemukan`);
        }

        await db.query(`DELETE FROM products WHERE id = ?`, [id]);
        return true;
      } catch (error) {
        throw new Error(`Gagal menghapus produk: ${error.message}`);
      }
    },
  },
};

module.exports = productResolver;