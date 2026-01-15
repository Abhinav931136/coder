<?php
/**
 * InternDesire Configuration
 * Central configuration file for the application
 */

// Error reporting (set to 0 in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Timezone
date_default_timezone_set('UTC');

// CORS headers for React frontend
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Application settings
define('APP_NAME', 'InternDesire');
define('APP_VERSION', '1.0.0');
define('APP_URL', 'http://localhost:8080');
define('API_URL', 'http://localhost:8080/api');

// Security settings
define('JWT_SECRET_KEY', 'your-super-secret-jwt-key-change-in-production-2024');
define('JWT_ISSUER', 'interndesire.com');
define('JWT_AUDIENCE', 'interndesire-users');
define('JWT_EXPIRATION_TIME', 3600 * 24 * 7); // 7 days

// Password settings
define('PASSWORD_MIN_LENGTH', 8);
define('PASSWORD_COST', 12); // bcrypt cost

// Rate limiting
define('RATE_LIMIT_REQUESTS', 100);
define('RATE_LIMIT_WINDOW', 3600); // 1 hour

// File upload settings
define('UPLOAD_MAX_SIZE', 10 * 1024 * 1024); // 10MB
define('UPLOAD_ALLOWED_TYPES', ['jpg', 'jpeg', 'png', 'pdf', 'zip']);
define('UPLOAD_PATH', __DIR__ . '/../../uploads/');

// Email settings (configure with your SMTP settings)
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_USERNAME', 'your-email@gmail.com');
define('SMTP_PASSWORD', 'your-app-password');
define('SMTP_FROM_EMAIL', 'noreply@interndesire.com');
define('SMTP_FROM_NAME', 'InternDesire Platform');

// Piston API settings for code execution
define('PISTON_API_URL', 'https://emkc.org/api/v2/piston');
define('PISTON_API_TIMEOUT', 30); // seconds

// Challenge settings
define('CODE_EXECUTION_TIMEOUT', 5000); // milliseconds
define('CODE_MEMORY_LIMIT', 256); // MB
define('MAX_CODE_LENGTH', 50000); // characters

// Supported programming languages
define('SUPPORTED_LANGUAGES', [
    'python' => ['name' => 'Python', 'version' => '3.10.0', 'piston' => 'python'],
    'java' => ['name' => 'Java', 'version' => '15.0.2', 'piston' => 'java'],
    'cpp' => ['name' => 'C++', 'version' => 'g++ 9.4.0', 'piston' => 'cpp'],
    'javascript' => ['name' => 'JavaScript', 'version' => 'Node.js 16.14.0', 'piston' => 'javascript'],
    'go' => ['name' => 'Go', 'version' => '1.16.2', 'piston' => 'go'],
    'csharp' => ['name' => 'C#', 'version' => '.NET 5.0', 'piston' => 'csharp'],
    'rust' => ['name' => 'Rust', 'version' => '1.68.2', 'piston' => 'rust']
]);

// Battle settings
define('BATTLE_DEFAULT_DURATION', 30); // minutes
define('BATTLE_MAX_DURATION', 120); // minutes

// Hackathon settings
define('HACKATHON_MAX_TEAM_SIZE', 6);
define('HACKATHON_MIN_DURATION', 24); // hours
define('HACKATHON_MAX_DURATION', 168); // hours (1 week)

// Certificate settings
define('CERTIFICATE_TEMPLATE_PATH', __DIR__ . '/../../templates/certificate.html');
define('CERTIFICATE_LOGO_URL', 'https://interndesire.com/logo.png');
define('CERTIFICATE_OUTPUT_PATH', __DIR__ . '/../../certificates/');

// Logging
define('LOG_LEVEL', 'INFO'); // DEBUG, INFO, WARNING, ERROR
define('LOG_FILE', __DIR__ . '/../../logs/app.log');

// Ensure required directories exist
$required_dirs = [
    dirname(UPLOAD_PATH),
    dirname(CERTIFICATE_OUTPUT_PATH),
    dirname(LOG_FILE)
];

foreach ($required_dirs as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

// Security function to sanitize input
function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

// Function to validate email
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

// Function to validate password strength
function isValidPassword($password) {
    return strlen($password) >= PASSWORD_MIN_LENGTH &&
           preg_match('/[A-Z]/', $password) &&
           preg_match('/[a-z]/', $password) &&
           preg_match('/[0-9]/', $password);
}

// Function to generate secure random token
function generateSecureToken($length = 32) {
    return bin2hex(random_bytes($length));
}

// Function to log messages
function logMessage($level, $message, $context = []) {
    $log_levels = ['DEBUG' => 0, 'INFO' => 1, 'WARNING' => 2, 'ERROR' => 3];
    $current_level = $log_levels[LOG_LEVEL] ?? 1;
    
    if ($log_levels[$level] >= $current_level) {
        $timestamp = date('Y-m-d H:i:s');
        $context_str = !empty($context) ? ' ' . json_encode($context) : '';
        $log_entry = "[{$timestamp}] {$level}: {$message}{$context_str}\n";
        file_put_contents(LOG_FILE, $log_entry, FILE_APPEND | LOCK_EX);
    }
}

// Set error handler
set_error_handler(function($severity, $message, $file, $line) {
    logMessage('ERROR', "PHP Error: {$message} in {$file} on line {$line}");
});

// Set exception handler
set_exception_handler(function($exception) {
    logMessage('ERROR', "Uncaught Exception: " . $exception->getMessage(), [
        'file' => $exception->getFile(),
        'line' => $exception->getLine(),
        'trace' => $exception->getTraceAsString()
    ]);
    
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
});
?>
