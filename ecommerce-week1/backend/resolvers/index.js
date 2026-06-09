const productResolvers = require("./productResolver");
const categoryResolvers = require("./categoryResolver");
const orderResolvers = require("./orderResolver");

const resolvers = {
  Query: {
    ...productResolvers.Query,
    ...categoryResolvers.Query,
    ...orderResolvers.Query,
  },
  Mutation: {
    ...productResolvers.Mutation,
    ...categoryResolvers.Mutation,
    ...orderResolvers.Mutation,
  },
  Product: productResolvers.Product,
  Category: categoryResolvers.Category,
  Order: orderResolvers.Order,
  OrderItem: orderResolvers.OrderItem,
};

module.exports = resolvers;
