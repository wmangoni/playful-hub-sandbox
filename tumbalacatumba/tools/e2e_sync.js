// Teste ponta a ponta que joga as 11 missões avançando só a simulação (sem render e sem timers).
// Funciona mesmo com a aba em segundo plano, onde o Chrome pausa o rAF e segura os timers.
//
// Uso (browser-harness, console do DevTools ou CDP):
//   1. abrir Tumbalacatumba.html?play&notut&t=12 (jogo novo) e esperar __game.state === 'play';
//   2. executar este arquivo na página;
//   3. chamar __T.run(passo) para cada passo, nesta ordem:
//        aboboras, gato, ossos, brasas, chocar, corvos, cartas, dentadura, cogumelos, vagalumes, final
//      Cada chamada devolve 'ok' ou 'ERRO ...' (uma chamada por passo cabe no timeout do Runtime.evaluate);
//   4. conferir __T.log (o passo final registra nível, XP, dinheiro, itens e o status de cada missão)
//      e window.__errors, que deve estar vazio.
// O jogo salva sozinho: apague 'tumbalacatumba-save-v1' do localStorage depois.
window.__T = (() => {
  const g = window.__game, P = g.progress, QW = g.questWorld, L = [];
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
      for (const c of QW.crows) { if (!P.wants('corvo')) break; if (c.state !== 'perch') continue; tp(c.home.x + 4, c.home.z + 4); wait(150); g.player.courage = 100; g.abilities.boo(); wait(300); }
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
    final() {
      L.push(`FINAL nível ${P.level} xp ${P.xp}/${P.xpNeeded} dinheiro ${P.money} itens ${P.bag.map((b) => b.id).join(',')}`);
      L.push('status: ' + JSON.stringify(Object.fromEntries(Object.entries(P.quests).map(([k, v]) => [k, v.status]))));
    },
  };
  return { run(name) { try { steps[name](); return 'ok'; } catch (err) { return 'ERRO ' + String(err); } }, log: L };
})();
