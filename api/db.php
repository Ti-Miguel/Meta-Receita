<?php
$host = "localhost";
$usuario = "u380360322_metaliquida";
$senha = "Miguel847829";
$banco = "u380360322_metaliquida";

$conn = new mysqli($host, $usuario, $senha, $banco);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["erro" => "Erro na conexão"]);
    exit;
}

$conn->set_charset("utf8");
