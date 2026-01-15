<?php
/**
 * Authentication API Endpoints
 * Handles user registration, login, token verification, and password reset
 */

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/utils/JWT.php';
require_once __DIR__ . '/utils/Response.php';

// Get request method and endpoint
$method = $_SERVER['REQUEST_METHOD'];
$endpoint = $_GET['endpoint'] ?? '';

// Rate limiting
$identifier = $_SERVER['REMOTE_ADDR'];
Response::checkRateLimit($identifier, 'auth_' . $endpoint);

try {
    switch ($endpoint) {
        case 'register':
            if ($method !== 'POST') {
                Response::methodNotAllowed();
            }
            handleRegister();
            break;
            
        case 'login':
            if ($method !== 'POST') {
                Response::methodNotAllowed();
            }
            handleLogin();
            break;
            
        case 'verify':
            if ($method !== 'GET') {
                Response::methodNotAllowed();
            }
            handleVerify();
            break;
            
        case 'profile':
            if ($method !== 'GET') {
                Response::methodNotAllowed();
            }
            handleProfile();
            break;
            
        case 'refresh':
            if ($method !== 'POST') {
                Response::methodNotAllowed();
            }
            handleRefresh();
            break;
            
        case 'logout':
            if ($method !== 'POST') {
                Response::methodNotAllowed();
            }
            handleLogout();
            break;
            
        case 'forgot-password':
            if ($method !== 'POST') {
                Response::methodNotAllowed();
            }
            handleForgotPassword();
            break;
            
        case 'reset-password':
            if ($method !== 'POST') {
                Response::methodNotAllowed();
            }
            handleResetPassword();
            break;
            
        default:
            Response::notFound('Authentication endpoint not found');
    }
    
} catch (Exception $e) {
    logMessage('ERROR', 'Auth API Error: ' . $e->getMessage());
    Response::serverError();
}

/**
 * Handle user registration
 */
function handleRegister() {
    global $db;
    
    $data = Response::getJsonInput();
    
    // Validate required fields
    Response::validateRequired($data, ['username', 'email', 'password', 'first_name', 'last_name']);
    
    // Sanitize input
    $username = sanitizeInput($data['username']);
    $email = sanitizeInput($data['email']);
    $password = $data['password'];
    $first_name = sanitizeInput($data['first_name']);
    $last_name = sanitizeInput($data['last_name']);
    $institution_id = isset($data['institution_id']) ? (int)$data['institution_id'] : null;
    
    // Validate input
    $errors = [];
    
    if (strlen($username) < 3 || strlen($username) > 50) {
        $errors['username'] = 'Username must be between 3 and 50 characters';
    }
    
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
        $errors['username'] = 'Username can only contain letters, numbers, and underscores';
    }
    
    if (!isValidEmail($email)) {
        $errors['email'] = 'Invalid email format';
    }
    
    if (!isValidPassword($password)) {
        $errors['password'] = 'Password must be at least ' . PASSWORD_MIN_LENGTH . ' characters and contain uppercase, lowercase, and number';
    }
    
    if (!empty($errors)) {
        Response::validationError($errors);
    }
    
    try {
        // Check if username or email already exists
        $stmt = $db->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$username, $email]);
        
        if ($stmt->fetch()) {
            Response::error('Username or email already exists', 409);
        }
        
        // Hash password
        $password_hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => PASSWORD_COST]);
        
        // Insert user
        $stmt = $db->prepare("
            INSERT INTO users (username, email, password_hash, first_name, last_name, institution_id) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([$username, $email, $password_hash, $first_name, $last_name, $institution_id]);
        $user_id = $db->lastInsertId();
        
        // Create user stats entry
        $stmt = $db->prepare("INSERT INTO user_stats (user_id) VALUES (?)");
        $stmt->execute([$user_id]);
        
        // Generate email verification token
        $verification_token = generateSecureToken();
        $expires_at = date('Y-m-d H:i:s', time() + 24 * 3600); // 24 hours
        
        $stmt = $db->prepare("
            INSERT INTO email_verification_tokens (user_id, token, expires_at) 
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$user_id, $verification_token, $expires_at]);
        
        // Generate JWT token
        $jwt_payload = [
            'user_id' => $user_id,
            'username' => $username,
            'email' => $email,
            'role' => 'student',
            'email_verified' => false
        ];
        
        $jwt_token = JWT::encode($jwt_payload);
        
        // Log successful registration
        logMessage('INFO', 'User registered successfully', ['user_id' => $user_id, 'username' => $username]);
        
        Response::success([
            'user' => [
                'id' => $user_id,
                'username' => $username,
                'email' => $email,
                'first_name' => $first_name,
                'last_name' => $last_name,
                'role' => 'student',
                'email_verified' => false
            ],
            'token' => $jwt_token,
            'verification_required' => true
        ], 'Registration successful. Please check your email to verify your account.', 201);
        
    } catch (PDOException $e) {
        logMessage('ERROR', 'Registration database error: ' . $e->getMessage());
        Response::serverError('Registration failed');
    }
}

/**
 * Handle user login
 */
function handleLogin() {
    global $db;
    
    $data = Response::getJsonInput();
    
    // Validate required fields
    Response::validateRequired($data, ['login', 'password']);
    
    $login = sanitizeInput($data['login']); // Can be username or email
    $password = $data['password'];
    
    try {
        // Find user by username or email
        $stmt = $db->prepare("
            SELECT id, username, email, password_hash, first_name, last_name, role, 
                   email_verified, is_active, institution_id, points, streak_days
            FROM users 
            WHERE (username = ? OR email = ?) AND is_active = 1
        ");
        $stmt->execute([$login, $login]);
        $user = $stmt->fetch();
        
        if (!$user || !password_verify($password, $user['password_hash'])) {
            Response::error('Invalid credentials', 401);
        }
        
        // Update last activity
        $stmt = $db->prepare("UPDATE users SET last_activity = CURDATE() WHERE id = ?");
        $stmt->execute([$user['id']]);
        
        // Generate session token
        $session_token = generateSecureToken();
        $expires_at = date('Y-m-d H:i:s', time() + JWT_EXPIRATION_TIME);
        
        $stmt = $db->prepare("
            INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $user['id'], 
            $session_token, 
            $_SERVER['REMOTE_ADDR'], 
            $_SERVER['HTTP_USER_AGENT'] ?? '', 
            $expires_at
        ]);
        
        // Generate JWT token
        $jwt_payload = [
            'user_id' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'role' => $user['role'],
            'email_verified' => (bool)$user['email_verified'],
            'session_token' => $session_token
        ];
        
        $jwt_token = JWT::encode($jwt_payload);
        
        // Get user stats
        $stmt = $db->prepare("SELECT * FROM user_stats WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        $stats = $stmt->fetch();
        
        // Log successful login
        logMessage('INFO', 'User logged in successfully', ['user_id' => $user['id'], 'username' => $user['username']]);
        
        Response::success([
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'role' => $user['role'],
                'email_verified' => (bool)$user['email_verified'],
                'institution_id' => $user['institution_id'],
                'points' => (int)$user['points'],
                'streak_days' => (int)$user['streak_days']
            ],
            'stats' => $stats ?: [],
            'token' => $jwt_token
        ], 'Login successful');
        
    } catch (PDOException $e) {
        logMessage('ERROR', 'Login database error: ' . $e->getMessage());
        Response::serverError('Login failed');
    }
}

/**
 * Handle token verification
 */
function handleVerify() {
    try {
        $decoded = JWT::validateToken();
        
        Response::success([
            'valid' => true,
            'user_id' => $decoded['user_id'],
            'expires_at' => $decoded['exp']
        ], 'Token is valid');
        
    } catch (Exception $e) {
        Response::error('Invalid token', 401);
    }
}

/**
 * Handle get user profile
 */
function handleProfile() {
    global $db;
    
    $decoded = JWT::requireAuth();
    
    try {
        $stmt = $db->prepare("
            SELECT u.*, i.name as institution_name, us.*
            FROM users u
            LEFT JOIN institutions i ON u.institution_id = i.id
            LEFT JOIN user_stats us ON u.id = us.user_id
            WHERE u.id = ?
        ");
        $stmt->execute([$decoded['user_id']]);
        $user = $stmt->fetch();
        
        if (!$user) {
            Response::notFound('User not found');
        }
        
        Response::success([
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'role' => $user['role'],
                'email_verified' => (bool)$user['email_verified'],
                'institution_id' => $user['institution_id'],
                'institution_name' => $user['institution_name'],
                'profile_image' => $user['profile_image'],
                'bio' => $user['bio'],
                'github_username' => $user['github_username'],
                'linkedin_url' => $user['linkedin_url'],
                'points' => (int)$user['points'],
                'streak_days' => (int)$user['streak_days'],
                'created_at' => $user['created_at']
            ],
            'stats' => [
                'challenges_solved' => (int)$user['challenges_solved'],
                'battles_won' => (int)$user['battles_won'],
                'battles_lost' => (int)$user['battles_lost'],
                'hackathons_participated' => (int)$user['hackathons_participated'],
                'total_points' => (int)$user['total_points'],
                'current_streak' => (int)$user['current_streak'],
                'longest_streak' => (int)$user['longest_streak'],
                'preferred_language' => $user['preferred_language']
            ]
        ], 'Profile retrieved successfully');
        
    } catch (PDOException $e) {
        logMessage('ERROR', 'Profile retrieval error: ' . $e->getMessage());
        Response::serverError('Failed to retrieve profile');
    }
}

/**
 * Handle token refresh
 */
function handleRefresh() {
    $decoded = JWT::requireAuth();
    
    // Generate new JWT token
    $jwt_payload = [
        'user_id' => $decoded['user_id'],
        'username' => $decoded['username'],
        'email' => $decoded['email'],
        'role' => $decoded['role'],
        'email_verified' => $decoded['email_verified']
    ];
    
    $jwt_token = JWT::encode($jwt_payload);
    
    Response::success([
        'token' => $jwt_token
    ], 'Token refreshed successfully');
}

/**
 * Handle logout
 */
function handleLogout() {
    global $db;
    
    $decoded = JWT::requireAuth();
    
    try {
        // Remove session if exists
        if (isset($decoded['session_token'])) {
            $stmt = $db->prepare("DELETE FROM user_sessions WHERE session_token = ?");
            $stmt->execute([$decoded['session_token']]);
        }
        
        Response::success(null, 'Logged out successfully');
        
    } catch (PDOException $e) {
        logMessage('ERROR', 'Logout error: ' . $e->getMessage());
        Response::success(null, 'Logged out successfully'); // Don't fail logout
    }
}

/**
 * Handle forgot password
 */
function handleForgotPassword() {
    global $db;
    
    $data = Response::getJsonInput();
    Response::validateRequired($data, ['email']);
    
    $email = sanitizeInput($data['email']);
    
    if (!isValidEmail($email)) {
        Response::validationError(['email' => 'Invalid email format']);
    }
    
    try {
        // Check if user exists
        $stmt = $db->prepare("SELECT id FROM users WHERE email = ? AND is_active = 1");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if ($user) {
            // Generate reset token
            $reset_token = generateSecureToken();
            $expires_at = date('Y-m-d H:i:s', time() + 3600); // 1 hour
            
            $stmt = $db->prepare("
                INSERT INTO password_reset_tokens (user_id, token, expires_at) 
                VALUES (?, ?, ?)
            ");
            $stmt->execute([$user['id'], $reset_token, $expires_at]);
            
            // TODO: Send email with reset link
            // sendPasswordResetEmail($email, $reset_token);
        }
        
        // Always return success to prevent email enumeration
        Response::success(null, 'If the email exists, a password reset link has been sent');
        
    } catch (PDOException $e) {
        logMessage('ERROR', 'Forgot password error: ' . $e->getMessage());
        Response::serverError('Failed to process request');
    }
}

/**
 * Handle password reset
 */
function handleResetPassword() {
    global $db;
    
    $data = Response::getJsonInput();
    Response::validateRequired($data, ['token', 'password']);
    
    $token = sanitizeInput($data['token']);
    $password = $data['password'];
    
    if (!isValidPassword($password)) {
        Response::validationError([
            'password' => 'Password must be at least ' . PASSWORD_MIN_LENGTH . ' characters and contain uppercase, lowercase, and number'
        ]);
    }
    
    try {
        // Verify token
        $stmt = $db->prepare("
            SELECT user_id FROM password_reset_tokens 
            WHERE token = ? AND expires_at > NOW() AND used = 0
        ");
        $stmt->execute([$token]);
        $reset = $stmt->fetch();
        
        if (!$reset) {
            Response::error('Invalid or expired reset token', 400);
        }
        
        // Update password
        $password_hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => PASSWORD_COST]);
        
        $stmt = $db->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
        $stmt->execute([$password_hash, $reset['user_id']]);
        
        // Mark token as used
        $stmt = $db->prepare("UPDATE password_reset_tokens SET used = 1 WHERE token = ?");
        $stmt->execute([$token]);
        
        // Remove all user sessions
        $stmt = $db->prepare("DELETE FROM user_sessions WHERE user_id = ?");
        $stmt->execute([$reset['user_id']]);
        
        Response::success(null, 'Password reset successfully');
        
    } catch (PDOException $e) {
        logMessage('ERROR', 'Password reset error: ' . $e->getMessage());
        Response::serverError('Failed to reset password');
    }
}
?>
