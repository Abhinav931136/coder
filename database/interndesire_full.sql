-- InternDesire Full Database Setup (Schema + Seed)
-- Run this file in MySQL to create the database, tables, and insert sample data

-- ==========================
-- Schema
-- ==========================
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
    test_cases JSON,
    time_limit INT DEFAULT 1000,
    memory_limit INT DEFAULT 256,
    supported_languages JSON,
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
    battle_id INT,
    hackathon_id INT,
    language VARCHAR(20) NOT NULL,
    code TEXT NOT NULL,
    status ENUM('pending', 'running', 'accepted', 'wrong_answer', 'time_limit_exceeded', 'memory_limit_exceeded', 'runtime_error', 'compilation_error') DEFAULT 'pending',
    execution_time INT,
    memory_used INT,
    test_results JSON,
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
    avg_solve_time INT DEFAULT 0,
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
    identifier VARCHAR(100) NOT NULL,
    endpoint VARCHAR(100) NOT NULL,
    requests_count INT DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_identifier_endpoint (identifier, endpoint),
    INDEX idx_window_start (window_start)
);

-- ==========================
-- Seed Data
-- ==========================
USE interndesire;

INSERT INTO institutions (name, domain, contact_email, is_verified) VALUES
('Stanford University', 'stanford.edu', 'contact@stanford.edu', TRUE),
('MIT', 'mit.edu', 'contact@mit.edu', TRUE),
('UC Berkeley', 'berkeley.edu', 'contact@berkeley.edu', TRUE),
('Harvard University', 'harvard.edu', 'contact@harvard.edu', TRUE);

INSERT INTO users (username, email, password_hash, first_name, last_name, role, institution_id, points, streak_days) VALUES
('admin', 'admin@interndesire.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Platform', 'Admin', 'platform_admin', NULL, 0, 0),
('prof_smith', 'smith@stanford.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John', 'Smith', 'instructor', 1, 500, 5),
('alex_student', 'alex@stanford.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Alex', 'Johnson', 'student', 1, 2847, 7),
('sarah_dev', 'sarah@mit.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sarah', 'Davis', 'student', 2, 1923, 12),
('mike_coder', 'mike@berkeley.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mike', 'Wilson', 'student', 3, 3456, 3);

INSERT INTO challenges (title, description, difficulty, tags, input_format, output_format, constraints, examples, test_cases, time_limit, memory_limit, supported_languages, points, is_daily, publish_date, created_by, is_active) VALUES
(
    'Two Sum',
    'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    'easy',
    '["array", "hash-table"]',
    'First line contains n (length of array)\nSecond line contains n integers\nThird line contains target integer',
    'Two integers representing the indices',
    '2 ≤ nums.length ≤ 10^4\n-10^9 ≤ nums[i] ≤ 10^9\n-10^9 ≤ target ≤ 10^9',
    '[{"input": "4\n2 7 11 15\n9", "output": "0 1", "explanation": "nums[0] + nums[1] = 2 + 7 = 9"}]',
    '[{"input": "4\n2 7 11 15\n9", "output": "0 1"}, {"input": "3\n3 2 4\n6", "output": "1 2"}, {"input": "2\n3 3\n6", "output": "0 1"}]',
    1000,
    256,
    '["python", "java", "cpp", "javascript", "go"]',
    25,
    TRUE,
    CURDATE(),
    2,
    TRUE
),
(
    'Valid Parentheses',
    'Given a string s containing just the characters ''('', '')'', ''{'', ''}'', ''['' and '']'', determine if the input string is valid.',
    'easy',
    '["string", "stack"]',
    'Single line containing the string s',
    'true or false',
    '1 ≤ s.length ≤ 10^4\ns consists of parentheses only ''()[]{}''',
    '[{"input": "()", "output": "true"}, {"input": "()[]{}", "output": "true"}, {"input": "(]", "output": "false"}]',
    '[{"input": "()", "output": "true"}, {"input": "()[]{}", "output": "true"}, {"input": "(]", "output": "false"}, {"input": "([)]", "output": "false"}, {"input": "{[]}", "output": "true"}]',
    1000,
    256,
    '["python", "java", "cpp", "javascript", "go"]',
    25,
    TRUE,
    DATE_ADD(CURDATE(), INTERVAL -1 DAY),
    2,
    TRUE
),
(
    'Binary Tree Traversal',
    'Given the root of a binary tree, return the inorder traversal of its nodes'' values.',
    'medium',
    '["tree", "depth-first-search", "binary-tree"]',
    'Binary tree in level order format (null for empty nodes)',
    'Array of integers in inorder traversal order',
    'The number of nodes in the tree is in the range [0, 100]\n-100 ≤ Node.val ≤ 100',
    '[{"input": "[1,null,2,3]", "output": "[1,3,2]"}, {"input": "[]", "output": "[]"}, {"input": "[1]", "output": "[1]"}]',
    '[{"input": "[1,null,2,3]", "output": "[1,3,2]"}, {"input": "[]", "output": "[]"}, {"input": "[1]", "output": "[1]"}, {"input": "[1,2,3,4,5]", "output": "[4,2,5,1,3]"}]',
    2000,
    256,
    '["python", "java", "cpp", "javascript", "go"]',
    50,
    FALSE,
    DATE_ADD(CURDATE(), INTERVAL -2 DAY),
    2,
    TRUE
),
(
    'Longest Substring Without Repeating Characters',
    'Given a string s, find the length of the longest substring without repeating characters.',
    'medium',
    '["string", "sliding-window", "hash-table"]',
    'Single line containing string s',
    'Integer representing the length',
    '0 ≤ s.length ≤ 5 * 10^4\ns consists of English letters, digits, symbols and spaces',
    '[{"input": "abcabcbb", "output": "3", "explanation": "The answer is abc, with the length of 3"}, {"input": "bbbbb", "output": "1"}, {"input": "pwwkew", "output": "3"}]',
    '[{"input": "abcabcbb", "output": "3"}, {"input": "bbbbb", "output": "1"}, {"input": "pwwkew", "output": "3"}, {"input": "", "output": "0"}, {"input": "dvdf", "output": "3"}]',
    2000,
    256,
    '["python", "java", "cpp", "javascript", "go"]',
    50,
    FALSE,
    DATE_ADD(CURDATE(), INTERVAL -3 DAY),
    2,
    TRUE
),
(
    'Merge Two Sorted Lists',
    'You are given the heads of two sorted linked lists list1 and list2. Merge the two lists in a sorted manner.',
    'easy',
    '["linked-list", "recursion"]',
    'Two lines, each containing space-separated integers representing the linked lists',
    'Space-separated integers representing the merged sorted list',
    'The number of nodes in both lists is in the range [0, 50]\n-100 ≤ Node.val ≤ 100\nBoth list1 and list2 are sorted in non-decreasing order',
    '[{"input": "1 2 4\n1 3 4", "output": "1 1 2 3 4 4"}, {"input": "\n", "output": ""}, {"input": "\n0", "output": "0"}]',
    '[{"input": "1 2 4\n1 3 4", "output": "1 1 2 3 4 4"}, {"input": "\n", "output": ""}, {"input": "\n0", "output": "0"}, {"input": "5\n1 2 4", "output": "1 2 4 5"}]',
    1000,
    256,
    '["python", "java", "cpp", "javascript", "go"]',
    25,
    TRUE,
    DATE_ADD(CURDATE(), INTERVAL 1 DAY),
    2,
    TRUE
);

INSERT INTO submissions (user_id, challenge_id, language, code, status, execution_time, memory_used, score, submitted_at) VALUES
(3, 1, 'python', 'def two_sum(nums, target):\n    hash_map = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in hash_map:\n            return [hash_map[complement], i]\n        hash_map[num] = i\n    return []', 'accepted', 45, 1024, 25, NOW()),
(3, 2, 'python', 'def is_valid(s):\n    stack = []\n    mapping = {")": "(", "}": "{", "]": "["}\n    for char in s:\n        if char in mapping:\n            if not stack or stack.pop() != mapping[char]:\n                return False\n        else:\n            stack.append(char)\n    return not stack', 'accepted', 32, 956, 25, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(4, 1, 'java', 'public int[] twoSum(int[] nums, int target) {\n    Map<Integer, Integer> map = new HashMap<>();\n    for (int i = 0; i < nums.length; i++) {\n        int complement = target - nums[i];\n        if (map.containsKey(complement)) {\n            return new int[] { map.get(complement), i };\n        }\n        map.put(nums[i], i);\n    }\n    return new int[0];\n}', 'accepted', 67, 2048, 25, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(5, 2, 'cpp', '#include <stack>\nbool isValid(string s) {\n    stack<char> st;\n    for (char c : s) {\n        if (c == '('' || c == '{'' || c == '['') {\n            st.push(c);\n        } else {\n            if (st.empty()) return false;\n            char top = st.top();\n            st.pop();\n            if ((c == '')'' && top != ''('') || \n                (c == ''}'' && top != ''{'') || \n                (c == '']'' && top != ''['')) {\n                return false;\n            }\n        }\n    }\n    return st.empty();\n}', 'accepted', 23, 1536, 25, DATE_SUB(NOW(), INTERVAL 3 HOUR));

INSERT INTO user_stats (user_id, challenges_solved, battles_won, battles_lost, total_points, current_streak, longest_streak, preferred_language) VALUES
(3, 156, 23, 12, 2847, 7, 15, 'python'),
(4, 89, 15, 8, 1923, 12, 18, 'java'),
(5, 234, 45, 19, 3456, 3, 22, 'cpp');

INSERT INTO hackathons (title, description, organizer_id, institution_id, max_participants, start_date, end_date, registration_deadline, status, rules, prizes) VALUES
(
    'Spring Innovation Challenge 2024',
    'Build innovative solutions using AI and machine learning to solve real-world problems.',
    2,
    1,
    100,
    DATE_ADD(NOW(), INTERVAL 15 DAY),
    DATE_ADD(NOW(), INTERVAL 17 DAY),
    DATE_ADD(NOW(), INTERVAL 10 DAY),
    'registration_open',
    'Teams of 2-4 members. Use any programming language and framework. Original code only.',
    '{"first": "$5000", "second": "$3000", "third": "$1000", "best_innovation": "$2000"}'
);

INSERT INTO hackathon_teams (hackathon_id, team_name, team_leader_id, description) VALUES
(1, 'Code Crusaders', 3, 'Passionate about AI and innovation');

INSERT INTO hackathon_team_members (team_id, user_id, role) VALUES
(1, 3, 'leader'),
(1, 4, 'member');

UPDATE users SET last_activity = CURDATE() WHERE id IN (3, 4, 5);
