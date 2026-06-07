const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
require("dotenv").config();

const typeDefs = require("./schema/typeDefs");
const resolvers = require("./resolvers");
const db = require("./db");

async function startServer() {
  // Test DB connection
  try {
    const conn = await db.getConnection();
    console.log("✅ Connected to MySQL database");
    conn.release();
  } catch (err) {
    console.error("❌ Failed to connect to MySQL:", err.message);
    process.exit(1);
  }

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    formatError: (formattedError, error) => {
      console.error("GraphQL Error:", formattedError.message);
      return {
        message: formattedError.message,
        path: formattedError.path,
      };
    },
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: process.env.PORT || 4000 },
  });

  console.log(`🚀 GraphQL Server ready at: ${url}`);
  console.log(`📊 Apollo Sandbox: ${url}`);
}

startServer();
