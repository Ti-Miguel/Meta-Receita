let dados = {};

let tipoAtual = 'odo';
let modoAtual = 'diario';


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

    fetch(`../api/config.php?acao=buscar&tipo=${tipoAtual}&mes=${mes}`)
        .then(res => res.json())
        .then(config => {
            if (!config || !config.meta) {
                mostrarVazio();
                return;
            }

            dados[`${mes}_${tipoAtual}`] = {
                meta: Number(config.meta),
                dias: Number(config.dias),
                lancamentos: []
            };

            fetch(`../api/lancamentos.php?acao=listar&tipo=${tipoAtual}&mes=${mes}`)
                .then(res => res.json())
                .then(lancamentos => {
                    dados[`${mes}_${tipoAtual}`].lancamentos = lancamentos.map(l => ({
                        data: l.data,
                        liq: Number(l.liquido)
                    }));

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
    const mes = mesAtual();
    const chave = `${mes}_${tipoAtual}`;
    const d = dados[chave];

    if (!d || !d.lancamentos.length) {
        return mostrarVazio();
    }

    const metaDiaria = d.meta / d.dias;

    const ult = d.lancamentos
        .slice()
        .sort((a, b) => new Date(b.data) - new Date(a.data))[0];

    const produzido = ult.liq;
    const diferenca = produzido - metaDiaria;

    const acumulado = d.lancamentos.reduce((s, l) => s + l.liq, 0);
    const diasRestantes = Math.max(d.dias - d.lancamentos.length, 1);
    const novaMeta = (d.meta - acumulado) / diasRestantes;

    preencher(
        'ACOMPANHAMENTO DIÁRIO',
        `Último lançamento • ${formatarData(ult.data)}`,
        [
            linha('Esperado no dia', metaDiaria),
            linha('Produzido', produzido),
            linha('Diferença', diferenca, diferenca >= 0 ? 'positivo' : 'negativo'),
            'divider',
            linha('Produzido no mês', acumulado),
            linha('Falta no mês', d.meta - acumulado),
            linha('Nova meta diária', novaMeta, 'destaque')
        ]
    );
}


/* ===== SEMANAL ===== */
function renderSemanal() {
    const mes = mesAtual();
    const chave = `${mes}_${tipoAtual}`;
    const d = dados[chave];

    if (!d || !d.lancamentos.length) {
        return mostrarVazio();
    }

    // 🔹 ordenar lançamentos por data (ASC)
    const lancamentosOrdenados = d.lancamentos
        .slice()
        .sort((a, b) => dataLocal(a.data) - dataLocal(b.data));

    // 🔹 usar a PRIMEIRA data como referência da semana
    const primeiraData = dataLocal(lancamentosOrdenados[0].data);

    // 🔹 encontrar segunda-feira dessa semana
    const inicio = new Date(primeiraData);
    const diaSemana = inicio.getDay(); // 0=dom,1=seg...
    const diffSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
    inicio.setDate(inicio.getDate() + diffSegunda);
    inicio.setHours(0, 0, 0, 0);

    // 🔹 domingo da mesma semana
    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);
    fim.setHours(23, 59, 59, 999);

    // 🔹 filtrar lançamentos da semana
    const lancSemana = lancamentosOrdenados.filter(l => {
        const dataLanc = dataLocal(l.data);
        return dataLanc >= inicio && dataLanc <= fim;
    });

    if (!lancSemana.length) {
        return mostrarVazio();
    }

    // 🔹 soma da semana
    const produzidoSemana = lancSemana.reduce(
        (s, l) => s + Number(l.liq || 0),
        0
    );

    // 🔹 planejado
    const metaDiaria = d.meta / d.dias;
    const esperadoSemana = metaDiaria * 7;
    const resultadoSemana = produzidoSemana - esperadoSemana;

    // 🔹 produzido no mês
    const produzidoMes = d.lancamentos.reduce(
        (s, l) => s + Number(l.liq || 0),
        0
    );

    preencher(
        'ACOMPANHAMENTO SEMANAL',
        `Semana fechada (Seg–Dom) • ${formatarData(inicio)} a ${formatarData(fim)}`,
        [
            linha('Planejado da semana', esperadoSemana),
            linha('Produzido na semana', produzidoSemana),
            linha(
                'Resultado',
                resultadoSemana,
                resultadoSemana >= 0 ? 'positivo' : 'negativo'
            ),
            'divider',
            linha('Meta mensal', d.meta),
            linha('Produzido no mês', produzidoMes)
        ]
    );
}


function dataLocal(yyyyMmDd) {
    const [y, m, d] = yyyyMmDd.split('-').map(Number);
    return new Date(y, m - 1, d); // mês começa em 0
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
function semanaSegundaSabado() {
    const hoje = new Date();

    // volta até o último sábado fechado
    const d = new Date(hoje);
    while (d.getDay() !== 6) { // 6 = sábado
        d.setDate(d.getDate() - 1);
    }

    const fim = d.toISOString().slice(0, 10);

    const inicio = new Date(d);
    inicio.setDate(d.getDate() - 5);

    return {
        inicio: inicio.toISOString().slice(0, 10),
        fim
    };
}


function todosLancamentosDoTipo(tipo) {
    return Object.keys(dados)
        .filter(k => k.endsWith(`_${tipo}`))
        .flatMap(k => dados[k].lancamentos || []);
}


/* ===== UTIL ===== */
function moeda(v) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

document.addEventListener('DOMContentLoaded', carregarDados);
