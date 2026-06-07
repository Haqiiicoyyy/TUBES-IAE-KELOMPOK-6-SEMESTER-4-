const db = require("../db");

const productResolvers = {
  Query: {
    products: async () => {
      const [rows] = await db.query("SELECT * FROM products");
      return rows;
    },

    product: async (_, { id }) => {
      const [rows] = await db.query("SELECT * FROM products WHERE id = ?", [id]);
      if (!rows.length) throw new Error(`Product with id ${id} not found`);
      return rows[0];
    },
  },

  Mutation: {
    createProduct: async (_, { input }) => {
      const { name, description, price, stock, categoryId } = input;
      const [result] = await db.query(
        "INSERT INTO products (name, description, price, stock, category_id) VALUES (?, ?, ?, ?, ?)",
        [name, description, price, stock, categoryId]
      );
      const [rows] = await db.query("SELECT * FROM products WHERE id = ?", [result.insertId]);
      return rows[0];
    },

    updateProduct: async (_, { id, input }) => {
      const fields = [];
      const values = [];

      if (input.name !== undefined) { fields.push("name = ?"); values.push(input.name); }
      if (input.description !== undefined) { fields.push("description = ?"); values.push(input.description); }
      if (input.price !== undefined) { fields.push("price = ?"); values.push(input.price); }
      if (input.stock !== undefined) { fields.push("stock = ?"); values.push(input.stock); }
      if (input.categoryId !== undefined) { fields.push("category_id = ?"); values.push(input.categoryId); }

      if (!fields.length) throw new Error("No fields to update");

      values.push(id);
      await db.query(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`, values);

      const [rows] = await db.query("SELECT * FROM products WHERE id = ?", [id]);
      if (!rows.length) throw new Error(`Product with id ${id} not found`);
      return rows[0];
    },

    deleteProduct: async (_, { id }) => {
      const [result] = await db.query("DELETE FROM products WHERE id = ?", [id]);
      return result.affectedRows > 0;
    },
  },

  Product: {
    category: async (product) => {
      const categoryId = product.category_id;
      if (!categoryId) return null;
      const [rows] = await db.query("SELECT * FROM categories WHERE id = ?", [categoryId]);
      return rows[0] || null;
    },
  },
};

module.exports = productResolvers;
