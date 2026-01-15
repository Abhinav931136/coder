<?php
require_once __DIR__ . '/config/config.php';

$routes = [
  'auth' => [
    'POST /auth/register' => 'Register a new user',
    'POST /auth/login' => 'Login and receive JWT',
    'GET /auth/verify' => 'Verify JWT token validity',
    'GET /auth/profile' => 'Get current user profile (requires Authorization header)',
    'POST /auth/refresh' => 'Refresh JWT token',
    'POST /auth/logout' => 'Logout current session',
    'POST /auth/forgot-password' => 'Request password reset',
    'POST /auth/reset-password' => 'Reset password with token'
  ],
  'challenges' => [
    'GET /challenges/daily' => "Get today's daily challenge",
    'GET /challenges/list' => 'List challenges with pagination, ?page,&per_page,&difficulty,&search',
    'GET /challenges/get?id={id}' => 'Get a single challenge by ID',
    'POST /challenges/run' => 'Run code without submitting (requires Authorization)',
    'POST /challenges/submit' => 'Submit code for evaluation (requires Authorization)',
    'GET /challenges/submissions?challenge_id={id}' => 'Get your submissions for a challenge (requires Authorization)',
    'GET /challenges/leaderboard?challenge_id={id}&limit=10' => 'Get leaderboard for a challenge',
    'GET /challenges/languages' => 'List supported languages'
  ]
];

Response::success([
  'name' => APP_NAME . ' API',
  'version' => APP_VERSION,
  'base_url' => rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\') ?: '/',
  'routes' => $routes
], 'API is healthy');
