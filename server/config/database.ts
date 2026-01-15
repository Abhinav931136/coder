import { MockDatabase } from "./mock-database";

let sql: any = null;
let useMockDatabase = false;

// Try to initialize Netlify Neon, fallback to mock if not available
try {
  const { neon } = require("@netlify/neon");
  sql = neon();
  console.log("📡 Using Netlify Database");
} catch (error) {
  console.log(
    "⚠️  Netlify Database not available, using mock data for development",
  );
  useMockDatabase = true;
}

export { sql, useMockDatabase };

// Test database connection
export async function testConnection() {
  if (useMockDatabase) {
    return await MockDatabase.testConnection();
  }

  try {
    const result = await sql("SELECT 1 as test");
    console.log("✅ Netlify Database connected successfully");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}

// Execute query with error handling
export async function executeQuery(query: string, params: any[] = []) {
  if (useMockDatabase) {
    return await MockDatabase.executeQuery(query, params);
  }

  try {
    // For Neon, we need to handle parameters differently
    // Convert positional parameters to Neon format
    let processedQuery = query;
    let processedParams = params;

    // Replace MySQL ? placeholders with PostgreSQL $1, $2, etc.
    let paramIndex = 1;
    processedQuery = query.replace(/\?/g, () => `$${paramIndex++}`);

    const rows = await sql(processedQuery, processedParams);
    return { success: true, data: rows };
  } catch (error) {
    console.error("Database query error:", error);
    return { success: false, error: error };
  }
}

// Get single row
export async function getOne(query: string, params: any[] = []) {
  if (useMockDatabase) {
    return await MockDatabase.getOne(query, params);
  }

  const result = await executeQuery(query, params);
  if (result.success && Array.isArray(result.data)) {
    return result.data[0] || null;
  }
  return null;
}

// Get multiple rows
export async function getMany(query: string, params: any[] = []) {
  const result = await executeQuery(query, params);
  if (result.success && Array.isArray(result.data)) {
    return result.data;
  }
  return [];
}

// Insert and get ID (PostgreSQL uses RETURNING clause)
export async function insertAndGetId(query: string, params: any[] = []) {
  if (useMockDatabase) {
    return await MockDatabase.insertAndGetId(query, params);
  }

  try {
    // Add RETURNING id to the query if not present
    let insertQuery = query;
    if (!query.toLowerCase().includes("returning")) {
      insertQuery = query + " RETURNING id";
    }

    let paramIndex = 1;
    const processedQuery = insertQuery.replace(/\?/g, () => `$${paramIndex++}`);

    const result = await sql(processedQuery, params);
    return {
      success: true,
      insertId:
        Array.isArray(result) && result.length > 0 ? result[0].id : null,
    };
  } catch (error) {
    console.error("Insert query error:", error);
    return { success: false, error: error };
  }
}

// Helper function to convert MySQL-style queries to PostgreSQL
export function convertMySQLToPostgreSQL(query: string): string {
  return (
    query
      // Replace AUTO_INCREMENT with SERIAL
      .replace(/AUTO_INCREMENT/gi, "SERIAL")
      // Replace CURDATE() with CURRENT_DATE
      .replace(/CURDATE\(\)/gi, "CURRENT_DATE")
      // Replace NOW() with CURRENT_TIMESTAMP
      .replace(/NOW\(\)/gi, "CURRENT_TIMESTAMP")
      // Replace DATE_SUB with INTERVAL subtraction
      .replace(
        /DATE_SUB\(([^,]+),\s*INTERVAL\s+(\d+)\s+(\w+)\)/gi,
        "($1 - INTERVAL '$2 $3')",
      )
      // Replace DATE_ADD with INTERVAL addition
      .replace(
        /DATE_ADD\(([^,]+),\s*INTERVAL\s+(\d+)\s+(\w+)\)/gi,
        "($1 + INTERVAL '$2 $3')",
      )
      // Replace LIMIT ? OFFSET ? with LIMIT $1 OFFSET $2
      .replace(/LIMIT\s+\?\s+OFFSET\s+\?/gi, "LIMIT $1 OFFSET $2")
  );
}

// Initialize database with migrations
export async function initializeDatabase() {
  try {
    console.log("🔄 Initializing database...");

    // Check if tables exist
    const tablesExist = await sql(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      ) as exists
    `);

    if (!tablesExist[0]?.exists) {
      console.log("📦 Creating database tables...");

      // Read and execute migration files would go here
      // For now, we'll assume they're run via Netlify
      console.log("⚠️  Please run database migrations via Netlify CLI");
      console.log("   Run: netlify dev (this will auto-provision database)");
    } else {
      console.log("✅ Database tables already exist");
    }

    return true;
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    return false;
  }
}
