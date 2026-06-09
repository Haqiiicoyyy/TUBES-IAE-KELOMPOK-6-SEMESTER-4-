const db = require("../db");

const productResolver = {
  Query: {
    products: async () => {
      try {
        const [rows] = await db.query("SELECT * FROM products");
        return rows;
      } catch (error) {
        throw new Error(`Gagal mengambil data produk: ${error.message}`);
      }
    },

    product: async (_, { id }) => {
      try {
        const [rows] = await db.query("SELECT * FROM products WHERE id = ?", [id]);
        if (!rows.length) throw new Error(`Produk dengan id ${id} tidak ditemukan`);
        return rows[0];
      } catch (error) {
        throw new Error(`Gagal mengambil produk: ${error.message}`);
      }
    },
  },

  Mutation: {
    createProduct: async (_, { input }) => {
      try {
        const { name, description, price, stock, categoryId } = input;

        if (!name || name.trim() === "") {
          throw new Error("Nama produk tidak boleh kosong");
        }
        if (price < 0) throw new Error("Harga produk tidak boleh negatif");
        if (stock < 0) throw new Error("Stok produk tidak boleh negatif");

        if (categoryId) {
          const [cat] = await db.query("SELECT id FROM categories WHERE id = ?", [categoryId]);
          if (!cat.length) throw new Error(`Kategori dengan ID ${categoryId} tidak ditemukan`);
        }

        const [result] = await db.query(
          "INSERT INTO products (name, description, price, stock, category_id) VALUES (?, ?, ?, ?, ?)",
          [name.trim(), description || null, price, stock, categoryId || null]
        );

        const [rows] = await db.query("SELECT * FROM products WHERE id = ?", [result.insertId]);
        return rows[0];
      } catch (error) {
        throw new Error(`Gagal membuat produk: ${error.message}`);
      }
    },

    updateProduct: async (_, { id, input }) => {
      try {
        const [existing] = await db.query("SELECT id FROM products WHERE id = ?", [id]);
        if (!existing.length) throw new Error(`Produk dengan id ${id} tidak ditemukan`);

        if (input.price !== undefined && input.price < 0) {
          throw new Error("Harga produk tidak boleh negatif");
        }
        if (input.stock !== undefined && input.stock < 0) {
          throw new Error("Stok produk tidak boleh negatif");
        }

        const fields = [];
        const values = [];

        if (input.name !== undefined)        { fields.push("name = ?");        values.push(input.name.trim()); }
        if (input.description !== undefined) { fields.push("description = ?"); values.push(input.description); }
        if (input.price !== undefined)       { fields.push("price = ?");       values.push(input.price); }
        if (input.stock !== undefined)       { fields.push("stock = ?");       values.push(input.stock); }
        if (input.categoryId !== undefined)  { fields.push("category_id = ?"); values.push(input.categoryId); }

        if (!fields.length) throw new Error("Tidak ada field yang diperbarui");

        values.push(id);
        await db.query(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`, values);

        const [rows] = await db.query("SELECT * FROM products WHERE id = ?", [id]);
        return rows[0];
      } catch (error) {
        throw new Error(`Gagal mengupdate produk: ${error.message}`);
      }
    },

    deleteProduct: async (_, { id }) => {
      try {
        const [existing] = await db.query("SELECT id FROM products WHERE id = ?", [id]);
        if (!existing.length) throw new Error(`Produk dengan id ${id} tidak ditemukan`);

        const [result] = await db.query("DELETE FROM products WHERE id = ?", [id]);
        return result.affectedRows > 0;
      } catch (error) {
        throw new Error(`Gagal menghapus produk: ${error.message}`);
      }
    },
  },

  Product: {
    category: async (product) => {
      try {
        if (!product.category_id) return null;
        const [rows] = await db.query("SELECT * FROM categories WHERE id = ?", [product.category_id]);
        return rows[0] || null;
      } catch (error) {
        throw new Error(`Gagal mengambil kategori produk: ${error.message}`);
      }
    },
  },
};

module.exports = productResolver;