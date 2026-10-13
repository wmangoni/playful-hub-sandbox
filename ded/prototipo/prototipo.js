// Só para o protótipo: alterna entre as escolhas e o teste de dado e simula
// uma rolagem com a mesma duração do jogo (1,3 s de giro).
(function () {
    const escolhas = document.getElementById('choices');
    const bandeja = document.getElementById('dice-container');
    const mesa = bandeja.querySelector('.bandeja-mesa');
    const dado = document.getElementById('dice');
    const botao = document.getElementById('dice-button');
    const conta = document.getElementById('result-message');
    const selos = Object.fromEntries([...bandeja.querySelectorAll('[data-selo]')].map(s => [s.dataset.selo, s]));
    const barra = document.querySelectorAll('.prototipo-barra [data-estado]');
    const MOD = 3, CD = 10;
    let forcado = null;
    let resolvido = false;

    // Volta a bandeja ao repouso: sem selo, sem brilho (a animação infinita
    // do brilho não pode seguir rodando com a bandeja escondida).
    function limpar() {
        dado.className = 'dice';
        mesa.classList.remove('critico');
        Object.values(selos).forEach(s => s.classList.remove('visivel'));
    }

    // Os dois estados ficam sempre montados; o inativo só fica invisível e inerte.
    function mostrar(estado) {
        const teste = estado === 'teste';
        escolhas.classList.toggle('estado-oculto', teste);
        escolhas.inert = teste;
        bandeja.classList.toggle('estado-oculto', !teste);
        bandeja.inert = !teste;
        barra.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.estado === estado)));
        limpar();
        if (teste) preparar();
    }

    function preparar() {
        resolvido = false;
        dado.textContent = '20';
        botao.disabled = false;
        botao.textContent = 'Rolar o d20';
        conta.textContent = 'Role o d20 e some o modificador de Força (+3).';
    }

    function rolar() {
        if (resolvido) { mostrar('escolhas'); return; }
        botao.disabled = true;
        limpar();
        dado.className = 'dice rolling-animation';
        const giro = setInterval(() => { dado.textContent = 1 + Math.floor(Math.random() * 20); }, 60);
        const resultado = forcado ?? 1 + Math.floor(Math.random() * 20);
        forcado = null;
        setTimeout(() => {
            clearInterval(giro);
            dado.textContent = resultado;
            dado.classList.remove('rolling-animation');
            const total = resultado + MOD;
            const critico = resultado === 20, desastre = resultado === 1;
            const sucesso = !desastre && (critico || total >= CD);
            if (critico) mesa.classList.add('critico');
            if (desastre) dado.classList.add('falha-critica');
            conta.innerHTML = `<b>${resultado}</b> + 3 (Força) = <b>${total}</b> contra ${CD}` +
                (critico ? ' · <b class="critico">20 natural!</b>' : desastre ? ' · <b class="critico">1 natural</b>' : '') +
                `<span class="so-leitor">: ${critico ? 'crítico' : desastre ? 'desastre' : sucesso ? 'sucesso' : 'falha'}</span>`; // o selo é aria-hidden
            // cada selo tem texto fixo: revelar não repinta nada, só anima
            (critico ? selos.critico : desastre ? selos.desastre : sucesso ? selos.normal : selos.escuro).classList.add('visivel');
            resolvido = true;
            botao.textContent = 'Continuar';
            botao.disabled = false;
        }, 1300);
    }

    barra.forEach(b => b.addEventListener('click', () => mostrar(b.dataset.estado)));
    document.querySelectorAll('.prototipo-barra [data-forcar]').forEach(b => b.addEventListener('click', () => {
        mostrar('teste');
        forcado = Number(b.dataset.forcar);
        rolar();
    }));
    botao.addEventListener('click', rolar);
    escolhas.querySelectorAll('.escolha').forEach(b => b.addEventListener('click', () => {
        if (b.querySelector('.teste')) mostrar('teste');
    }));
})();
