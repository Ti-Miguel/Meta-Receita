<?php
require 'db.php';
header('Content-Type: application/json');

$acao = $_GET['acao'] ?? '';

if ($acao === 'salvar') {
    $tipo = $_POST['tipo'];
    $mes  = $_POST['mes'];
    $meta = $_POST['meta'];
    $dias = $_POST['dias'];

    $sql = "
        INSERT INTO metas (tipo, mes, meta, dias)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            meta = VALUES(meta),
            dias = VALUES(dias)
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssdi", $tipo, $mes, $meta, $dias);
    $stmt->execute();

    echo json_encode(["ok" => true]);
    exit;
}

if ($acao === 'buscar') {
    $tipo = $_GET['tipo'];
    $mes  = $_GET['mes'];

    $stmt = $conn->prepare(
        "SELECT meta, dias FROM metas WHERE tipo = ? AND mes = ?"
    );
    $stmt->bind_param("ss", $tipo, $mes);
    $stmt->execute();

    $res = $stmt->get_result()->fetch_assoc();
    echo json_encode($res ?: []);
}
