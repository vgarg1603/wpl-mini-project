<?php
header('Content-Type: application/json');
session_start();

// DB Config
$host = 'localhost';
$db = 'chatbot';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$action = $data['action'] ?? '';

// REGISTER
if ($action === 'register') {
    try {
        $username = $data['username'] ?? '';
        $email = $data['email'] ?? '';
        $password = password_hash($data['password'] ?? '', PASSWORD_BCRYPT);

        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = :email");
        $stmt->execute(['email' => $email]);

        if ($stmt->rowCount() > 0) {
            echo json_encode(['status' => 'error', 'message' => 'Email already registered']);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO users (username, email, password) VALUES (:username, :email, :password)");
        $stmt->execute([
            'username' => $username,
            'email' => $email,
            'password' => $password
        ]);

        echo json_encode(['status' => 'success', 'message' => 'User registered successfully']);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => 'Registration failed: ' . $e->getMessage()]);
    }
    exit;
}

// LOGIN
if ($action === 'login') {
    try {
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';

        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = :email");
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password'])) {
            session_regenerate_id(true);
            $_SESSION['user_id'] = $user['user_id'];
            $_SESSION['username'] = $user['username'];
            echo json_encode(['status' => 'success', 'message' => 'Login successful', 'username' => $user['username']]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Invalid credentials']);
        }
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => 'Login failed: ' . $e->getMessage()]);
    }
    exit;
}

// LOGOUT
if ($action === 'logout') {
    session_unset();
    session_destroy();
    echo json_encode(['status' => 'success', 'message' => 'Logged out successfully']);
    exit;
}

// STORE PROMPT + RESPONSE
if ($action === 'store_prompt_response') {
    try {
        if (!isset($_SESSION['user_id'])) {
            echo json_encode(['status' => 'error', 'message' => 'User not logged in']);
            exit;
        }

        $user_id = $_SESSION['user_id'];
        $prompt_text = $data['prompt_text'] ?? '';
        $response_text = $data['response_text'] ?? '';

        $stmt = $pdo->prepare("INSERT INTO prompts (prompt_text, response_text, user_id, created_at) VALUES (:prompt_text, :response_text, :user_id, NOW())");
        $stmt->execute([
            'prompt_text' => $prompt_text,
            'response_text' => $response_text,
            'user_id' => $user_id
        ]);

        echo json_encode(['status' => 'success', 'message' => 'Prompt and response saved successfully']);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => 'Failed to save prompt and response: ' . $e->getMessage()]);
    }
    exit;
}

if ($action === 'get_recent_chats') {
    try {
        if (!isset($_SESSION['user_id'])) {
            echo json_encode(['status' => 'error', 'message' => 'User not logged in']);
            exit;
        }

        $user_id = $_SESSION['user_id'];

        $stmt = $pdo->prepare("SELECT prompt_id, prompt_text, starred FROM prompts WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 10");
        $stmt->execute(['user_id' => $user_id]);
        $prompts = $stmt->fetchAll();

        echo json_encode(['status' => 'success', 'prompts' => $prompts]);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => 'Failed to fetch recent chats: ' . $e->getMessage()]);
    }
    exit;
}

// DELETE CHAT
if ($action === 'delete_prompt') {
    try {
        $prompt_id = $data['prompt_id'] ?? 0;
        $stmt = $pdo->prepare("DELETE FROM prompts WHERE prompt_id = :prompt_id AND user_id = :user_id");
        $stmt->execute(['prompt_id' => $prompt_id, 'user_id' => $_SESSION['user_id']]);
        echo json_encode(['status' => 'success']);
    } catch (error) {
        echo json_encode(['status' => 'error', 'message' => 'Failed to delete recent chats: ' . $e->getMessage()]);
    }
    exit;
}

// TOGGLE STAR
if ($action === 'toggle_star') {
    $prompt_id = $data['prompt_id'] ?? 0;
    $stmt = $pdo->prepare("UPDATE prompts SET starred = NOT starred WHERE prompt_id = :prompt_id AND user_id = :user_id");
    $stmt->execute(['prompt_id' => $prompt_id, 'user_id' => $_SESSION['user_id']]);
    echo json_encode(['status' => 'success']);
    exit;
}

// INVALID ACTION
echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
