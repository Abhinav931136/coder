<?php
/**
 * Challenges API Endpoints
 * Handles challenge retrieval, code submission, and execution via Piston API
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
Response::checkRateLimit($identifier, 'challenges_' . $endpoint);

try {
    switch ($endpoint) {
        case 'daily':
            if ($method !== 'GET') {
                Response::methodNotAllowed();
            }
            handleDailyChallenge();
            break;
            
        case 'list':
            if ($method !== 'GET') {
                Response::methodNotAllowed();
            }
            handleChallengesList();
            break;
            
        case 'get':
            if ($method !== 'GET') {
                Response::methodNotAllowed();
            }
            handleGetChallenge();
            break;
            
        case 'submit':
            if ($method !== 'POST') {
                Response::methodNotAllowed();
            }
            handleSubmitCode();
            break;
            
        case 'run':
            if ($method !== 'POST') {
                Response::methodNotAllowed();
            }
            handleRunCode();
            break;
            
        case 'submissions':
            if ($method !== 'GET') {
                Response::methodNotAllowed();
            }
            handleGetSubmissions();
            break;
            
        case 'leaderboard':
            if ($method !== 'GET') {
                Response::methodNotAllowed();
            }
            handleLeaderboard();
            break;
            
        case 'languages':
            if ($method !== 'GET') {
                Response::methodNotAllowed();
            }
            handleSupportedLanguages();
            break;
            
        default:
            Response::notFound('Challenge endpoint not found');
    }
    
} catch (Exception $e) {
    logMessage('ERROR', 'Challenges API Error: ' . $e->getMessage());
    Response::serverError();
}

/**
 * Get today's daily challenge
 */
function handleDailyChallenge() {
    global $db;
    
    try {
        $stmt = $db->prepare("
            SELECT id, title, description, difficulty, tags, input_format, 
                   output_format, constraints, examples, supported_languages, 
                   points, publish_date
            FROM challenges 
            WHERE is_daily = 1 AND publish_date = CURDATE() AND is_active = 1
        ");
        $stmt->execute();
        $challenge = $stmt->fetch();
        
        if (!$challenge) {
            Response::notFound('No daily challenge available for today');
        }
        
        // Parse JSON fields
        $challenge['tags'] = json_decode($challenge['tags'], true);
        $challenge['examples'] = json_decode($challenge['examples'], true);
        $challenge['supported_languages'] = json_decode($challenge['supported_languages'], true);
        
        Response::success([
            'challenge' => $challenge
        ], 'Daily challenge retrieved successfully');
        
    } catch (PDOException $e) {
        logMessage('ERROR', 'Daily challenge error: ' . $e->getMessage());
        Response::serverError('Failed to retrieve daily challenge');
    }
}

/**
 * Get list of challenges with pagination
 */
function handleChallengesList() {
    global $db;
    
    $page = max(1, (int)($_GET['page'] ?? 1));
    $per_page = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
    $difficulty = $_GET['difficulty'] ?? '';
    $search = $_GET['search'] ?? '';
    
    try {
        $where_conditions = ['is_active = 1'];
        $params = [];
        
        if ($difficulty && in_array($difficulty, ['easy', 'medium', 'hard'])) {
            $where_conditions[] = 'difficulty = ?';
            $params[] = $difficulty;
        }
        
        if ($search) {
            $where_conditions[] = '(title LIKE ? OR description LIKE ?)';
            $search_term = '%' . $search . '%';
            $params[] = $search_term;
            $params[] = $search_term;
        }
        
        $where_clause = implode(' AND ', $where_conditions);
        
        // Get total count
        $count_stmt = $db->prepare("SELECT COUNT(*) as total FROM challenges WHERE $where_clause");
        $count_stmt->execute($params);
        $total = $count_stmt->fetch()['total'];
        
        // Get challenges
        $offset = ($page - 1) * $per_page;
        $stmt = $db->prepare("
            SELECT id, title, description, difficulty, tags, points, 
                   publish_date, is_daily,
                   (SELECT COUNT(*) FROM submissions WHERE challenge_id = challenges.id AND status = 'accepted') as solved_count
            FROM challenges 
            WHERE $where_clause
            ORDER BY publish_date DESC, id DESC
            LIMIT ? OFFSET ?
        ");
        
        $params[] = $per_page;
        $params[] = $offset;
        $stmt->execute($params);
        $challenges = $stmt->fetchAll();
        
        // Parse JSON fields
        foreach ($challenges as &$challenge) {
            $challenge['tags'] = json_decode($challenge['tags'], true);
            $challenge['solved_count'] = (int)$challenge['solved_count'];
        }
        
        Response::paginated($challenges, $page, $per_page, $total, 'Challenges retrieved successfully');
        
    } catch (PDOException $e) {
        logMessage('ERROR', 'Challenges list error: ' . $e->getMessage());
        Response::serverError('Failed to retrieve challenges');
    }
}

/**
 * Get specific challenge by ID
 */
function handleGetChallenge() {
    global $db;
    
    $challenge_id = (int)($_GET['id'] ?? 0);
    
    if (!$challenge_id) {
        Response::error('Challenge ID is required', 400);
    }
    
    try {
        $stmt = $db->prepare("
            SELECT id, title, description, difficulty, tags, input_format, 
                   output_format, constraints, examples, supported_languages, 
                   points, publish_date, is_daily,
                   (SELECT COUNT(*) FROM submissions WHERE challenge_id = ? AND status = 'accepted') as solved_count
            FROM challenges 
            WHERE id = ? AND is_active = 1
        ");
        $stmt->execute([$challenge_id, $challenge_id]);
        $challenge = $stmt->fetch();
        
        if (!$challenge) {
            Response::notFound('Challenge not found');
        }
        
        // Parse JSON fields
        $challenge['tags'] = json_decode($challenge['tags'], true);
        $challenge['examples'] = json_decode($challenge['examples'], true);
        $challenge['supported_languages'] = json_decode($challenge['supported_languages'], true);
        $challenge['solved_count'] = (int)$challenge['solved_count'];
        
        // Check if user has solved this challenge (if authenticated)
        $user_solved = false;
        try {
            $decoded = JWT::validateToken();
            $stmt = $db->prepare("
                SELECT id FROM submissions 
                WHERE user_id = ? AND challenge_id = ? AND status = 'accepted'
                LIMIT 1
            ");
            $stmt->execute([$decoded['user_id'], $challenge_id]);
            $user_solved = (bool)$stmt->fetch();
        } catch (Exception $e) {
            // User not authenticated, ignore
        }
        
        Response::success([
            'challenge' => $challenge,
            'user_solved' => $user_solved
        ], 'Challenge retrieved successfully');
        
    } catch (PDOException $e) {
        logMessage('ERROR', 'Get challenge error: ' . $e->getMessage());
        Response::serverError('Failed to retrieve challenge');
    }
}

/**
 * Submit code for evaluation
 */
function handleSubmitCode() {
    global $db;
    
    $decoded = JWT::requireAuth();
    $data = Response::getJsonInput();
    
    Response::validateRequired($data, ['challenge_id', 'language', 'code']);
    
    $challenge_id = (int)$data['challenge_id'];
    $language = sanitizeInput($data['language']);
    $code = $data['code'];
    
    // Validate inputs
    if (!$challenge_id) {
        Response::error('Invalid challenge ID', 400);
    }
    
    if (!array_key_exists($language, SUPPORTED_LANGUAGES)) {
        Response::error('Unsupported programming language', 400);
    }
    
    if (strlen($code) > MAX_CODE_LENGTH) {
        Response::error('Code is too long', 400);
    }
    
    try {
        // Get challenge details
        $stmt = $db->prepare("
            SELECT id, test_cases, time_limit, memory_limit, points, supported_languages
            FROM challenges 
            WHERE id = ? AND is_active = 1
        ");
        $stmt->execute([$challenge_id]);
        $challenge = $stmt->fetch();
        
        if (!$challenge) {
            Response::notFound('Challenge not found');
        }
        
        $supported_languages = json_decode($challenge['supported_languages'], true);
        if (!in_array($language, $supported_languages)) {
            Response::error('Language not supported for this challenge', 400);
        }
        
        // Create submission record
        $stmt = $db->prepare("
            INSERT INTO submissions (user_id, challenge_id, language, code, status) 
            VALUES (?, ?, ?, ?, 'pending')
        ");
        $stmt->execute([$decoded['user_id'], $challenge_id, $language, $code]);
        $submission_id = $db->lastInsertId();
        
        // Execute code against test cases
        $test_cases = json_decode($challenge['test_cases'], true);
        $results = executeCodeWithTestCases($code, $language, $test_cases, $challenge['time_limit'], $challenge['memory_limit']);
        
        // Calculate score
        $passed_tests = array_filter($results['test_results'], function($result) {
            return $result['status'] === 'passed';
        });
        $score = 0;
        $status = 'wrong_answer';
        
        if (count($passed_tests) === count($test_cases)) {
            $score = $challenge['points'];
            $status = 'accepted';
        } else if ($results['status'] === 'compilation_error') {
            $status = 'compilation_error';
        } else if ($results['status'] === 'runtime_error') {
            $status = 'runtime_error';
        } else if ($results['status'] === 'time_limit_exceeded') {
            $status = 'time_limit_exceeded';
        } else if ($results['status'] === 'memory_limit_exceeded') {
            $status = 'memory_limit_exceeded';
        }
        
        // Update submission
        $stmt = $db->prepare("
            UPDATE submissions 
            SET status = ?, execution_time = ?, memory_used = ?, test_results = ?, 
                score = ?, error_message = ?
            WHERE id = ?
        ");
        $stmt->execute([
            $status,
            $results['execution_time'],
            $results['memory_used'],
            json_encode($results['test_results']),
            $score,
            $results['error_message'],
            $submission_id
        ]);
        
        // Update user stats if accepted
        if ($status === 'accepted') {
            // Check if first time solving this challenge
            $stmt = $db->prepare("
                SELECT COUNT(*) as count FROM submissions 
                WHERE user_id = ? AND challenge_id = ? AND status = 'accepted' AND id < ?
            ");
            $stmt->execute([$decoded['user_id'], $challenge_id, $submission_id]);
            $previous_accepted = $stmt->fetch()['count'];
            
            if ($previous_accepted == 0) {
                // First time solving, update stats
                $stmt = $db->prepare("
                    UPDATE user_stats 
                    SET challenges_solved = challenges_solved + 1,
                        total_points = total_points + ?
                    WHERE user_id = ?
                ");
                $stmt->execute([$score, $decoded['user_id']]);
                
                // Update user points
                $stmt = $db->prepare("
                    UPDATE users 
                    SET points = points + ?
                    WHERE id = ?
                ");
                $stmt->execute([$score, $decoded['user_id']]);
            }
        }
        
        Response::success([
            'submission_id' => $submission_id,
            'status' => $status,
            'score' => $score,
            'execution_time' => $results['execution_time'],
            'memory_used' => $results['memory_used'],
            'test_results' => $results['test_results'],
            'error_message' => $results['error_message']
        ], 'Code submitted and evaluated successfully');
        
    } catch (PDOException $e) {
        logMessage('ERROR', 'Submit code error: ' . $e->getMessage());
        Response::serverError('Failed to submit code');
    }
}

/**
 * Run code without submitting (for testing)
 */
function handleRunCode() {
    $decoded = JWT::requireAuth();
    $data = Response::getJsonInput();
    
    Response::validateRequired($data, ['language', 'code', 'input']);
    
    $language = sanitizeInput($data['language']);
    $code = $data['code'];
    $input = $data['input'];
    
    if (!array_key_exists($language, SUPPORTED_LANGUAGES)) {
        Response::error('Unsupported programming language', 400);
    }
    
    if (strlen($code) > MAX_CODE_LENGTH) {
        Response::error('Code is too long', 400);
    }
    
    try {
        $result = executeCode($code, $language, $input);
        
        Response::success([
            'output' => $result['output'],
            'error' => $result['error'],
            'execution_time' => $result['execution_time'],
            'memory_used' => $result['memory_used'],
            'status' => $result['status']
        ], 'Code executed successfully');
        
    } catch (Exception $e) {
        logMessage('ERROR', 'Run code error: ' . $e->getMessage());
        Response::serverError('Failed to execute code');
    }
}

/**
 * Get user submissions for a challenge
 */
function handleGetSubmissions() {
    global $db;
    
    $decoded = JWT::requireAuth();
    $challenge_id = (int)($_GET['challenge_id'] ?? 0);
    $page = max(1, (int)($_GET['page'] ?? 1));
    $per_page = min(20, max(1, (int)($_GET['per_page'] ?? 10)));
    
    if (!$challenge_id) {
        Response::error('Challenge ID is required', 400);
    }
    
    try {
        // Get total count
        $stmt = $db->prepare("
            SELECT COUNT(*) as total 
            FROM submissions 
            WHERE user_id = ? AND challenge_id = ?
        ");
        $stmt->execute([$decoded['user_id'], $challenge_id]);
        $total = $stmt->fetch()['total'];
        
        // Get submissions
        $offset = ($page - 1) * $per_page;
        $stmt = $db->prepare("
            SELECT id, language, status, execution_time, memory_used, score, 
                   error_message, submitted_at
            FROM submissions 
            WHERE user_id = ? AND challenge_id = ?
            ORDER BY submitted_at DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->execute([$decoded['user_id'], $challenge_id, $per_page, $offset]);
        $submissions = $stmt->fetchAll();
        
        Response::paginated($submissions, $page, $per_page, $total, 'Submissions retrieved successfully');
        
    } catch (PDOException $e) {
        logMessage('ERROR', 'Get submissions error: ' . $e->getMessage());
        Response::serverError('Failed to retrieve submissions');
    }
}

/**
 * Get challenge leaderboard
 */
function handleLeaderboard() {
    global $db;
    
    $challenge_id = (int)($_GET['challenge_id'] ?? 0);
    $limit = min(100, max(1, (int)($_GET['limit'] ?? 10)));
    
    if (!$challenge_id) {
        Response::error('Challenge ID is required', 400);
    }
    
    try {
        $stmt = $db->prepare("
            SELECT u.username, u.first_name, u.last_name, s.score, s.execution_time, s.submitted_at
            FROM submissions s
            JOIN users u ON s.user_id = u.id
            WHERE s.challenge_id = ? AND s.status = 'accepted'
            ORDER BY s.score DESC, s.execution_time ASC, s.submitted_at ASC
            LIMIT ?
        ");
        $stmt->execute([$challenge_id, $limit]);
        $leaderboard = $stmt->fetchAll();
        
        Response::success([
            'leaderboard' => $leaderboard,
            'challenge_id' => $challenge_id
        ], 'Leaderboard retrieved successfully');
        
    } catch (PDOException $e) {
        logMessage('ERROR', 'Leaderboard error: ' . $e->getMessage());
        Response::serverError('Failed to retrieve leaderboard');
    }
}

/**
 * Get supported programming languages
 */
function handleSupportedLanguages() {
    Response::success([
        'languages' => SUPPORTED_LANGUAGES
    ], 'Supported languages retrieved successfully');
}

/**
 * Execute code using Piston API
 */
function executeCode($code, $language, $input = '') {
    $language_config = SUPPORTED_LANGUAGES[$language];
    
    $payload = [
        'language' => $language_config['piston'],
        'version' => $language_config['version'],
        'files' => [
            [
                'content' => $code
            ]
        ],
        'stdin' => $input,
        'compile_timeout' => 10000,
        'run_timeout' => CODE_EXECUTION_TIMEOUT
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, PISTON_API_URL . '/execute');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, PISTON_API_TIMEOUT);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($http_code !== 200 || !$response) {
        throw new Exception('Code execution service unavailable');
    }
    
    $result = json_decode($response, true);
    
    if (!$result) {
        throw new Exception('Invalid response from code execution service');
    }
    
    $status = 'success';
    $error_message = null;
    
    if (isset($result['compile']) && $result['compile']['code'] !== 0) {
        $status = 'compilation_error';
        $error_message = $result['compile']['stderr'];
    } else if (isset($result['run']) && $result['run']['code'] !== 0) {
        $status = 'runtime_error';
        $error_message = $result['run']['stderr'];
    }
    
    return [
        'output' => $result['run']['stdout'] ?? '',
        'error' => $error_message,
        'execution_time' => (int)($result['run']['signal'] ?? 0),
        'memory_used' => 0, // Piston doesn't provide memory usage
        'status' => $status
    ];
}

/**
 * Execute code against test cases
 */
function executeCodeWithTestCases($code, $language, $test_cases, $time_limit, $memory_limit) {
    $results = [
        'test_results' => [],
        'execution_time' => 0,
        'memory_used' => 0,
        'status' => 'success',
        'error_message' => null
    ];
    
    foreach ($test_cases as $index => $test_case) {
        try {
            $result = executeCode($code, $language, $test_case['input']);
            
            $passed = trim($result['output']) === trim($test_case['output']);
            
            $results['test_results'][] = [
                'test_case' => $index + 1,
                'input' => $test_case['input'],
                'expected_output' => $test_case['output'],
                'actual_output' => $result['output'],
                'status' => $passed ? 'passed' : 'failed',
                'execution_time' => $result['execution_time'],
                'error' => $result['error']
            ];
            
            $results['execution_time'] = max($results['execution_time'], $result['execution_time']);
            
            if ($result['status'] !== 'success') {
                $results['status'] = $result['status'];
                $results['error_message'] = $result['error'];
                break;
            }
            
        } catch (Exception $e) {
            $results['status'] = 'runtime_error';
            $results['error_message'] = $e->getMessage();
            break;
        }
    }
    
    return $results;
}
?>
