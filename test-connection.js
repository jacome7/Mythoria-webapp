// Test database connection
const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function testConnection() {
  console.log("🔍 Testing connection with these settings:");
  console.log("Host:", process.env.DB_HOST);
  console.log("Port:", process.env.DB_PORT);
  console.log("User:", process.env.DB_USER);
  console.log("Database:", process.env.DB_NAME);
  console.log("Password:", process.env.DB_PASSWORD ? "[SET]" : "[NOT SET]");
  
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432"),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
      rejectUnauthorized: false, // For Google Cloud SQL
    },
    connectionTimeoutMillis: 10000, // 10 seconds timeout
  });

  try {
    console.log("🔄 Attempting to connect...");
    const client = await pool.connect();
    console.log("✅ Successfully connected to Google Cloud PostgreSQL!");
    
    // Test query
    const result = await client.query("SELECT version()");
    console.log("📊 Database version:", result.rows[0].version);
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error("❌ Connection failed:");
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    
    if (error.code === 'ETIMEDOUT') {
      console.log("\n🔧 Troubleshooting steps:");
      console.log("1. Check if your IP is authorized in Google Cloud SQL");
      console.log("2. Verify the instance is running");
      console.log("3. Check firewall settings");
    } else if (error.code === 'ENOTFOUND') {
      console.log("\n🔧 The host could not be found. Check the DB_HOST value.");
    } else if (error.message.includes('password authentication failed')) {
      console.log("\n🔧 Check your username and password.");
    }
  }
}

testConnection();
