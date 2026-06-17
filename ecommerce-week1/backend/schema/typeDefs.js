const { gql } = require("graphql-tag");

const typeDefs = gql`
  # ─── PRODUCT ──────────────────────────────────────────────
  type Product {
    id: ID!
    name: String!
    description: String
    price: Float!
    stock: Int!
    category: Category
    createdAt: String
  }

  input CreateProductInput {
    name: String!
    description: String
    price: Float!
    stock: Int!
    categoryId: ID!
  }

  input UpdateProductInput {
    name: String
    description: String
    price: Float
    stock: Int
    categoryId: ID
  }

  # ─── CATEGORY ─────────────────────────────────────────────
  type Category {
    id: ID!
    name: String!
    products: [Product]
  }

  input CreateCategoryInput {
    name: String!
  }

  # ─── ORDER ────────────────────────────────────────────────
  type Order {
    id: ID!
    customerName: String!
    shippingAddress: String!
    totalPrice: Float!
    status: String!
    items: [OrderItem]
    createdAt: String
  }

  type OrderItem {
    id: ID!
    product: Product
    quantity: Int!
    subtotal: Float!
  }

  input OrderItemInput {
    productId: ID!
    quantity: Int!
  }

  input CreateOrderInput {
    customerName: String!
    shippingAddress: String!
    items: [OrderItemInput!]!
  }

  # ─── QUERY ────────────────────────────────────────────────
  type Query {
    products: [Product]
    product(id: ID!): Product
    categories: [Category]
    orders: [Order]
  }

  # ─── MUTATION ─────────────────────────────────────────────
  type Mutation {
    createProduct(input: CreateProductInput!): Product
    updateProduct(id: ID!, input: UpdateProductInput!): Product
    deleteProduct(id: ID!): Boolean

    createCategory(input: CreateCategoryInput!): Category

    createOrder(input: CreateOrderInput!): Order
    updateOrderStatus(id: ID!, status: String!): Order
  }
`;

module.exports = typeDefs;
