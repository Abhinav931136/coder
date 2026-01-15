-- InternDesire Sample Seed Data
USE interndesire;

-- Insert sample institutions
INSERT INTO institutions (name, domain, contact_email, is_verified) VALUES
('Stanford University', 'stanford.edu', 'contact@stanford.edu', TRUE),
('MIT', 'mit.edu', 'contact@mit.edu', TRUE),
('UC Berkeley', 'berkeley.edu', 'contact@berkeley.edu', TRUE),
('Harvard University', 'harvard.edu', 'contact@harvard.edu', TRUE);

-- Insert sample users
INSERT INTO users (username, email, password_hash, first_name, last_name, role, institution_id, points, streak_days) VALUES
('admin', 'admin@interndesire.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Platform', 'Admin', 'platform_admin', NULL, 0, 0),
('prof_smith', 'smith@stanford.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John', 'Smith', 'instructor', 1, 500, 5),
('alex_student', 'alex@stanford.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Alex', 'Johnson', 'student', 1, 2847, 7),
('sarah_dev', 'sarah@mit.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sarah', 'Davis', 'student', 2, 1923, 12),
('mike_coder', 'mike@berkeley.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mike', 'Wilson', 'student', 3, 3456, 3);

-- Insert sample daily challenges
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

-- Insert sample submissions
INSERT INTO submissions (user_id, challenge_id, language, code, status, execution_time, memory_used, score, submitted_at) VALUES
(3, 1, 'python', 'def two_sum(nums, target):\n    hash_map = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in hash_map:\n            return [hash_map[complement], i]\n        hash_map[num] = i\n    return []', 'accepted', 45, 1024, 25, NOW()),
(3, 2, 'python', 'def is_valid(s):\n    stack = []\n    mapping = {")": "(", "}": "{", "]": "["}\n    for char in s:\n        if char in mapping:\n            if not stack or stack.pop() != mapping[char]:\n                return False\n        else:\n            stack.append(char)\n    return not stack', 'accepted', 32, 956, 25, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(4, 1, 'java', 'public int[] twoSum(int[] nums, int target) {\n    Map<Integer, Integer> map = new HashMap<>();\n    for (int i = 0; i < nums.length; i++) {\n        int complement = target - nums[i];\n        if (map.containsKey(complement)) {\n            return new int[] { map.get(complement), i };\n        }\n        map.put(nums[i], i);\n    }\n    return new int[0];\n}', 'accepted', 67, 2048, 25, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(5, 2, 'cpp', '#include <stack>\nbool isValid(string s) {\n    stack<char> st;\n    for (char c : s) {\n        if (c == ''('' || c == ''{'' || c == ''['') {\n            st.push(c);\n        } else {\n            if (st.empty()) return false;\n            char top = st.top();\n            st.pop();\n            if ((c == '')'' && top != ''('') || \n                (c == ''}'' && top != ''{'') || \n                (c == '']'' && top != ''['')) {\n                return false;\n            }\n        }\n    }\n    return st.empty();\n}', 'accepted', 23, 1536, 25, DATE_SUB(NOW(), INTERVAL 3 HOUR));

-- Insert sample user statistics
INSERT INTO user_stats (user_id, challenges_solved, battles_won, battles_lost, total_points, current_streak, longest_streak, preferred_language) VALUES
(3, 156, 23, 12, 2847, 7, 15, 'python'),
(4, 89, 15, 8, 1923, 12, 18, 'java'),
(5, 234, 45, 19, 3456, 3, 22, 'cpp');

-- Insert sample hackathon
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

-- Insert sample hackathon team
INSERT INTO hackathon_teams (hackathon_id, team_name, team_leader_id, description) VALUES
(1, 'Code Crusaders', 3, 'Passionate about AI and innovation');

-- Insert team member
INSERT INTO hackathon_team_members (team_id, user_id, role) VALUES
(1, 3, 'leader'),
(1, 4, 'member');

-- Update last activity for users
UPDATE users SET last_activity = CURDATE() WHERE id IN (3, 4, 5);
