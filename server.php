<?php
header('Content-Type: application/json');
session_start();

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

// Register
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
        $stmt->execute(['username' => $username, 'email' => $email, 'password' => $password]);

        echo json_encode(['status' => 'success', 'message' => 'User registered successfully']);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => 'Registration failed: ' . $e->getMessage()]);
    }
    exit;
}

// Login
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

// Logout
if ($action === 'logout') {
    session_unset();
    session_destroy();
    echo json_encode(['status' => 'success', 'message' => 'Logged out successfully']);
    exit;
}

echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
