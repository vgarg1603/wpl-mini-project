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

$prompt_id = $_GET['prompt_id'] ?? null;

if ($prompt_id) {
    try {
        $stmt = $pdo->prepare("SELECT prompt_text, response_text FROM prompts WHERE prompt_id = ?");
        $stmt->execute([$prompt_id]);
        $chat = $stmt->fetch();

        if ($chat) {
            echo json_encode([
                'success' => true,
                'prompt_text' => $chat['prompt_text'],
                'response_text' => $chat['response_text']
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Prompt not found.']);
        }
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid prompt ID.']);
}
