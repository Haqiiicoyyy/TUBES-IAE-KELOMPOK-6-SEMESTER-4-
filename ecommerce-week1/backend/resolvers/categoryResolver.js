const categoryResolver = {
  Query: {
    // Ambil semua kategori beserta jumlah produk di dalamnya
    categories: async (_, __, { db }) => {
      try {
        const [rows] = await db.query(`
          SELECT 
            c.*,
            COUNT(p.id) AS product_count
          FROM categories c
          LEFT JOIN products p ON c.id = p.category_id
          GROUP BY c.id
          ORDER BY c.name ASC
        `);
        return rows;
      } catch (error) {
        throw new Error(`Gagal mengambil data kategori: ${error.message}`);
      }
    },

    // Ambil satu kategori berdasarkan ID
    category: async (_, { id }, { db }) => {
      try {
        const [rows] = await db.query(
          `SELECT c.*, COUNT(p.id) AS product_count
           FROM categories c
           LEFT JOIN products p ON c.id = p.category_id
           WHERE c.id = ?
           GROUP BY c.id`,
          [id]
        );

        if (rows.length === 0) {
          throw new Error(`Kategori dengan ID ${id} tidak ditemukan`);
        }

        return rows[0];
      } catch (error) {
        throw new Error(`Gagal mengambil kategori: ${error.message}`);
      }
    },
  },

  Mutation: {
    // Tambah kategori baru
    createCategory: async (_, { name, description }, { db }) => {
      try {
        // Validasi input
        if (!name || name.trim() === "") {
          throw new Error("Nama kategori tidak boleh kosong");
        }

        // Cek duplikat nama kategori
        const [existing] = await db.query(
          `SELECT id FROM categories WHERE LOWER(name) = LOWER(?)`,
          [name.trim()]
        );
        if (existing.length > 0) {
          throw new Error(`Kategori dengan nama "${name}" sudah ada`);
        }

        const [result] = await db.query(
          `INSERT INTO categories (name, description) VALUES (?, ?)`,
          [name.trim(), description || null]
        );

        const [newCategory] = await db.query(
          `SELECT c.*, COUNT(p.id) AS product_count
           FROM categories c
           LEFT JOIN products p ON c.id = p.category_id
           WHERE c.id = ?
           GROUP BY c.id`,
          [result.insertId]
        );

        return newCategory[0];
      } catch (error) {
        throw new Error(`Gagal membuat kategori: ${error.message}`);
      }
    },

    // Update kategori
    updateCategory: async (_, { id, name, description }, { db }) => {
      try {
        const [existing] = await db.query(`SELECT id FROM categories WHERE id = ?`, [id]);
        if (existing.length === 0) {
          throw new Error(`Kategori dengan ID ${id} tidak ditemukan`);
        }

        // Cek duplikat nama (kecuali nama milik dirinya sendiri)
        if (name) {
          const [duplicate] = await db.query(
            `SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND id != ?`,
            [name.trim(), id]
          );
          if (duplicate.length > 0) {
            throw new Error(`Kategori dengan nama "${name}" sudah ada`);
          }
        }

        const fields = [];
        const values = [];

        if (name !== undefined) { fields.push("name = ?"); values.push(name.trim()); }
        if (description !== undefined) { fields.push("description = ?"); values.push(description); }

        if (fields.length === 0) {
          throw new Error("Tidak ada field yang diperbarui");
        }

        values.push(id);
        await db.query(`UPDATE categories SET ${fields.join(", ")} WHERE id = ?`, values);

        const [updated] = await db.query(
          `SELECT c.*, COUNT(p.id) AS product_count
           FROM categories c
           LEFT JOIN products p ON c.id = p.category_id
           WHERE c.id = ?
           GROUP BY c.id`,
          [id]
        );

        return updated[0];
      } catch (error) {
        throw new Error(`Gagal mengupdate kategori: ${error.message}`);
      }
    },

    // Hapus kategori
    deleteCategory: async (_, { id }, { db }) => {
      try {
        const [existing] = await db.query(`SELECT id FROM categories WHERE id = ?`, [id]);
        if (existing.length === 0) {
          throw new Error(`Kategori dengan ID ${id} tidak ditemukan`);
        }

        // Cek apakah kategori masih digunakan oleh produk
        const [products] = await db.query(
          `SELECT COUNT(*) AS count FROM products WHERE category_id = ?`,
          [id]
        );
        if (products[0].count > 0) {
          throw new Error(
            `Tidak bisa menghapus kategori. Masih ada ${products[0].count} produk yang menggunakan kategori ini`
          );
        }

        await db.query(`DELETE FROM categories WHERE id = ?`, [id]);
        return true;
      } catch (error) {
        throw new Error(`Gagal menghapus kategori: ${error.message}`);
      }
    },
  },
};

module.exports = categoryResolver;