const db = require("../db");

const categoryResolver = {
  Query: {
    categories: async () => {
      try {
        const [rows] = await db.query("SELECT * FROM categories");
        return rows;
      } catch (error) {
        throw new Error(`Gagal mengambil data kategori: ${error.message}`);
      }
    },
  },

  Mutation: {
    createCategory: async (_, { input }) => {
      try {
        const { name } = input;

        if (!name || name.trim() === "") {
          throw new Error("Nama kategori tidak boleh kosong");
        }

        const [existing] = await db.query(
          "SELECT id FROM categories WHERE LOWER(name) = LOWER(?)",
          [name.trim()]
        );
        if (existing.length > 0) {
          throw new Error(`Kategori dengan nama "${name}" sudah ada`);
        }

        const [result] = await db.query(
          "INSERT INTO categories (name) VALUES (?)",
          [name.trim()]
        );

        const [rows] = await db.query("SELECT * FROM categories WHERE id = ?", [result.insertId]);
        return rows[0];
      } catch (error) {
        throw new Error(`Gagal membuat kategori: ${error.message}`);
      }
    },
  },

  Category: {
    products: async (category) => {
      try {
        const [rows] = await db.query(
          "SELECT * FROM products WHERE category_id = ?",
          [category.id]
        );
        return rows;
      } catch (error) {
        throw new Error(`Gagal mengambil produk kategori: ${error.message}`);
      }
    },
  },
};

module.exports = categoryResolver;