<?php
/**
 * JWT Token Utility Class
 * Handles JWT token generation, validation, and decoding
 */

class JWT {
    
    /**
     * Generate JWT token
     */
    public static function encode($payload, $key = null) {
        $key = $key ?: JWT_SECRET_KEY;
        
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        
        $payload['iss'] = JWT_ISSUER;
        $payload['aud'] = JWT_AUDIENCE;
        $payload['iat'] = time();
        $payload['exp'] = time() + JWT_EXPIRATION_TIME;
        
        $payload = json_encode($payload);
        
        $base64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
        
        $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, $key, true);
        $base64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        return $base64Header . "." . $base64Payload . "." . $base64Signature;
    }
    
    /**
     * Decode and validate JWT token
     */
    public static function decode($jwt, $key = null) {
        $key = $key ?: JWT_SECRET_KEY;
        
        $tokenParts = explode('.', $jwt);
        if (count($tokenParts) !== 3) {
            throw new Exception('Invalid token format');
        }
        
        $header = base64_decode(str_replace(['-', '_'], ['+', '/'], $tokenParts[0]));
        $payload = base64_decode(str_replace(['-', '_'], ['+', '/'], $tokenParts[1]));
        $signatureProvided = $tokenParts[2];
        
        $base64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
        
        $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, $key, true);
        $base64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        if (!hash_equals($base64Signature, $signatureProvided)) {
            throw new Exception('Invalid token signature');
        }
        
        $payloadData = json_decode($payload, true);
        
        if (!$payloadData) {
            throw new Exception('Invalid token payload');
        }
        
        // Check expiration
        if (isset($payloadData['exp']) && $payloadData['exp'] < time()) {
            throw new Exception('Token has expired');
        }
        
        // Check issuer
        if (isset($payloadData['iss']) && $payloadData['iss'] !== JWT_ISSUER) {
            throw new Exception('Invalid token issuer');
        }
        
        // Check audience
        if (isset($payloadData['aud']) && $payloadData['aud'] !== JWT_AUDIENCE) {
            throw new Exception('Invalid token audience');
        }
        
        return $payloadData;
    }
    
    /**
     * Get token from Authorization header
     */
    public static function getBearerToken() {
        $headers = null;
        
        if (isset($_SERVER['Authorization'])) {
            $headers = trim($_SERVER["Authorization"]);
        } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
        } else if (function_exists('apache_request_headers')) {
            $requestHeaders = apache_request_headers();
            $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
            if (isset($requestHeaders['Authorization'])) {
                $headers = trim($requestHeaders['Authorization']);
            }
        }
        
        if (!empty($headers)) {
            if (preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
                return $matches[1];
            }
        }
        
        return null;
    }
    
    /**
     * Validate and get user from token
     */
    public static function validateToken() {
        try {
            $token = self::getBearerToken();
            
            if (!$token) {
                throw new Exception('Authorization token not found');
            }
            
            $decoded = self::decode($token);
            
            if (!isset($decoded['user_id'])) {
                throw new Exception('Invalid token payload - missing user_id');
            }
            
            return $decoded;
            
        } catch (Exception $e) {
            throw new Exception('Token validation failed: ' . $e->getMessage());
        }
    }
    
    /**
     * Middleware to protect routes
     */
    public static function requireAuth() {
        try {
            return self::validateToken();
        } catch (Exception $e) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized: ' . $e->getMessage()]);
            exit;
        }
    }
    
    /**
     * Middleware to protect admin routes
     */
    public static function requireAdmin() {
        try {
            $decoded = self::validateToken();
            
            if (!isset($decoded['role']) || !in_array($decoded['role'], ['platform_admin', 'instructor'])) {
                throw new Exception('Insufficient permissions');
            }
            
            return $decoded;
            
        } catch (Exception $e) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: ' . $e->getMessage()]);
            exit;
        }
    }
}
?>
