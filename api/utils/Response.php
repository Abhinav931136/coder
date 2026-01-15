<?php
/**
 * API Response Utility Class
 * Standardizes JSON API responses across the application
 */

class Response {
    
    /**
     * Send success response
     */
    public static function success($data = null, $message = 'Success', $status_code = 200) {
        http_response_code($status_code);
        
        $response = [
            'success' => true,
            'message' => $message,
            'timestamp' => date('c'),
            'status_code' => $status_code
        ];
        
        if ($data !== null) {
            $response['data'] = $data;
        }
        
        echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        exit;
    }
    
    /**
     * Send error response
     */
    public static function error($message = 'An error occurred', $status_code = 400, $errors = null) {
        http_response_code($status_code);
        
        $response = [
            'success' => false,
            'message' => $message,
            'timestamp' => date('c'),
            'status_code' => $status_code
        ];
        
        if ($errors !== null) {
            $response['errors'] = $errors;
        }
        
        // Log error for debugging
        logMessage('ERROR', "API Error: {$message}", [
            'status_code' => $status_code,
            'errors' => $errors,
            'request_uri' => $_SERVER['REQUEST_URI'] ?? '',
            'request_method' => $_SERVER['REQUEST_METHOD'] ?? '',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]);
        
        echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        exit;
    }
    
    /**
     * Send validation error response
     */
    public static function validationError($errors, $message = 'Validation failed') {
        self::error($message, 422, $errors);
    }
    
    /**
     * Send unauthorized response
     */
    public static function unauthorized($message = 'Unauthorized access') {
        self::error($message, 401);
    }
    
    /**
     * Send forbidden response
     */
    public static function forbidden($message = 'Access forbidden') {
        self::error($message, 403);
    }
    
    /**
     * Send not found response
     */
    public static function notFound($message = 'Resource not found') {
        self::error($message, 404);
    }
    
    /**
     * Send method not allowed response
     */
    public static function methodNotAllowed($message = 'Method not allowed') {
        self::error($message, 405);
    }
    
    /**
     * Send server error response
     */
    public static function serverError($message = 'Internal server error') {
        self::error($message, 500);
    }
    
    /**
     * Send paginated response
     */
    public static function paginated($data, $page, $per_page, $total, $message = 'Success') {
        $total_pages = ceil($total / $per_page);
        
        $pagination = [
            'current_page' => (int)$page,
            'per_page' => (int)$per_page,
            'total' => (int)$total,
            'total_pages' => (int)$total_pages,
            'has_more' => $page < $total_pages
        ];
        
        self::success([
            'items' => $data,
            'pagination' => $pagination
        ], $message);
    }
    
    /**
     * Get request body as JSON
     */
    public static function getJsonInput() {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            self::error('Invalid JSON format', 400);
        }
        
        return $data ?: [];
    }
    
    /**
     * Validate required fields
     */
    public static function validateRequired($data, $required_fields) {
        $missing = [];
        
        foreach ($required_fields as $field) {
            if (!isset($data[$field]) || empty(trim($data[$field]))) {
                $missing[] = $field;
            }
        }
        
        if (!empty($missing)) {
            self::validationError([
                'missing_fields' => $missing
            ], 'Required fields are missing');
        }
        
        return true;
    }
    
    /**
     * Rate limiting check
     */
    public static function checkRateLimit($identifier, $endpoint = '') {
        global $db;
        
        try {
            $window_start = date('Y-m-d H:i:s', time() - RATE_LIMIT_WINDOW);
            
            // Clean old entries
            $stmt = $db->prepare("DELETE FROM rate_limits WHERE window_start < ?");
            $stmt->execute([$window_start]);
            
            // Check current requests
            $stmt = $db->prepare("
                SELECT requests_count 
                FROM rate_limits 
                WHERE identifier = ? AND endpoint = ? AND window_start >= ?
            ");
            $stmt->execute([$identifier, $endpoint, $window_start]);
            $current = $stmt->fetch();
            
            if ($current && $current['requests_count'] >= RATE_LIMIT_REQUESTS) {
                self::error('Rate limit exceeded', 429);
            }
            
            // Update or insert rate limit entry
            $stmt = $db->prepare("
                INSERT INTO rate_limits (identifier, endpoint, requests_count, window_start) 
                VALUES (?, ?, 1, NOW()) 
                ON DUPLICATE KEY UPDATE 
                requests_count = requests_count + 1,
                window_start = IF(window_start < ?, NOW(), window_start)
            ");
            $stmt->execute([$identifier, $endpoint, $window_start]);
            
        } catch (Exception $e) {
            // Log error but don't block request
            logMessage('WARNING', 'Rate limiting error: ' . $e->getMessage());
        }
    }
    
    /**
     * CSRF protection
     */
    public static function validateCSRF($token) {
        if (!isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $token)) {
            self::error('Invalid CSRF token', 403);
        }
    }
    
    /**
     * Generate CSRF token
     */
    public static function generateCSRF() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = generateSecureToken();
        }
        
        return $_SESSION['csrf_token'];
    }
}
?>
