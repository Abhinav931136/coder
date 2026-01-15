import { RequestHandler } from "express";
import {
  generateToken,
  hashPassword,
  comparePassword,
  isValidEmail,
  isValidPassword,
  isValidUsername,
  sanitizeInput,
  requireAuth,
  AuthRequest,
} from "../utils/auth";
import { executeQuery, getOne, insertAndGetId, convertMySQLToPostgreSQL, useMockDatabase } from "../config/database";
import { MockDatabase } from "../config/mock-database";

// Register new user
export const register: RequestHandler = async (req, res) => {
  try {
    const { username, email, password, first_name, last_name, institution_id } =
      req.body;

    // Validate required fields
    if (!username || !email || !password || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
        errors: {
          missing_fields: [
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
          ].filter((field) => !req.body[field]),
        },
      });
    }

    // Sanitize inputs
    const cleanUsername = sanitizeInput(username);
    const cleanEmail = sanitizeInput(email);
    const cleanFirstName = sanitizeInput(first_name);
    const cleanLastName = sanitizeInput(last_name);

    // Validate inputs
    const errors: Record<string, string> = {};

    if (!isValidUsername(cleanUsername)) {
      errors.username =
        "Username must be 3-50 characters and contain only letters, numbers, and underscores";
    }

    if (!isValidEmail(cleanEmail)) {
      errors.email = "Invalid email format";
    }

    if (!isValidPassword(password)) {
      errors.password =
        "Password must be at least 8 characters and contain uppercase, lowercase, and number";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    // Check if username or email already exists
    const existingUser = await getOne(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [cleanUsername, cleanEmail],
    );

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Username or email already exists",
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert user
    const insertResult = await insertAndGetId(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, institution_id, role) 
       VALUES (?, ?, ?, ?, ?, ?, 'student')`,
      [
        cleanUsername,
        cleanEmail,
        passwordHash,
        cleanFirstName,
        cleanLastName,
        institution_id || null,
      ],
    );

    if (!insertResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to create user account",
      });
    }

    const userId = insertResult.insertId;

    // Create user stats entry
    await executeQuery("INSERT INTO user_stats (user_id) VALUES (?)", [userId]);

    // Generate JWT token
    const token = generateToken({
      user_id: userId,
      username: cleanUsername,
      email: cleanEmail,
      role: "student",
      email_verified: false,
    });

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: {
          id: userId,
          username: cleanUsername,
          email: cleanEmail,
          first_name: cleanFirstName,
          last_name: cleanLastName,
          role: "student",
          email_verified: false,
          institution_id: institution_id || null,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Login user
export const login: RequestHandler = async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({
        success: false,
        message: "Username/email and password are required",
      });
    }

    const cleanLogin = sanitizeInput(login);

    // Find user by username or email
    let user;
    if (useMockDatabase) {
      user = await MockDatabase.getUserByLogin(cleanLogin);
    } else {
      user = await getOne(
        `SELECT id, username, email, password_hash, first_name, last_name, role,
                email_verified, is_active, institution_id, points, streak_days
         FROM users
         WHERE (username = ? OR email = ?) AND is_active = true`,
        [cleanLogin, cleanLogin],
      );
    }

    if (!user || !(await comparePassword(password, user.password_hash))) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Update last activity
    await executeQuery(
      "UPDATE users SET last_activity = CURRENT_DATE WHERE id = ?",
      [user.id],
    );

    // Get user stats
    const stats = await getOne("SELECT * FROM user_stats WHERE user_id = ?", [
      user.id,
    ]);

    // Generate JWT token
    const token = generateToken({
      user_id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      email_verified: !!user.email_verified,
    });

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          email_verified: !!user.email_verified,
          institution_id: user.institution_id,
          points: user.points || 0,
          streak_days: user.streak_days || 0,
        },
        stats: stats || {},
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get user profile
export const getProfile: RequestHandler = async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Get detailed user info
    const user = await getOne(
      `SELECT u.*, i.name as institution_name, us.*
       FROM users u
       LEFT JOIN institutions i ON u.institution_id = i.id
       LEFT JOIN user_stats us ON u.id = us.user_id
       WHERE u.id = ?`,
      [req.user.id],
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Profile retrieved successfully",
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          email_verified: !!user.email_verified,
          institution_id: user.institution_id,
          institution_name: user.institution_name,
          profile_image: user.profile_image,
          bio: user.bio,
          github_username: user.github_username,
          linkedin_url: user.linkedin_url,
          points: user.points || 0,
          streak_days: user.streak_days || 0,
          created_at: user.created_at,
        },
        stats: {
          challenges_solved: user.challenges_solved || 0,
          battles_won: user.battles_won || 0,
          battles_lost: user.battles_lost || 0,
          hackathons_participated: user.hackathons_participated || 0,
          total_points: user.total_points || 0,
          current_streak: user.current_streak || 0,
          longest_streak: user.longest_streak || 0,
          preferred_language: user.preferred_language,
        },
      },
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Verify token
export const verifyToken: RequestHandler = async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    res.json({
      success: true,
      message: "Token is valid",
      data: {
        valid: true,
        user_id: req.user.id,
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Logout (client-side token removal, but we can log it)
export const logout: RequestHandler = async (req: AuthRequest, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // But we can log the logout for analytics

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
