-- InternDesire Database Schema
-- Drop existing database if exists
DROP DATABASE IF EXISTS interndesire;
CREATE DATABASE interndesire CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE interndesire;

-- Users table with role-based access
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role ENUM('student', 'instructor', 'platform_admin') DEFAULT 'student',
    institution_id INT,
    profile_image VARCHAR(255),
    bio TEXT,
    github_username VARCHAR(50),
    linkedin_url VARCHAR(255),
    points INT DEFAULT 0,
    streak_days INT DEFAULT 0,
    last_activity DATE,
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_institution (institution_id)
);

-- Institutions table for organizational support
CREATE TABLE institutions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    domain VARCHAR(100),
    logo_url VARCHAR(255),
    contact_email VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add foreign key for institution
ALTER TABLE users ADD FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL;

-- Daily challenges table
CREATE TABLE challenges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    difficulty ENUM('easy', 'medium', 'hard') NOT NULL,
    tags JSON,
    input_format TEXT,
    output_format TEXT,
    constraints TEXT,
    examples JSON,
    test_cases JSON, -- Stored as JSON for flexibility
    time_limit INT DEFAULT 1000, -- milliseconds
    memory_limit INT DEFAULT 256, -- MB
    supported_languages JSON, -- Array of supported language codes
    points INT NOT NULL,
    is_daily BOOLEAN DEFAULT FALSE,
    publish_date DATE,
    created_by INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_difficulty (difficulty),
    INDEX idx_publish_date (publish_date),
    INDEX idx_daily (is_daily),
    INDEX idx_active (is_active)
);

-- Code submissions table
CREATE TABLE submissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    challenge_id INT,
    battle_id INT, -- For battle submissions
    hackathon_id INT, -- For hackathon submissions
    language VARCHAR(20) NOT NULL,
    code TEXT NOT NULL,
    status ENUM('pending', 'running', 'accepted', 'wrong_answer', 'time_limit_exceeded', 'memory_limit_exceeded', 'runtime_error', 'compilation_error') DEFAULT 'pending',
    execution_time INT, -- milliseconds
    memory_used INT, -- KB
    test_results JSON, -- Results for each test case
    score INT DEFAULT 0,
    error_message TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    INDEX idx_user_challenge (user_id, challenge_id),
    INDEX idx_status (status),
    INDEX idx_submitted_at (submitted_at)
);

-- Battles table for 1v1 competitions
CREATE TABLE battles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    challenge_id INT NOT NULL,
    creator_id INT NOT NULL,
    opponent_id INT,
    status ENUM('waiting', 'in_progress', 'completed', 'cancelled') DEFAULT 'waiting',
    duration_minutes INT DEFAULT 30,
    winner_id INT,
    started_at TIMESTAMP NULL,
    ended_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (opponent_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_creator (creator_id),
    INDEX idx_opponent (opponent_id)
);

-- Hackathons table
CREATE TABLE hackathons (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    institution_id INT,
    organizer_id INT NOT NULL,
    max_participants INT,
    max_team_size INT DEFAULT 4,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    registration_deadline TIMESTAMP NOT NULL,
    status ENUM('draft', 'registration_open', 'registration_closed', 'in_progress', 'judging', 'completed', 'cancelled') DEFAULT 'draft',
    rules TEXT,
    prizes JSON,
    requirements TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    banner_image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_dates (start_date, end_date),
    INDEX idx_institution (institution_id)
);

-- Hackathon teams
CREATE TABLE hackathon_teams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hackathon_id INT NOT NULL,
    team_name VARCHAR(100) NOT NULL,
    team_leader_id INT NOT NULL,
    description TEXT,
    github_repo VARCHAR(255),
    demo_url VARCHAR(255),
    submission_file VARCHAR(255),
    final_score DECIMAL(5,2) DEFAULT 0.00,
    is_qualified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hackathon_id) REFERENCES hackathons(id) ON DELETE CASCADE,
    FOREIGN KEY (team_leader_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_team_hackathon (hackathon_id, team_name),
    INDEX idx_hackathon (hackathon_id),
    INDEX idx_leader (team_leader_id)
);

-- Hackathon team members
CREATE TABLE hackathon_team_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    team_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('leader', 'member') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES hackathon_teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_team (team_id, user_id),
    INDEX idx_team (team_id),
    INDEX idx_user (user_id)
);

-- Judges table for hackathons
CREATE TABLE judges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hackathon_id INT NOT NULL,
    user_id INT NOT NULL,
    expertise_areas JSON,
    bio TEXT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hackathon_id) REFERENCES hackathons(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_judge_hackathon (hackathon_id, user_id),
    INDEX idx_hackathon (hackathon_id),
    INDEX idx_user (user_id)
);

-- Judging scores
CREATE TABLE judging_scores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    judge_id INT NOT NULL,
    team_id INT NOT NULL,
    criteria VARCHAR(100) NOT NULL,
    score DECIMAL(3,1) NOT NULL CHECK (score >= 0 AND score <= 10),
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (judge_id) REFERENCES judges(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES hackathon_teams(id) ON DELETE CASCADE,
    UNIQUE KEY unique_judge_team_criteria (judge_id, team_id, criteria),
    INDEX idx_team (team_id),
    INDEX idx_judge (judge_id)
);

-- Certificates table
CREATE TABLE certificates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    hackathon_id INT,
    challenge_id INT,
    type ENUM('hackathon_participation', 'hackathon_winner', 'challenge_completion', 'achievement') NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    certificate_url VARCHAR(255),
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (hackathon_id) REFERENCES hackathons(id) ON DELETE SET NULL,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_type (type),
    INDEX idx_issued_at (issued_at)
);

-- User statistics for analytics
CREATE TABLE user_stats (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    challenges_solved INT DEFAULT 0,
    battles_won INT DEFAULT 0,
    battles_lost INT DEFAULT 0,
    hackathons_participated INT DEFAULT 0,
    total_points INT DEFAULT 0,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    avg_solve_time INT DEFAULT 0, -- seconds
    preferred_language VARCHAR(20),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_stats (user_id),
    INDEX idx_points (total_points),
    INDEX idx_streak (current_streak)
);

-- Session management for authentication
CREATE TABLE user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_token VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_session_token (session_token),
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at)
);

-- Email verification tokens
CREATE TABLE email_verification_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_token (token),
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at)
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_token (token),
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at)
);

-- API rate limiting
CREATE TABLE rate_limits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    identifier VARCHAR(100) NOT NULL, -- IP address or user ID
    endpoint VARCHAR(100) NOT NULL,
    requests_count INT DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_identifier_endpoint (identifier, endpoint),
    INDEX idx_window_start (window_start)
);
