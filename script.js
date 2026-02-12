let dados = {};
let editando = { med: null, odo: null };

function mesAtual() {
    return new Date().toISOString().slice(0, 7);
}

function mesTravado(tipo) {
    return document.getElementById(`mes-${tipo}`).value < mesAtual();
}

/* ===== NAVEGAÇÃO ===== */
function abrirPagina(tipo) {
    document.querySelectorAll('.pagina').forEach(p => p.classList.add('hidden'));
    document.getElementById(`pagina-${tipo}`).classList.remove('hidden');
    document.body.className = tipo;

    document.getElementById('btn-med').classList.remove('ativo');
    document.getElementById('btn-odo').classList.remove('ativo');
    document.getElementById(`btn-${tipo}`).classList.add('ativo');

    carregarConfiguracao(tipo);
}

/* ===== ACOMPANHAMENTO ===== */
function irParaAcompanhamento() {
    window.open('acompanhamento.html', '_blank');
}

/* ===== CONFIG ===== */
function salvarConfig(tipo) {
    const mes = document.getElementById(`mes-${tipo}`).value;
    const meta = Number(document.getElementById(`meta-${tipo}`).value);
    const dias = Number(document.getElementById(`dias-${tipo}`).value);

    if (!mes || !meta || !dias) {
        alert('Preencha mês, meta e dias');
        return;
    }

    const formData = new FormData();
    formData.append('tipo', tipo);
    formData.append('mes', mes);
    formData.append('meta', meta);
    formData.append('dias', dias);

    fetch('api/config.php?acao=salvar', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(() => {
        carregarConfiguracao(tipo);
    })
    .catch(() => {
        alert('Erro ao salvar configuração');
    });
    
    
}


function carregarConfiguracao(tipo) {
    const mes = document.getElementById(`mes-${tipo}`).value;
    if (!mes) return;

    fetch(`api/config.php?acao=buscar&tipo=${tipo}&mes=${mes}`)
        .then(res => res.json())
        .then(config => {

            if (config && config.meta !== undefined) {
                document.getElementById(`meta-${tipo}`).value = config.meta;
                document.getElementById(`dias-${tipo}`).value = config.dias;

dados[`${mes}_${tipo}`] = {
    meta: Number(config.meta),
    dias: Number(config.dias),
    lancamentos: []
};

carregarLancamentos(tipo);
            } else {
                document.getElementById(`meta-${tipo}`).value = '';
                document.getElementById(`dias-${tipo}`).value = '';
                resetarTela(tipo);
            }

            aplicarBloqueio(tipo);
        })
        .catch(() => {
            alert('Erro ao carregar configuração');
        });
}


/* ===== LANÇAMENTOS ===== */
function lancarDia(tipo) {
    const data = document.getElementById(`data-${tipo}`).value;
    const prod = Number(document.getElementById(`prod-${tipo}`).value);

    if (!data || !prod) {
        alert('Preencha a data e a produção');
        return;
    }

    let rep = 0;
    if (tipo === 'med') {
        rep = Number(document.getElementById('rep-med').value) || 0;
    }

    const mes = document.getElementById(`mes-${tipo}`).value;
const chave = `${mes}_${tipo}`;
const d = dados[chave];

const acumulado = d.lancamentos.reduce((s, l) => s + l.liq, 0);
const diasRestantes = Math.max(d.dias - d.lancamentos.length, 1);
const metaDia = (d.meta - acumulado) / diasRestantes;


    const formData = new FormData();
    formData.append('tipo', tipo);
    formData.append('data', data);
    formData.append('prod', prod);
    formData.append('rep', rep);
    formData.append('meta_dia', metaDia.toFixed(2));


    // 👇 SE estiver editando, manda o ID
    if (editando[tipo]) {
        formData.append('id', editando[tipo]);
    }

    fetch('api/lancamentos.php?acao=salvar', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(() => {
    editando[tipo] = null;
    limparFormulario(tipo);

    // 🔄 recarrega tudo para atualizar diário e semanal
    carregarDados();
});

}

function carregarLancamentos(tipo) {
    const mes = document.getElementById(`mes-${tipo}`).value;
    if (!mes) return;

    fetch(`api/lancamentos.php?acao=listar&tipo=${tipo}&mes=${mes}`)
        .then(res => res.json())
        .then(lancamentos => {

            dados[`${mes}_${tipo}`] = dados[`${mes}_${tipo}`] || {};
            dados[`${mes}_${tipo}`].lancamentos = lancamentos.map(l => ({
                id: l.id,
                data: l.data,
                prod: Number(l.producao),
                rep: Number(l.repasse),
                liq: Number(l.liquido)
            }));

            // 👉 AGORA sim atualiza a tela
            atualizar(tipo);
        });
}



function editarLancamento(tipo, id) {
    const l = dados[`${document.getElementById(`mes-${tipo}`).value}_${tipo}`]
        .lancamentos.find(x => x.id === id);

    document.getElementById(`data-${tipo}`).value = l.data;
    document.getElementById(`prod-${tipo}`).value = l.prod;
    if (tipo === 'med') document.getElementById('rep-med').value = l.rep;

    editando[tipo] = id;
}

function excluirLancamento(tipo, id) {
    if (!confirm('Excluir lançamento?')) return;

    const formData = new FormData();
    formData.append('id', id);

    fetch('api/lancamentos.php?acao=excluir', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(() => {
        carregarLancamentos(tipo);
    });
}


/* ===== DASH ===== */
function atualizar(tipo) {
    const d = dados[`${document.getElementById(`mes-${tipo}`).value}_${tipo}`];
    if (!d) return resetarTela(tipo);

    const acum = d.lancamentos.reduce((s, l) => s + l.liq, 0);
    const falta = d.meta - acum;
    const diaria = (d.meta - acum) / (d.dias - d.lancamentos.length || 1);

    document.getElementById(`acum-${tipo}`).innerText = moeda(acum);
    document.getElementById(`metaView-${tipo}`).innerText = moeda(d.meta);
    document.getElementById(`falta-${tipo}`).innerText = moeda(falta);
    document.getElementById(`diaria-${tipo}`).innerText = moeda(diaria);

    const hist = document.getElementById(`hist-${tipo}`);
    hist.innerHTML = '';

    d.lancamentos.forEach(l => {
        hist.innerHTML += `
            <tr>
                <td>${l.data}</td>
                <td>${moeda(l.prod)}</td>
                <td>${moeda(l.rep)}</td>
                <td>${moeda(l.liq)}</td>
                <td>
                    <button onclick="editarLancamento('${tipo}', ${l.id})">✏️</button>
                    <button onclick="excluirLancamento('${tipo}', ${l.id})">🗑️</button>
                </td>
            </tr>
        `;
    });
}

/* ===== UTIL ===== */
function salvar() {
    localStorage.setItem('metaReceita', JSON.stringify(dados));
}

function moeda(v) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function limparFormulario(tipo) {
    document.getElementById(`data-${tipo}`).value = '';
    document.getElementById(`prod-${tipo}`).value = '';
    if (tipo === 'med') document.getElementById('rep-med').value = '';
}

function resetarTela(tipo) {
    document.getElementById(`acum-${tipo}`).innerText = moeda(0);
    document.getElementById(`metaView-${tipo}`).innerText = moeda(0);
    document.getElementById(`falta-${tipo}`).innerText = moeda(0);
    document.getElementById(`diaria-${tipo}`).innerText = moeda(0);
    document.getElementById(`hist-${tipo}`).innerHTML = '';
}

function aplicarBloqueio(tipo) {
    const travado = mesTravado(tipo);
    document.querySelectorAll(`#pagina-${tipo} input, #pagina-${tipo} button`)
        .forEach(el => el.disabled = travado);
}

function irParaAcompanhamento() {
    window.location.href = './acompanhamento/acompanhamento.html';
}

function voltarMenu() {
    window.location.href = '../hub.html'; 
    // ajuste o caminho se o hub estiver em outro lugar
}


/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
    const mes = mesAtual();
    document.getElementById('mes-med').value = mes;
    document.getElementById('mes-odo').value = mes;
    abrirPagina('odo');
});

