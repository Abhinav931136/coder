-- InternDesire Database Schema for Netlify Neon (PostgreSQL)
-- Create tables and initial data

-- Users table with role-based access
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'platform_admin')),
    institution_id INTEGER,
    profile_image VARCHAR(255),
    bio TEXT,
    github_username VARCHAR(50),
    linkedin_url VARCHAR(255),
    points INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_activity DATE,
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Institutions table for organizational support
CREATE TABLE IF NOT EXISTS institutions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    domain VARCHAR(100),
    logo_url VARCHAR(255),
    contact_email VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily challenges table
CREATE TABLE IF NOT EXISTS challenges (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    tags JSONB,
    input_format TEXT,
    output_format TEXT,
    constraints TEXT,
    examples JSONB,
    test_cases JSONB,
    time_limit INTEGER DEFAULT 1000,
    memory_limit INTEGER DEFAULT 256,
    supported_languages JSONB,
    points INTEGER NOT NULL,
    is_daily BOOLEAN DEFAULT FALSE,
    publish_date DATE,
    created_by INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Code submissions table
CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    challenge_id INTEGER,
    battle_id INTEGER,
    hackathon_id INTEGER,
    language VARCHAR(20) NOT NULL,
    code TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'accepted', 'wrong_answer', 'time_limit_exceeded', 'memory_limit_exceeded', 'runtime_error', 'compilation_error')),
    execution_time INTEGER,
    memory_used INTEGER,
    test_results JSONB,
    score INTEGER DEFAULT 0,
    error_message TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User statistics for analytics
CREATE TABLE IF NOT EXISTS user_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    challenges_solved INTEGER DEFAULT 0,
    battles_won INTEGER DEFAULT 0,
    battles_lost INTEGER DEFAULT 0,
    hackathons_participated INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    avg_solve_time INTEGER DEFAULT 0,
    preferred_language VARCHAR(20),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session management for authentication
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_token VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_challenges_difficulty ON challenges(difficulty);
CREATE INDEX IF NOT EXISTS idx_challenges_publish_date ON challenges(publish_date);
CREATE INDEX IF NOT EXISTS idx_challenges_daily ON challenges(is_daily);
CREATE INDEX IF NOT EXISTS idx_submissions_user_challenge ON submissions(user_id, challenge_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);

-- Add foreign key constraints
ALTER TABLE users ADD CONSTRAINT fk_users_institution FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL;
ALTER TABLE challenges ADD CONSTRAINT fk_challenges_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE submissions ADD CONSTRAINT fk_submissions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE submissions ADD CONSTRAINT fk_submissions_challenge FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE;
ALTER TABLE user_stats ADD CONSTRAINT fk_user_stats_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_sessions ADD CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Insert sample institutions
INSERT INTO institutions (name, domain, contact_email, is_verified) VALUES
('Stanford University', 'stanford.edu', 'contact@stanford.edu', TRUE),
('MIT', 'mit.edu', 'contact@mit.edu', TRUE),
('UC Berkeley', 'berkeley.edu', 'contact@berkeley.edu', TRUE),
('Harvard University', 'harvard.edu', 'contact@harvard.edu', TRUE)
ON CONFLICT DO NOTHING;

-- Insert sample users (password hash for 'password')
INSERT INTO users (username, email, password_hash, first_name, last_name, role, institution_id, points, streak_days) VALUES
('admin', 'admin@interndesire.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Platform', 'Admin', 'platform_admin', NULL, 0, 0),
('prof_smith', 'smith@stanford.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John', 'Smith', 'instructor', 1, 500, 5),
('alex_student', 'alex@stanford.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Alex', 'Johnson', 'student', 1, 2847, 7),
('sarah_dev', 'sarah@mit.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sarah', 'Davis', 'student', 2, 1923, 12),
('mike_coder', 'mike@berkeley.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mike', 'Wilson', 'student', 3, 3456, 3)
ON CONFLICT DO NOTHING;

-- Insert corresponding user stats
INSERT INTO user_stats (user_id, challenges_solved, battles_won, battles_lost, total_points, current_streak, longest_streak, preferred_language) VALUES
(3, 156, 23, 12, 2847, 7, 15, 'python'),
(4, 89, 15, 8, 1923, 12, 18, 'java'),
(5, 234, 45, 19, 3456, 3, 22, 'cpp')
ON CONFLICT DO NOTHING;
