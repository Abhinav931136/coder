import { MongoClient, Db, Collection } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

// Lightweight in-memory collection used when MONGODB_URI is not provided
class InMemoryCollection<T extends Record<string, any> = any> {
  name: string;
  docs: any[] = [];

  constructor(name: string) {
    this.name = name;
  }

  async createIndexes(_indexes: any[]) {
    // noop for in-memory
    return [];
  }

  async countDocuments(filter: any = {}) {
    return this.docs.filter((d) => matchFilter(d, filter)).length;
  }

  async findOne(filter: any = {}) {
    return this.docs.find((d) => matchFilter(d, filter)) || null;
  }

  async insertOne(doc: any) {
    const _id = String(Date.now()) + Math.random().toString(36).slice(2);
    const toInsert = { ...doc, _id };
    this.docs.push(toInsert);
    return { insertedId: _id };
  }

  async insertMany(docs: any[]) {
    const insertedIds: Record<number, string> = {};
    docs.forEach((doc, i) => {
      const _id = String(Date.now() + i) + Math.random().toString(36).slice(2);
      this.docs.push({ ...doc, _id });
      insertedIds[i] = _id;
    });
    return { insertedIds };
  }

  async updateOne(filter: any, update: any) {
    const idx = this.docs.findIndex((d) => matchFilter(d, filter));
    if (idx === -1) return { matchedCount: 0, modifiedCount: 0 };
    const doc = this.docs[idx];
    // handle {$set: {...}}
    if (update.$set) {
      this.docs[idx] = { ...doc, ...update.$set };
    } else {
      this.docs[idx] = { ...doc, ...update };
    }
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async deleteOne(filter: any) {
    const idx = this.docs.findIndex((d) => matchFilter(d, filter));
    if (idx === -1) return { deletedCount: 0 };
    this.docs.splice(idx, 1);
    return { deletedCount: 1 };
  }

  async deleteMany(filter: any) {
    const before = this.docs.length;
    this.docs = this.docs.filter((d) => !matchFilter(d, filter));
    return { deletedCount: before - this.docs.length };
  }

  find(filter: any = {}) {
    const matched = this.docs.filter((d) => matchFilter(d, filter));
    // cursor-like chaining
    const result = {
      _items: matched.slice(),
      sort(this: any, spec: any) {
        const keys = Object.keys(spec || {});
        if (!keys.length) return this;
        // simple sort: support single key desc/asc
        const key = keys[0];
        const dir = spec[key];
        this._items.sort((a: any, b: any) => {
          if (a[key] < b[key]) return dir === -1 ? 1 : -1;
          if (a[key] > b[key]) return dir === -1 ? -1 : 1;
          return 0;
        });
        return this;
      },
      skip(this: any, n: number) {
        this._items = this._items.slice(n);
        return this;
      },
      limit(this: any, n: number) {
        this._items = this._items.slice(0, n);
        return this;
      },
      project(this: any, _proj: any) {
        // not implementing projection; return as-is
        return this;
      },
      toArray: async function () {
        return this._items;
      },
    };
    return result;
  }

  // very small aggregate implementation to support simple pipelines used in the app
  async aggregate(pipeline: any[]) {
    // support: [ { $match: ... }, { $group: { _id: "$field", count: { $sum: 1 } } } ]
    let items = this.docs.slice();
    for (const stage of pipeline) {
      if (stage.$match) {
        items = items.filter((d) => matchFilter(d, stage.$match));
      } else if (stage.$group) {
        const idExpr = stage.$group._id; // e.g. "$challenge_id"
        const field =
          typeof idExpr === "string" && idExpr.startsWith("$")
            ? idExpr.slice(1)
            : idExpr;
        const groups: Record<string, number> = {};
        for (const it of items) {
          const key = String(it[field] ?? "");
          groups[key] =
            (groups[key] || 0) +
            (stage.$group.count && stage.$group.count.$sum ? 1 : 0);
        }
        const out = Object.keys(groups).map((k) => ({
          _id: k,
          count: groups[k],
        }));
        return { toArray: async () => out };
      }
    }
    return { toArray: async () => items };
  }
}

function matchFilter(doc: any, filter: any) {
  if (!filter || Object.keys(filter).length === 0) return true;
  // handle simple equality and $or and $regex
  if (filter.$or && Array.isArray(filter.$or)) {
    return filter.$or.some((sub: any) => matchFilter(doc, sub));
  }
  for (const key of Object.keys(filter)) {
    const val = filter[key];
    if (typeof val === "object" && val !== null) {
      if (val.$regex) {
        try {
          const re = new RegExp(val.$regex, val.$options || "");
          if (!re.test(String(doc[key] ?? ""))) return false;
        } catch (_e) {
          return false;
        }
      } else if (val.$gt || val.$lt) {
        const dv = doc[key];
        if (val.$gt && !(dv > val.$gt)) return false;
        if (val.$lt && !(dv < val.$lt)) return false;
      } else if (val.$in && Array.isArray(val.$in)) {
        if (!val.$in.includes(doc[key])) return false;
      } else {
        // unsupported operator, try direct match
        if (doc[key] !== val) return false;
      }
    } else {
      if (doc[key] !== val) return false;
    }
  }
  return true;
}

// In-memory database object
class InMemoryDb {
  collections: Map<string, InMemoryCollection> = new Map();

  collection(name: string) {
    if (!this.collections.has(name))
      this.collections.set(name, new InMemoryCollection(name));
    return this.collections.get(name)!;
  }

  async listCollections() {
    const names = Array.from(this.collections.keys()).map((n) => ({ name: n }));
    return { toArray: async () => names };
  }

  async command(_cmd: any) {
    return { ok: 1 };
  }
}

export async function getDb(): Promise<any> {
  if (db && client) return db;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    // return in-memory DB for development if MONGODB_URI missing
    return new InMemoryDb();
  }
  const dbName = process.env.MONGODB_DB || "code";
  client = new MongoClient(uri, { maxPoolSize: 10 });
  await client.connect();
  db = client.db(dbName);
  return db;
}

export async function getCollection<T = any>(name: string): Promise<any> {
  const database: any = await getDb();
  return database.collection(name);
}

export async function initializeMongo() {
  const database: any = await getDb();
  // Ensure indexes (no-op for in-memory)
  const usersCol = database.collection("users");
  if (usersCol && usersCol.createIndexes) {
    await usersCol.createIndexes([
      { key: { username: 1 }, unique: true },
      { key: { email: 1 }, unique: true },
    ]);
  }
  const challengesCol = database.collection("challenges");
  if (challengesCol && challengesCol.createIndexes) {
    await challengesCol.createIndexes([
      { key: { is_daily: 1, publish_date: 1 } },
      { key: { is_active: 1, publish_date: -1 } },
      { key: { difficulty: 1 } },
    ]);
  }
  const submissionsCol = database.collection("submissions");
  if (submissionsCol && submissionsCol.createIndexes) {
    await submissionsCol.createIndexes([
      { key: { user_id: 1, challenge_id: 1 } },
      { key: { challenge_id: 1, status: 1 } },
    ]);
  }
}

export async function pingMongo() {
  const database: any = await getDb();
  if (database.command) return database.command({ ping: 1 });
  return { ok: 1 };
}

export async function seedIfEmpty() {
  const database: any = await getDb();
  const challengesCol = database.collection("challenges");
  const submissionsCol = database.collection("submissions");
  const count = await challengesCol.countDocuments({});
  if (count > 0) return;

  const today = new Date(new Date().toISOString().slice(0, 10));
  const day = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d;
  };

  const docs = [
    {
      title: "Two Sum",
      description:
        "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
      difficulty: "easy",
      tags: ["array", "hash-table"],
      input_format:
        "First line contains n (length of array)\\nSecond line contains n integers\\nThird line contains target integer",
      output_format: "Two integers representing the indices",
      constraints:
        "2 ≤ nums.length ≤ 10^4\\n-10^9 ≤ nums[i] ≤ 10^9\\n-10^9 ≤ target ≤ 10^9",
      examples: [
        {
          input: "4\\n2 7 11 15\\n9",
          output: "0 1",
          explanation: "nums[0] + nums[1] = 2 + 7 = 9",
        },
      ],
      test_cases: [
        { input: "4\\n2 7 11 15\\n9", output: "0 1" },
        { input: "3\\n3 2 4\\n6", output: "1 2" },
        { input: "2\\n3 3\\n6", output: "0 1" },
      ],
      time_limit: 1000,
      memory_limit: 256,
      supported_languages: ["python", "java", "cpp", "javascript", "go"],
      points: 25,
      is_daily: true,
      publish_date: today,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      title: "Valid Parentheses",
      description:
        "Given a string s containing just the characters '(){}[]', determine if the input string is valid.",
      difficulty: "easy",
      tags: ["string", "stack"],
      input_format: "Single line containing the string s",
      output_format: "true or false",
      constraints:
        "1 ≤ s.length ≤ 10^4\\ns consists of parentheses only '()[]{}'",
      examples: [
        { input: "()", output: "true" },
        { input: "()[]{}", output: "true" },
        { input: "(]", output: "false" },
      ],
      test_cases: [
        { input: "()", output: "true" },
        { input: "()[]{}", output: "true" },
        { input: "(]", output: "false" },
        { input: "([)]", output: "false" },
        { input: "{[]}", output: "true" },
      ],
      time_limit: 1000,
      memory_limit: 256,
      supported_languages: ["python", "java", "cpp", "javascript", "go"],
      points: 25,
      is_daily: true,
      publish_date: day(-1),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  const insertRes = await challengesCol.insertMany(docs);
  const insertedIds = Object.values(insertRes.insertedIds).map((id) =>
    id.toString(),
  );

  await submissionsCol.insertMany([
    {
      user_id: "alex_student",
      challenge_id: insertedIds[0],
      language: "python",
      code: "# solution omitted",
      status: "accepted",
      execution_time: 45,
      memory_used: 1024,
      test_results: [],
      score: 25,
      error_message: null,
      submitted_at: new Date(),
    },
    {
      user_id: "sarah_dev",
      challenge_id: insertedIds[1],
      language: "java",
      code: "// solution omitted",
      status: "accepted",
      execution_time: 67,
      memory_used: 2048,
      test_results: [],
      score: 25,
      error_message: null,
      submitted_at: new Date(Date.now() - 3600 * 1000),
    },
  ]);
}
