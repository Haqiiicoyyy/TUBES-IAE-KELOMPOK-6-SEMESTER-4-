const db = require("../db");

const categoryResolvers = {
  Query: {
    categories: async () => {
      const [rows] = await db.query("SELECT * FROM categories");
      return rows;
    },
  },

  Mutation: {
    createCategory: async (_, { input }) => {
      const { name } = input;
      const [result] = await db.query(
        "INSERT INTO categories (name) VALUES (?)",
        [name]
      );
      const [rows] = await db.query("SELECT * FROM categories WHERE id = ?", [result.insertId]);
      return rows[0];
    },
  },

  Category: {
    products: async (category) => {
      const [rows] = await db.query(
        "SELECT * FROM products WHERE category_id = ?",
        [category.id]
      );
      return rows;
    },
  },
};

module.exports = categoryResolvers;
