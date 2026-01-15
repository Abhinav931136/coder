// Mock database for development when Netlify DB is not available
// This provides sample data so the frontend can be tested immediately

interface Challenge {
  id: number;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  input_format: string;
  output_format: string;
  constraints: string;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  test_cases: Array<{
    input: string;
    output: string;
  }>;
  time_limit: number;
  memory_limit: number;
  supported_languages: string[];
  points: number;
  is_daily: boolean;
  publish_date: string;
  created_by: number;
  is_active: boolean;
  solved_count?: number;
}

interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: string;
  institution_id: number | null;
  points: number;
  streak_days: number;
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
}

// Mock data storage
const mockChallenges: Challenge[] = [
  {
    id: 1,
    title: "Array Sum",
    description:
      "Given an array of integers, find the sum of all elements in the array.",
    difficulty: "easy",
    tags: ["array", "basic", "math"],
    input_format:
      "First line contains n (number of elements)\nSecond line contains n space-separated integers",
    output_format: "Single integer representing the sum",
    constraints: "1 ≤ n ≤ 1000\n-1000 ≤ array elements ≤ 1000",
    examples: [
      {
        input: "5\n1 2 3 4 5",
        output: "15",
        explanation: "1 + 2 + 3 + 4 + 5 = 15",
      },
    ],
    test_cases: [
      { input: "5\n1 2 3 4 5", output: "15" },
      { input: "3\n-1 0 1", output: "0" },
      { input: "1\n42", output: "42" },
      { input: "4\n-5 -3 -2 -1", output: "-11" },
      { input: "6\n10 20 30 40 50 60", output: "210" },
    ],
    time_limit: 2000,
    memory_limit: 256,
    supported_languages: ["python", "java", "cpp", "javascript", "go"],
    points: 25,
    is_daily: true,
    publish_date: new Date().toISOString().split("T")[0],
    created_by: 2,
    is_active: true,
    solved_count: 145,
  },
  {
    id: 2,
    title: "Palindrome Checker",
    description:
      "Write a function to check if a given string is a palindrome. A palindrome reads the same forward and backward.",
    difficulty: "easy",
    tags: ["string", "palindrome", "basic"],
    input_format: "Single line containing a string (only lowercase letters)",
    output_format: "true if palindrome, false otherwise",
    constraints:
      "1 ≤ string length ≤ 1000\nString contains only lowercase letters a-z",
    examples: [
      {
        input: "racecar",
        output: "true",
        explanation: "racecar reads the same forwards and backwards",
      },
      {
        input: "hello",
        output: "false",
        explanation: "hello is not the same when reversed (olleh)",
      },
    ],
    test_cases: [
      { input: "racecar", output: "true" },
      { input: "hello", output: "false" },
      { input: "a", output: "true" },
      { input: "abcba", output: "true" },
      { input: "abcde", output: "false" },
      { input: "madam", output: "true" },
      { input: "python", output: "false" },
    ],
    time_limit: 2000,
    memory_limit: 256,
    supported_languages: ["python", "java", "cpp", "javascript", "go"],
    points: 30,
    is_daily: false,
    publish_date: new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    created_by: 2,
    is_active: true,
    solved_count: 89,
  },
  {
    id: 3,
    title: "Fibonacci Number",
    description:
      "Calculate the nth Fibonacci number. The Fibonacci sequence starts with 0, 1, and each subsequent number is the sum of the previous two.",
    difficulty: "medium",
    tags: ["dynamic-programming", "recursion", "fibonacci"],
    input_format: "Single integer n (0-indexed)",
    output_format: "The nth Fibonacci number",
    constraints: "0 ≤ n ≤ 30",
    examples: [
      { input: "0", output: "0", explanation: "F(0) = 0" },
      { input: "1", output: "1", explanation: "F(1) = 1" },
      {
        input: "6",
        output: "8",
        explanation: "F(6) = F(5) + F(4) = 5 + 3 = 8",
      },
    ],
    test_cases: [
      { input: "0", output: "0" },
      { input: "1", output: "1" },
      { input: "2", output: "1" },
      { input: "5", output: "5" },
      { input: "6", output: "8" },
      { input: "10", output: "55" },
      { input: "15", output: "610" },
    ],
    time_limit: 3000,
    memory_limit: 256,
    supported_languages: ["python", "java", "cpp", "javascript", "go"],
    points: 50,
    is_daily: false,
    publish_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    created_by: 2,
    is_active: true,
    solved_count: 67,
  },
  {
    id: 4,
    title: "Maximum Subarray Sum",
    description:
      "Find the contiguous subarray with the largest sum and return the sum. This is the classic Kadane's algorithm problem.",
    difficulty: "medium",
    tags: ["array", "dynamic-programming", "kadane"],
    input_format:
      "First line contains n (number of elements)\nSecond line contains n space-separated integers",
    output_format: "Maximum sum of any contiguous subarray",
    constraints: "1 ≤ n ≤ 1000\n-1000 ≤ array elements ≤ 1000",
    examples: [
      {
        input: "9\n-2 1 -3 4 -1 2 1 -5 4",
        output: "6",
        explanation: "Subarray [4, -1, 2, 1] has sum = 6",
      },
      {
        input: "1\n-1",
        output: "-1",
        explanation: "Only one element",
      },
    ],
    test_cases: [
      { input: "9\n-2 1 -3 4 -1 2 1 -5 4", output: "6" },
      { input: "1\n-1", output: "-1" },
      { input: "5\n1 2 3 4 5", output: "15" },
      { input: "3\n-1 -2 -3", output: "-1" },
      { input: "6\n5 -2 4 -1 3 -1", output: "9" },
    ],
    time_limit: 3000,
    memory_limit: 256,
    supported_languages: ["python", "java", "cpp", "javascript", "go"],
    points: 75,
    is_daily: false,
    publish_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    created_by: 2,
    is_active: true,
    solved_count: 42,
  },
  {
    id: 5,
    title: "Count Vowels",
    description:
      "Count the number of vowels (a, e, i, o, u) in a given string. Case-insensitive.",
    difficulty: "easy",
    tags: ["string", "counting", "basic"],
    input_format: "Single line containing a string",
    output_format: "Number of vowels in the string",
    constraints:
      "1 ≤ string length ≤ 1000\nString may contain letters, numbers, and special characters",
    examples: [
      {
        input: "Hello World",
        output: "3",
        explanation: "e, o, o are the vowels",
      },
      {
        input: "Programming",
        output: "3",
        explanation: "o, a, i are the vowels",
      },
    ],
    test_cases: [
      { input: "Hello World", output: "3" },
      { input: "Programming", output: "3" },
      { input: "xyz", output: "0" },
      { input: "AEIOU", output: "5" },
      { input: "The Quick Brown Fox", output: "5" },
      { input: "12345", output: "0" },
    ],
    time_limit: 2000,
    memory_limit: 256,
    supported_languages: ["python", "java", "cpp", "javascript", "go"],
    points: 20,
    is_daily: true,
    publish_date: new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    created_by: 2,
    is_active: true,
    solved_count: 0,
  },
];

const mockUsers: User[] = [
  {
    id: 1,
    username: "admin",
    email: "admin@interndesire.com",
    password_hash:
      "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi",
    first_name: "Platform",
    last_name: "Admin",
    role: "platform_admin",
    institution_id: null,
    points: 0,
    streak_days: 0,
    email_verified: true,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    username: "alex_student",
    email: "alex@stanford.edu",
    password_hash:
      "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi",
    first_name: "Alex",
    last_name: "Johnson",
    role: "student",
    institution_id: 1,
    points: 2847,
    streak_days: 7,
    email_verified: true,
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

// Mock database functions
export class MockDatabase {
  // Test connection
  static async testConnection(): Promise<boolean> {
    console.log("✅ Mock Database connected successfully (development mode)");
    return true;
  }

  // Get daily challenge
  static async getDailyChallenge(): Promise<Challenge | null> {
    const today = new Date().toISOString().split("T")[0];
    return (
      mockChallenges.find((c) => c.is_daily && c.publish_date === today) || null
    );
  }

  // Get challenges list with pagination
  static async getChallenges(
    page: number = 1,
    perPage: number = 20,
    difficulty?: string,
    search?: string,
  ) {
    let filtered = mockChallenges.filter((c) => c.is_active);

    if (difficulty) {
      filtered = filtered.filter((c) => c.difficulty === difficulty);
    }

    if (search) {
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          c.description.toLowerCase().includes(search.toLowerCase()),
      );
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / perPage);
    const offset = (page - 1) * perPage;
    const items = filtered.slice(offset, offset + perPage);

    return {
      items,
      pagination: {
        current_page: page,
        per_page: perPage,
        total,
        total_pages: totalPages,
        has_more: page < totalPages,
      },
    };
  }

  // Get challenge by ID
  static async getChallengeById(id: number): Promise<Challenge | null> {
    return mockChallenges.find((c) => c.id === id && c.is_active) || null;
  }

  // Get user by username or email
  static async getUserByLogin(login: string): Promise<User | null> {
    return (
      mockUsers.find(
        (u) => (u.username === login || u.email === login) && u.is_active,
      ) || null
    );
  }

  // Get user by ID
  static async getUserById(id: number): Promise<User | null> {
    return mockUsers.find((u) => u.id === id && u.is_active) || null;
  }

  // Create user (mock - just return success)
  static async createUser(
    userData: Partial<User>,
  ): Promise<{ success: boolean; insertId?: number }> {
    // In a real implementation, this would insert into database
    console.log("Mock: Creating user", userData.username);
    return { success: true, insertId: Date.now() }; // Use timestamp as mock ID
  }

  // Submit code (mock - return random result)
  static async submitCode(submission: any): Promise<any> {
    // Mock evaluation
    const passed = Math.random() > 0.3; // 70% pass rate
    const challenge = mockChallenges.find(
      (c) => c.id === submission.challenge_id,
    );

    return {
      submission_id: Date.now(),
      status: passed ? "accepted" : "wrong_answer",
      score: passed ? challenge?.points || 0 : 0,
      execution_time: Math.floor(Math.random() * 1000),
      memory_used: Math.floor(Math.random() * 1024),
      test_results:
        challenge?.test_cases.map((_, i) => ({
          test_case: i + 1,
          status: Math.random() > 0.2 ? "passed" : "failed",
        })) || [],
      error_message: passed ? null : "Sample error for testing",
    };
  }

  // General query execution for mock database
  static async executeQuery(
    query: string,
    params: any[] = [],
  ): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      console.log("Mock DB Query:", query, params);

      // For mock database, we'll handle simple queries
      if (query.toLowerCase().includes("select 1")) {
        return { success: true, data: [{ test: 1 }] };
      }

      if (query.toLowerCase().includes("update users set last_activity")) {
        return { success: true, data: [] };
      }

      if (query.toLowerCase().includes("insert into user_stats")) {
        return { success: true, data: [] };
      }

      // For other queries, return success
      return { success: true, data: [] };
    } catch (error) {
      return { success: false, error };
    }
  }

  // Get single row for mock database
  static async getOne(query: string, params: any[] = []): Promise<any> {
    console.log("Mock DB getOne:", query, params);

    // Handle user login queries
    if (
      query.toLowerCase().includes("select id from users where username") ||
      query
        .toLowerCase()
        .includes("select id from users where username = ? or email = ?")
    ) {
      // Check if user exists for registration
      const [usernameOrEmail] = params;
      const existingUser = mockUsers.find(
        (u) => u.username === usernameOrEmail || u.email === usernameOrEmail,
      );
      return existingUser ? { id: existingUser.id } : null;
    }

    if (
      query.toLowerCase().includes("select * from user_stats where user_id")
    ) {
      // Return mock user stats
      return {
        user_id: params[0],
        challenges_solved: 15,
        battles_won: 5,
        battles_lost: 2,
        hackathons_participated: 2,
        total_points: 450,
        current_streak: 3,
        longest_streak: 7,
        preferred_language: "python",
      };
    }

    return null;
  }

  // Insert and get ID for mock database
  static async insertAndGetId(
    query: string,
    params: any[] = [],
  ): Promise<{ success: boolean; insertId?: number; error?: any }> {
    try {
      console.log("Mock DB insertAndGetId:", query, params);

      if (query.toLowerCase().includes("insert into users")) {
        // Mock user creation
        const mockUserId = Date.now(); // Use timestamp as mock ID
        const [
          username,
          email,
          passwordHash,
          firstName,
          lastName,
          institutionId,
        ] = params;

        // Add to mock users array
        const newUser = {
          id: mockUserId,
          username,
          email,
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          role: "student",
          institution_id: institutionId,
          points: 0,
          streak_days: 0,
          email_verified: false,
          is_active: true,
          created_at: new Date().toISOString(),
        };

        mockUsers.push(newUser);
        return { success: true, insertId: mockUserId };
      }

      // For other inserts, return success with mock ID
      return { success: true, insertId: Date.now() };
    } catch (error) {
      return { success: false, error };
    }
  }
}
