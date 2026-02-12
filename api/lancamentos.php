<?php
require 'db.php';
header('Content-Type: application/json');

$acao = $_GET['acao'] ?? '';

/* ===== LISTAR ===== */
if ($acao === 'listar') {
    $tipo = $_GET['tipo'];
    $mes  = $_GET['mes'];

    $stmt = $conn->prepare(
        "SELECT * FROM lancamentos
         WHERE tipo = ? AND mes = ?
         ORDER BY data DESC, id DESC"
    );
    $stmt->bind_param("ss", $tipo, $mes);
    $stmt->execute();

    echo json_encode($stmt->get_result()->fetch_all(MYSQLI_ASSOC));
    exit;
}

/* ===== SALVAR / EDITAR ===== */
if ($acao === 'salvar') {
    $id   = $_POST['id'] ?? null;
    $tipo = $_POST['tipo'];
    $data = $_POST['data'];
    $prod = $_POST['prod'];
    $rep  = $_POST['rep'] ?? 0;
    $liq  = $prod - $rep;
    $mes  = substr($data, 0, 7);
    $meta_dia = $_POST['meta_dia'] ?? null;


    if ($id) {
        // EDITAR
       $stmt = $conn->prepare(
    "UPDATE lancamentos
     SET data = ?, producao = ?, repasse = ?, liquido = ?, mes = ?, meta_dia = ?
     WHERE id = ?"
);
$stmt->bind_param("sdddssi", $data, $prod, $rep, $liq, $mes, $meta_dia, $id);

        $stmt->execute();
    } else {
        // NOVO
        $stmt = $conn->prepare(
    "INSERT INTO lancamentos (tipo, data, producao, repasse, liquido, mes, meta_dia)
     VALUES (?, ?, ?, ?, ?, ?, ?)"
);
$stmt->bind_param("ssdddss", $tipo, $data, $prod, $rep, $liq, $mes, $meta_dia);

        $stmt->execute();
    }

    echo json_encode(["ok" => true]);
    exit;
}

/* ===== EXCLUIR ===== */
if ($acao === 'excluir') {
    $id = $_POST['id'];

    $stmt = $conn->prepare("DELETE FROM lancamentos WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();

    echo json_encode(["ok" => true]);
    exit;
}

/* ===== LISTAR POR PERÍODO ===== */
if ($acao === 'listar_periodo') {
    $tipo   = $_GET['tipo'];
    $inicio = $_GET['inicio'];
    $fim    = $_GET['fim'];

    $stmt = $conn->prepare("
    SELECT *
    FROM lancamentos
    WHERE tipo = ?
      AND DATE(data) BETWEEN ? AND ?
    ORDER BY data ASC
");
    $stmt->bind_param("sss", $tipo, $inicio, $fim);
$stmt->execute();
echo json_encode($stmt->get_result()->fetch_all(MYSQLI_ASSOC));
exit;

}

