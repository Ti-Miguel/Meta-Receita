let tipoAtual = 'odo';
let modoAtual = 'diario';
let configAtual = null;
let lancamentosAtuais = [];

function mesAtual() {
    return new Date().toISOString().slice(0, 7);
}

function formatarData(d) {
    return new Date(d).toLocaleDateString('pt-BR');
}

/* ===== CONTROLES ===== */
function trocarTipo(tipo) {
    tipoAtual = tipo;
    document.body.className = tipo;

    document.getElementById('btn-odo').classList.remove('ativo');
    document.getElementById('btn-med').classList.remove('ativo');
    document.getElementById(`btn-${tipo}`).classList.add('ativo');

    carregarDados();
}

function trocarModo(modo) {
    modoAtual = modo;

    document.getElementById('btn-diario').classList.remove('ativo');
    document.getElementById('btn-semanal').classList.remove('ativo');
    document.getElementById(`btn-${modo}`).classList.add('ativo');

    render();
}

/* ===== BUSCA DADOS ===== */
function carregarDados() {
    const mes = mesAtual();

    // buscar configuração
    fetch(`../api/config.php?acao=buscar&tipo=${tipoAtual}&mes=${mes}`)
        .then(res => res.json())
        .then(config => {
            if (!config || !config.meta) {
                mostrarVazio();
                return;
            }

            configAtual = config;

            // buscar lançamentos
            fetch(`../api/lancamentos.php?acao=listar&tipo=${tipoAtual}&mes=${mes}`)
                .then(res => res.json())
                .then(lancamentos => {
                    lancamentosAtuais = lancamentos.map(l => ({
                        data: l.data,
                        liq: Number(l.liquido)
                    }));

                    if (!lancamentosAtuais.length) {
                        mostrarVazio();
                        return;
                    }

                    render();
                });
        });
}

/* ===== RENDER ===== */
function render() {
    modoAtual === 'diario' ? renderDiario() : renderSemanal();
}

function ultimoLancamento() {
    return lancamentosAtuais
        .slice()
        .sort((a, b) => new Date(b.data) - new Date(a.data))[0];
}

/* ===== DIÁRIO ===== */
function renderDiario() {
    const metaDiaria = configAtual.meta / configAtual.dias;

    const ult = ultimoLancamento();
    if (!ult) return mostrarVazio();

    const produzido = ult.liq;
    const diferenca = produzido - metaDiaria;

    const acumulado = lancamentosAtuais.reduce((s, l) => s + l.liq, 0);
    const diasRestantes = Math.max(
        configAtual.dias - lancamentosAtuais.length,
        1
    );

    const novaMeta = (configAtual.meta - acumulado) / diasRestantes;

    preencher(
        'ACOMPANHAMENTO DIÁRIO',
        `Último lançamento • ${formatarData(ult.data)}`,
        [
            linha('Esperado no dia', metaDiaria),
            linha('Produzido', produzido),
            linha('Diferença', diferenca, diferenca >= 0 ? 'positivo' : 'negativo'),
            'divider',
            linha('Produzido no mês', acumulado),
            linha('Falta no mês', configAtual.meta - acumulado),
            linha('Nova meta diária', novaMeta, 'destaque')
        ]
    );
}

/* ===== SEMANAL ===== */
function renderSemanal() {
    const semana = ultimaSemanaFechada();
    if (!semana) return mostrarVazio();

    const { inicio, fim } = semana;

    const metaDiaria = configAtual.meta / configAtual.dias;

    const semanaLanc = lancamentosAtuais.filter(
        l => l.data >= inicio && l.data <= fim
    );

    if (!semanaLanc.length) return mostrarVazio();

    const produzido = semanaLanc.reduce((s, l) => s + l.liq, 0);
    const esperado = metaDiaria * 6;
    const resultado = produzido - esperado;

    const acumulado = lancamentosAtuais.reduce((s, l) => s + l.liq, 0);

    preencher(
        'ACOMPANHAMENTO SEMANAL',
        `Semana fechada (Seg–Sáb) • ${formatarData(inicio)} a ${formatarData(fim)}`,
        [
            linha('Planejado da semana', esperado),
            linha('Produzido na semana', produzido),
            linha('Resultado', resultado, resultado >= 0 ? 'positivo' : 'negativo'),
            'divider',
            linha('Meta mensal', configAtual.meta),
            linha('Produzido no mês', acumulado)
        ]
    );
}

/* ===== CARD ===== */
function preencher(titulo, periodo, linhas) {
    document.getElementById('titulo').innerText = titulo;
    document.getElementById('periodo').innerText = periodo;

    const c = document.getElementById('conteudo');
    c.innerHTML = '';

    linhas.forEach(l => {
        if (l === 'divider') {
            const div = document.createElement('div');
            div.className = 'linha';
            c.appendChild(div);
            return;
        }

        const row = document.createElement('div');
        row.className = `linha-info ${l.classe || ''}`;
        row.innerHTML = `<span>${l.label}</span><strong>${moeda(l.valor)}</strong>`;
        c.appendChild(row);
    });
}

function linha(label, valor, classe = '') {
    return { label, valor, classe };
}

function mostrarVazio() {
    document.getElementById('titulo').innerText = 'Sem dados';
    document.getElementById('periodo').innerText = 'Nenhuma informação encontrada';
    document.getElementById('conteudo').innerHTML =
        `<div class="vazio">Configure e lance dados no sistema principal</div>`;
}

function voltarSistema() {
    window.location.href = '../index.html';
}

/* ===== SEMANA ===== */
function ultimaSemanaFechada() {
    if (!lancamentosAtuais.length) return null;

    const ult = ultimoLancamento();
    const base = new Date(ult.data);
    const dia = base.getDay();

    const fim = new Date(base);
    fim.setDate(base.getDate() + (dia === 6 ? 0 : 6 - dia));

    const inicio = new Date(fim);
    inicio.setDate(fim.getDate() - 5);

    return {
        inicio: inicio.toISOString().slice(0, 10),
        fim: fim.toISOString().slice(0, 10)
    };
}

/* ===== UTIL ===== */
function moeda(v) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

document.addEventListener('DOMContentLoaded', carregarDados);
