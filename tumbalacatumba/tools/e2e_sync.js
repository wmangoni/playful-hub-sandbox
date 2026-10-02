// Teste ponta a ponta que joga as 17 missões avançando só a simulação (sem render e sem timers).
// Funciona mesmo com a aba em segundo plano, onde o Chrome pausa o rAF e segura os timers.
//
// Uso (browser-harness, console do DevTools ou CDP):
//   1. abrir Tumbalacatumba.html?play&notut&t=12 (jogo novo) e esperar __game.state === 'play';
//   2. executar este arquivo na página;
//   3. chamar __T.run(passo) para cada passo, nesta ordem:
//        aboboras, gato, ossos, brasas, chocar, corvos, cartas, dentadura, cogumelos, vagalumes, combate,
//        cuspe, fogo, baile, pelos, sotao, capa, casamento, final
//      Cada chamada devolve 'ok' ou 'ERRO ...' (uma chamada por passo cabe no timeout do Runtime.evaluate);
//      As missões rodam em modo pacífico (as criaturas não atacam); o passo "combate" liga a briga de volta.
//   4. conferir __T.log (o passo final registra nível, XP, dinheiro, itens e o status de cada missão)
//      e window.__errors, que deve estar vazio.
// O jogo salva sozinho: apague 'tumbalacatumba-save-v1' do localStorage depois.
window.__T = (() => {
  const g = window.__game, P = g.progress, QW = g.questWorld, C = g.combat, L = [];
  C.peaceful = true;
  const wait = (ms) => { const n = Math.max(1, Math.ceil(ms / 33)); for (let i = 0; i < n; i++) { g.time += 1 / 30; g.update(1 / 30); g.input.endFrame(); } };
  const tp = (x, z) => { g.player.teleport(x, z); g.cam.snapBehind(g.player); };
  const btn = (label) => {
    const b = [...document.querySelectorAll('#quest .btns button')].find((b) => b.textContent === label);
    if (!b) throw new Error('botão ausente: ' + label + ' | ' + document.querySelector('#quest .scroll').textContent.slice(0, 80));
    b.click(); wait(250);
  };
  const talk = (id, title) => {
    const n = QW.npcs[id];
    tp(n.pos.x + Math.sin(n.homeYaw) * 2.5, n.pos.z + Math.cos(n.homeYaw) * 2.5);
    wait(250);
    g.interaction.tryInteract(n.inter);
    wait(300);
    const li = [...document.querySelectorAll('#quest .opts li')].find((l) => l.textContent.includes(title));
    if (li) { li.click(); wait(300); }
  };
  const accept = (id, qid) => { talk(id, P.quest(qid).title); btn('Aceitar'); L.push(`aceita ${qid}: ${P.status(qid)}`); };
  const turnIn = (id, qid) => { talk(id, P.quest(qid).title); btn('Completar Missão'); L.push(`entregue ${qid}: ${P.status(qid)} | nível ${P.level} xp ${P.xp}`); };
  const collect = (key) => {
    for (const p of QW.pickups.filter((p) => p.key === key)) {
      if (!P.wants(key)) break;
      tp(p.pos.x + 1, p.pos.z + 0.5); wait(120);
      if (!p.available()) continue;
      g.interaction.tryInteract(p.inter); wait(650);
    }
    L.push(`${key}: ${JSON.stringify(P.activeQuests().map((q) => [q.id, P.quests[q.id].counts]))}`);
  };
  // derrota criaturas de um tipo até a missão não precisar mais; se faltar, espera longe para renascerem
  const hunt = (typeName, key) => {
    for (let round = 0; round < 6 && P.wants(key); round++) {
      for (const m of C.mobs.filter((x) => x.type.name === typeName)) {
        if (!P.wants(key)) break;
        if (m.state !== 'idle') continue;
        tp(m.pos.x + 2, m.pos.z + 1); wait(100);
        if (!m.alive) continue;
        m.takeDamage(99999, g.player.pos); wait(150);
      }
      if (P.wants(key)) { tp(0, 13); wait(70000); }
    }
    L.push(`${key}: ${JSON.stringify(P.activeQuests().map((q) => [q.id, P.quests[q.id].counts]))}`);
  };
  const steps = {
    aboboras() {
      accept('prefeito', 'aboboras');
      for (const w of QW.pumpkins) { if (!P.wants('abobora')) break; wait(40); tp(w.pos.x + 0.8, w.pos.z + 0.8); g.interaction.tryInteract(w.inter); wait(150); }
      turnIn('prefeito', 'aboboras'); L.push('chapéu: ' + P.flags.hat + ' ' + g.player.rig.hat.visible);
    },
    gato() {
      accept('aranhilda', 'gato');
      for (let i = 0; i < 60 && P.status('gato') !== 'complete'; i++) {
        const c = QW.cat; wait(150);
        if (c.state === 'wait') { tp(c.pos.x + 1.0, c.pos.z + 0.5); wait(40); g.interaction.tryInteract(c.inter); }
      }
      turnIn('aranhilda', 'gato');
    },
    ossos() { accept('juvenal', 'ossos'); collect('osso'); turnIn('juvenal', 'ossos'); },
    brasas() { accept('custodio', 'brasas'); collect('brasa'); turnIn('custodio', 'brasas'); L.push('braseiros: ' + P.flags.braziers); },
    chocar() {
      accept('custodio', 'chocar');
      const e = QW.egg.pos; tp(e.x + 1.5, e.z + 1.5); wait(200);
      g.interaction.tryInteract(g.interaction.list.find((i) => i.name === 'Ovo do Capeta'));
      wait(5600); wait(2200);
      L.push('ovo: ' + P.status('chocar') + ' pet ' + QW.pet.active);
      turnIn('custodio', 'chocar');
    },
    corvos() {
      accept('zepalha', 'corvos');
      for (const c of QW.crows) { if (!P.wants('corvo')) break; if (c.state !== 'idle') continue; tp(c.home.x + 4, c.home.z + 4); wait(150); g.player.courage = 100; g.abilities.boo(); wait(300); }
      L.push('corvos: ' + JSON.stringify(P.quests.corvos));
      if (P.status('corvos') === 'complete') turnIn('zepalha', 'corvos');
    },
    cartas() { accept('suspiro', 'carta'); turnIn('nevoa', 'carta'); accept('nevoa', 'resposta'); turnIn('suspiro', 'resposta'); },
    dentadura() {
      accept('conde', 'dentadura');
      const f = QW.frog.pos; tp(f.x + 1.5, f.z + 1); wait(200);
      g.interaction.tryInteract(g.interaction.list.find((i) => i.name === 'Sapo Sorridente'));
      wait(300); turnIn('conde', 'dentadura');
    },
    cogumelos() { accept('vesga', 'cogumelos'); collect('cogumelo'); turnIn('vesga', 'cogumelos'); },
    vagalumes() { accept('tonico', 'vagalumes'); g.dayNight.setTime(22); wait(300); collect('vagalume'); turnIn('tonico', 'vagalumes'); },
    combate() {
      // briga de verdade com um marujo do farol: ele tem que morrer e o jogador sobreviver
      C.peaceful = false;
      const m = C.mobs.find((x) => x.type.name === 'Marujo Afogado' && x.state === 'idle');
      tp(m.pos.x + 2, m.pos.z + 1); wait(300);
      const xp0 = P.xp, hp0 = C.hp;
      g.interaction.tryInteract(m.inter);
      for (let i = 0; i < 60 && m.alive && m.state !== 'dead' && !C.dead; i++) wait(250);
      L.push(`combate: marujo ${m.state} (nível ${m.level}), vida do jogador ${Math.round(hp0)} → ${Math.round(C.hp)}, XP +${P.xp - xp0}, morto ${C.dead}`);
      if (C.dead) C.release();
      C.peaceful = true;
      if (m.state !== 'dead' && m.state !== 'gone') throw new Error('o marujo não morreu');
    },
    cuspe() { accept('custodio', 'cuspe'); collect('pimenta'); turnIn('custodio', 'cuspe'); L.push('cuspe de fogo: ' + P.flags.petFire); },
    fogo() {
      // só o Belzebuzinho bate (o jogador não ataca): tem que acertar, e com pouco dano
      C.peaceful = false;
      if (!QW.pet.active) QW.pet.summon();
      const m = C.mobs.find((x) => x.type.name === 'Rato-Zumbi' && x.state === 'idle');
      tp(m.pos.x + 3, m.pos.z + 2); QW.pet.w.pos.set(m.pos.x + 4, 0, m.pos.z + 3); wait(200);
      m.aggro(false, true);
      const hp0 = m.hp, orig = C.launchFireball.bind(C);
      let shots = 0;
      C.launchFireball = (a, b) => { shots++; orig(a, b); };
      wait(8000);
      C.launchFireball = orig;
      L.push(`fogo: ${shots} bolas de fogo, rato ${Math.round(hp0)} → ${Math.round(m.hp)} (${m.state})`);
      if (m.alive) m.takeDamage(99999, g.player.pos);
      C.peaceful = true;
      C.hp = C.st.maxHp;
      if (!shots || m.hp >= hp0) throw new Error('o Belzebuzinho não cuspiu fogo');
    },
    baile() { accept('juvenal', 'baile'); hunt('Caveira Saltitante', 'caveira'); turnIn('juvenal', 'baile'); },
    pelos() { accept('vesga', 'pelo'); hunt('Aranha Cabeluda', 'pelo'); turnIn('vesga', 'pelo'); },
    sotao() { accept('conde', 'sotao'); hunt('Morcego Dentuço', 'morcego'); turnIn('conde', 'sotao'); },
    capa() {
      // A Capa Sumida: entra pela porta, segue as 3 pistas, abre o baú do sótão, sai e entrega; depois voa
      const io = g.indoors, M = QW.mansion;
      accept('conde', 'capa');
      const door = g.interaction.list.find((i) => i.name === 'Porta da Mansão');
      tp(io.outSpot.x, io.outSpot.z); wait(100);
      if (!door || g.interaction.distTo(door) > door.range) throw new Error('porta da mansão fora de alcance');
      io.enter({ instant: true }); wait(200);
      if (!io.active) throw new Error('não entrou na mansão');
      const goTo = (w) => { g.player.teleport(w.x + 0.5, w.z + 0.4, 0, w.y + 0.3); g.cam.snapBehind(g.player); wait(150); };
      for (let i = 0; i < 3; i++) {
        const c = M.clues[i];
        goTo(c.pos);
        g.interaction.tryInteract(c.inter); wait(200);
        g.ui.dialog.close();
      }
      goTo(M.trunk.pos);
      g.interaction.tryInteract(M.trunk.inter); wait(3600);
      L.push(`capa: pistas ${P.count('capa', 'pista')} capa ${P.count('capa', 'capanova')} item ${P.hasItem('capanova')} status ${P.status('capa')}`);
      io.exit({ instant: true }); wait(200);
      if (io.active) throw new Error('não saiu da mansão');
      turnIn('conde', 'capa');
      L.push(`capa nova no Conde: ${QW.npcs.conde.rig.capeNew.visible} capinha: ${P.hasItem('capinha')}`);
      // voo: decola, sobe 2 s, avança 2 s e pousa segurando X
      const p = g.player, y0 = p.pos.y;
      g.abilities.use('fly');
      g.input.keys.add('Space'); wait(2000); g.input.keys.delete('Space');
      const up = p.pos.y - y0;
      g.input.keys.add('KeyW'); wait(2000); g.input.keys.delete('KeyW');
      const speed = p.speedNow;
      g.input.keys.add('KeyX'); let n = 0; while (p.flying && n++ < 400) wait(33); g.input.keys.delete('KeyX');
      L.push(`voo: subiu ${up.toFixed(1)} m, ${speed.toFixed(1)} m/s, pousou ${!p.flying}`);
      if (up < 8 || p.flying) throw new Error('voo não funcionou');
      // cruza a cerca da mansão a ~20 m de altura (colisor sem faixa de altura virava parede invisível no céu)
      const G = { x: 101, z: 13 }, rot = Math.atan2(103 - 93, 12 - 16), c = Math.cos(rot), s = Math.sin(rot);
      const fx = G.x + 10 * c, fz = G.z - 10 * s;
      tp(fx - 8 * s, fz - 8 * c); p.yaw = rot; wait(100);
      g.abilities.use('fly');
      g.input.keys.add('Space'); wait(3000); g.input.keys.delete('Space');
      const alt = p.pos.y - g.world.groundHeight(p.pos.x, p.pos.z), from = p.pos.clone();
      g.input.keys.add('KeyW'); wait(2000); g.input.keys.delete('KeyW');
      const crossed = Math.hypot(p.pos.x - from.x, p.pos.z - from.z);
      g.input.keys.add('KeyX'); n = 0; while (p.flying && n++ < 600) wait(33); g.input.keys.delete('KeyX');
      L.push(`voo alto: ${alt.toFixed(1)} m acima do chão, avançou ${crossed.toFixed(1)} m por cima da cerca, pousou ${!p.flying}`);
      if (alt < 12 || crossed < 15 || p.flying) throw new Error('voo alto barrado pela cerca da mansão');
    },
    casamento() {
      accept('suspiro', 'casamento');
      hunt('Marujo Afogado', 'marujo');
      const lamp = g.interaction.list.find((i) => i.name === 'Lampião do Farol');
      tp(lamp.pos.x + 1, lamp.pos.z + 1); wait(200);
      g.interaction.tryInteract(lamp); wait(3600);
      L.push('farol aceso: ' + QW.lighthouse.lit + ' ' + JSON.stringify(P.quests.casamento));
      turnIn('nevoa', 'casamento');
      L.push(`suspiro a ${QW.npcs.suspiro.pos.distanceTo(QW.npcs.nevoa.pos).toFixed(1)} m da noiva`);
    },
    final() {
      L.push(`FINAL nível ${P.level} xp ${P.xp}/${P.xpNeeded} dinheiro ${P.money} itens ${P.bag.map((b) => b.id).join(',')}`);
      L.push('status: ' + JSON.stringify(Object.fromEntries(Object.entries(P.quests).map(([k, v]) => [k, v.status]))));
    },
  };
  return { run(name) { try { steps[name](); return 'ok'; } catch (err) { return 'ERRO ' + String(err); } }, log: L };
})();
