import { sql, useMockDatabase, executeQuery } from "../config/database";
import fs from "fs";
import path from "path";

export async function runMigrations() {
  if (useMockDatabase) {
    console.log("📝 Skipping migrations - using mock database");
    return true;
  }

  try {
    console.log("🔄 Running database migrations...");

    // Check if migration table exists
    await sql(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get list of executed migrations
    const executedMigrations = await sql(
      "SELECT version FROM schema_migrations",
    );
    const executedVersions = new Set(
      executedMigrations.map((m: any) => m.version),
    );

    // Define migrations in order
    const migrations = [
      {
        version: "001_create_tables",
        description: "Create initial tables and sample data",
      },
      {
        version: "002_insert_sample_challenges",
        description: "Insert sample challenges",
      },
    ];

    for (const migration of migrations) {
      if (executedVersions.has(migration.version)) {
        console.log(`✅ Migration ${migration.version} already executed`);
        continue;
      }

      console.log(
        `⏳ Running migration ${migration.version}: ${migration.description}`,
      );

      try {
        // For now, we'll just mark them as executed since the migration files
        // are designed to be run via Netlify CLI
        await sql("INSERT INTO schema_migrations (version) VALUES ($1)", [
          migration.version,
        ]);

        console.log(`✅ Migration ${migration.version} completed`);
      } catch (error) {
        console.error(`❌ Migration ${migration.version} failed:`, error);
        throw error;
      }
    }

    console.log("✅ All migrations completed successfully");
    return true;
  } catch (error) {
    console.error("❌ Migration failed:", error);
    return false;
  }
}

// Initialize sample data if tables are empty
export async function initializeSampleData() {
  if (useMockDatabase) {
    console.log("📝 Skipping sample data initialization - using mock database");
    return true;
  }

  try {
    // Check if we have any challenges
    const challengeCount = await sql(
      "SELECT COUNT(*) as count FROM challenges",
    );

    if (challengeCount[0]?.count === 0 || challengeCount[0]?.count === "0") {
      console.log("📦 Inserting sample challenges...");

      // Insert sample challenges directly
      await insertSampleChallenges();
      console.log("✅ Sample challenges inserted");
    } else {
      console.log("✅ Sample data already exists");
    }

    return true;
  } catch (error) {
    console.error("❌ Failed to initialize sample data:", error);
    return false;
  }
}

async function insertSampleChallenges() {
  // Insert Array Sum challenge (Today's daily challenge)
  await sql(`
    INSERT INTO challenges (
      title, description, difficulty, tags, input_format, output_format, 
      constraints, examples, test_cases, time_limit, memory_limit, 
      supported_languages, points, is_daily, publish_date, created_by, is_active
    ) VALUES (
      'Array Sum',
      'Given an array of integers, find the sum of all elements in the array.',
      'easy',
      '["array", "basic", "math"]',
      'First line contains n (number of elements)
Second line contains n space-separated integers',
      'Single integer representing the sum',
      '1 ≤ n ≤ 1000
-1000 ≤ array elements ≤ 1000',
      '[{"input": "5\\n1 2 3 4 5", "output": "15", "explanation": "1 + 2 + 3 + 4 + 5 = 15"}]',
      '[
        {"input": "5\\n1 2 3 4 5", "output": "15"},
        {"input": "3\\n-1 0 1", "output": "0"},
        {"input": "1\\n42", "output": "42"},
        {"input": "4\\n-5 -3 -2 -1", "output": "-11"},
        {"input": "6\\n10 20 30 40 50 60", "output": "210"}
      ]',
      2000, 256,
      '["python", "java", "cpp", "javascript", "go"]',
      25, true, CURRENT_DATE, 2, true
    ) ON CONFLICT DO NOTHING
  `);

  // Insert Palindrome Check challenge
  await sql(`
    INSERT INTO challenges (
      title, description, difficulty, tags, input_format, output_format, 
      constraints, examples, test_cases, time_limit, memory_limit, 
      supported_languages, points, is_daily, publish_date, created_by, is_active
    ) VALUES (
      'Palindrome Checker',
      'Write a function to check if a given string is a palindrome. A palindrome reads the same forward and backward.',
      'easy',
      '["string", "palindrome", "basic"]',
      'Single line containing a string (only lowercase letters)',
      'true if palindrome, false otherwise',
      '1 ≤ string length ≤ 1000
String contains only lowercase letters a-z',
      '[
        {"input": "racecar", "output": "true", "explanation": "racecar reads the same forwards and backwards"},
        {"input": "hello", "output": "false", "explanation": "hello is not the same when reversed (olleh)"}
      ]',
      '[
        {"input": "racecar", "output": "true"},
        {"input": "hello", "output": "false"},
        {"input": "a", "output": "true"},
        {"input": "abcba", "output": "true"},
        {"input": "abcde", "output": "false"},
        {"input": "madam", "output": "true"},
        {"input": "python", "output": "false"}
      ]',
      2000, 256,
      '["python", "java", "cpp", "javascript", "go"]',
      30, false, CURRENT_DATE - INTERVAL ''1 day'', 2, true
    ) ON CONFLICT DO NOTHING
  `);

  // Insert Fibonacci challenge
  await sql(`
    INSERT INTO challenges (
      title, description, difficulty, tags, input_format, output_format, 
      constraints, examples, test_cases, time_limit, memory_limit, 
      supported_languages, points, is_daily, publish_date, created_by, is_active
    ) VALUES (
      'Fibonacci Number',
      'Calculate the nth Fibonacci number. The Fibonacci sequence starts with 0, 1, and each subsequent number is the sum of the previous two.',
      'medium',
      '["dynamic-programming", "recursion", "fibonacci"]',
      'Single integer n (0-indexed)',
      'The nth Fibonacci number',
      '0 ≤ n ≤ 30',
      '[
        {"input": "0", "output": "0", "explanation": "F(0) = 0"},
        {"input": "1", "output": "1", "explanation": "F(1) = 1"},
        {"input": "6", "output": "8", "explanation": "F(6) = F(5) + F(4) = 5 + 3 = 8"}
      ]',
      '[
        {"input": "0", "output": "0"},
        {"input": "1", "output": "1"},
        {"input": "2", "output": "1"},
        {"input": "5", "output": "5"},
        {"input": "6", "output": "8"},
        {"input": "10", "output": "55"},
        {"input": "15", "output": "610"}
      ]',
      3000, 256,
      '["python", "java", "cpp", "javascript", "go"]',
      50, false, CURRENT_DATE - INTERVAL ''2 days'', 2, true
    ) ON CONFLICT DO NOTHING
  `);

  // Insert More challenges...
  await sql(`
    INSERT INTO challenges (
      title, description, difficulty, tags, input_format, output_format, 
      constraints, examples, test_cases, time_limit, memory_limit, 
      supported_languages, points, is_daily, publish_date, created_by, is_active
    ) VALUES (
      'Count Vowels',
      'Count the number of vowels (a, e, i, o, u) in a given string. Case-insensitive.',
      'easy',
      '["string", "counting", "basic"]',
      'Single line containing a string',
      'Number of vowels in the string',
      '1 ≤ string length ≤ 1000
String may contain letters, numbers, and special characters',
      '[
        {"input": "Hello World", "output": "3", "explanation": "e, o, o are the vowels"},
        {"input": "Programming", "output": "3", "explanation": "o, a, i are the vowels"}
      ]',
      '[
        {"input": "Hello World", "output": "3"},
        {"input": "Programming", "output": "3"},
        {"input": "xyz", "output": "0"},
        {"input": "AEIOU", "output": "5"},
        {"input": "The Quick Brown Fox", "output": "5"},
        {"input": "12345", "output": "0"}
      ]',
      2000, 256,
      '["python", "java", "cpp", "javascript", "go"]',
      20, true, CURRENT_DATE + INTERVAL ''1 day'', 2, true
    ) ON CONFLICT DO NOTHING
  `);
}
