// Teste ponta a ponta que joga as 17 missões avançando só a simulação (sem render e sem timers).
// Funciona mesmo com a aba em segundo plano, onde o Chrome pausa o rAF e segura os timers.
//
// Uso (browser-harness, console do DevTools ou CDP):
//   1. abrir Tumbalacatumba.html?play&notut&t=12 (jogo novo) e esperar __game.state === 'play';
//   2. executar este arquivo na página;
//   3. chamar __T.run(passo) para cada passo, nesta ordem:
//        aboboras, gato, ossos, brasas, chocar, corvos, cartas, dentadura, cogumelos, vagalumes, combate,
//        cuspe, fogo, baile, pelos, sotao, capa, casamento, final, toque
//      (toque = controles de toque com dedos simulados; pode rodar sozinho depois de qualquer passo)
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
    toque() {
      // versão mobile, fase 1: dedos simulados (new Touch / TouchEvent) no canvas
      const prevMode = g.settings.controls;
      g.applySetting('controls', 'on');
      const T = g.touch, cv = g.renderer.domElement, W = innerWidth, H = innerHeight, p = g.player, cam = g.cam;
      if (!T) throw new Error('controles de toque não foram criados');
      const ok = [], fail = (m) => { throw new Error(m + ' | ' + ok.join('; ')); };
      // dedos na tela: cada evento leva a lista completa (como no aparelho), senão o jogo acha que sumiram
      const on = new Map();
      const mk = (q) => new Touch({ identifier: q.id, target: cv, clientX: q.x, clientY: q.y });
      const fire = (type, pts) => {
        if (type === 'touchstart' || type === 'touchmove') for (const q of pts) on.set(q.id, q);
        else for (const q of pts) on.delete(q.id);
        const all = [...on.values()].map(mk), ch = pts.map(mk);
        return cv.dispatchEvent(new TouchEvent(type, { touches: all, targetTouches: all, changedTouches: ch, bubbles: true, cancelable: true }));
      };
      const down = (id, x, y) => fire('touchstart', [{ id, x, y }]);
      const move = (id, x, y) => fire('touchmove', [{ id, x, y }]);
      const up = (id, x, y) => fire('touchend', [{ id, x, y }]);
      const SX = W * 0.2, SY = H * 0.65; // onde o polegar esquerdo encosta
      const praca = () => { tp(1.5, 19.5); cam.yaw = p.yaw = Math.PI - 0.25; cam.pitch = 0.3; cam.targetDist = 8.5; wait(200); };
      const run = (dx, dy, ms) => {
        down(1, SX, SY); move(1, SX + dx, SY + dy);
        const a = p.pos.clone(), yaw0 = cam.yaw;
        wait(ms);
        up(1, SX + dx, SY + dy); wait(60);
        return { d: p.pos.clone().sub(a), turned: Math.abs(yaw0 - cam.yaw) };
      };
      const along = (d, yaw, side) => {
        const v = side ? { x: -Math.cos(yaw), z: Math.sin(yaw) } : { x: Math.sin(yaw), z: Math.cos(yaw) };
        const n = Math.hypot(d.x, d.z) || 1;
        return [n, (d.x * v.x + d.z * v.z) / n];
      };
      /** posiciona a câmera para o alvo cair na faixa [x0, x1] da tela e devolve o ponto na tela */
      const aim = (pos, h, x0, x1) => {
        const base = cam.yaw;
        for (const off of [0, 0.15, -0.15, 0.3, -0.3, 0.45, -0.45, 0.6, -0.6, 0.75, -0.75, 0.9, -0.9, 1.05, -1.05]) {
          cam.yaw = base + off; wait(60);
          g.camera.updateMatrixWorld();
          const v = pos.clone(); v.y += h; v.project(g.camera);
          const sx = ((v.x + 1) / 2) * W, sy = ((1 - v.y) / 2) * H;
          if (v.z < 1 && sx > x0 && sx < x1 && sy > H * 0.1 && sy < H * 0.75) return { x: sx, y: sy };
        }
        return null;
      };
      praca();
      if (!T.root.classList.contains('show')) fail('joystick não apareceu no modo toque');

      // 1. joystick: frente, direita (câmera parada), meio empurrão anda mais devagar
      const yF = cam.yaw, f = run(0, -60, 600), [fd, fdot] = along(f.d, yF, false);
      const yR = cam.yaw, r = run(60, 0, 600), [rd, rdot] = along(r.d, yR, true);
      praca();
      const h = run(0, -26, 600), [hd] = along(h.d, cam.yaw, false);
      ok.push(`joystick frente ${fd.toFixed(1)} m (${fdot.toFixed(2)}), direita ${rd.toFixed(1)} m (${rdot.toFixed(2)}, câmera ${r.turned.toFixed(2)} rad), meio empurrão ${hd.toFixed(1)} m`);
      if (fd < 2 || fdot < 0.95 || rd < 2 || rdot < 0.95 || r.turned > 0.15) fail('joystick não andou relativo à câmera');
      if (hd > fd * 0.85 || hd < fd * 0.3) fail('meio empurrão não andou mais devagar');
      // polegar encostando nas bordas (embaixo e à esquerda): o centro é o ponto do toque, então só para cima é para a frente
      const edge = (x, y) => {
        praca();
        const a = p.pos.clone(), yaw = cam.yaw;
        down(8, x, y); move(8, x, y - 14); move(8, x, y - 60); wait(500);
        up(8, x, y - 60); wait(60);
        return along(p.pos.clone().sub(a), yaw, false);
      };
      const [ebd, ebdot] = edge(W * 0.2, H - 12), [eld, eldot] = edge(14, H * 0.6);
      ok.push(`bordas: embaixo ${ebd.toFixed(1)} m (${ebdot.toFixed(2)}), esquerda ${eld.toFixed(1)} m (${eldot.toFixed(2)})`);
      if (ebd < 1.5 || ebdot < 0.95 || eld < 1.5 || eldot < 0.95) fail('joystick na borda não andou para a frente');

      // 2. joystick e câmera ao mesmo tempo; terceiro dedo no lado do joystick é ignorado (não vira pinça)
      praca();
      const a0 = p.pos.clone(), y0 = cam.yaw, d0 = cam.targetDist;
      down(1, SX, SY); move(1, SX, SY - 60);
      let cx = W * 0.75;
      down(2, cx, H * 0.4);
      down(3, W * 0.1, H * 0.3);
      for (let i = 0; i < 10; i++) { cx -= 20; move(2, cx, H * 0.4); move(3, W * 0.1 + i * 8, H * 0.3); wait(33); }
      up(3, W * 0.1 + 72, H * 0.3); up(2, cx, H * 0.4); up(1, SX, SY - 60); wait(60);
      const both = { walked: p.pos.distanceTo(a0), turned: Math.abs(cam.yaw - y0), zoom: Math.abs(cam.targetDist - d0) };
      ok.push(`juntos: andou ${both.walked.toFixed(1)} m, câmera ${both.turned.toFixed(2)} rad, zoom ${both.zoom.toFixed(2)}`);
      if (both.walked < 1.5 || both.turned < 0.5 || both.zoom > 0.01) fail('joystick + câmera (ou terceiro dedo) falhou');

      // 3. touchcancel e dedo fantasma (touchend perdido) soltam o joystick
      down(1, SX, SY); move(1, SX, SY - 60); wait(100);
      fire('touchcancel', [{ id: 1, x: SX, y: SY - 60 }]);
      const stopCancel = g.input.move.m === 0;
      down(1, SX, SY); move(1, SX, SY - 60); wait(100);
      on.delete(1); // o touchend do dedo 1 "se perdeu"
      down(7, W * 0.8, H * 0.3); up(7, W * 0.8, H * 0.3); wait(60);
      const stopGhost = g.input.move.m === 0 && !T.fingers.has(1);
      ok.push(`touchcancel solta ${stopCancel}, dedo fantasma solto ${stopGhost}`);
      if (!stopCancel || !stopGhost) fail('joystick ficou preso');

      // 4. arrasto da câmera não vira toque; pinça (até começando perto do joystick) dá zoom sem andar
      praca();
      const yC = cam.yaw, tgt0 = g.interaction.target;
      cx = W * 0.75;
      down(2, cx, H * 0.4);
      for (let i = 0; i < 10; i++) { cx -= 20; move(2, cx, H * 0.4); wait(33); }
      up(2, cx, H * 0.4); wait(60);
      const turned = Math.abs(cam.yaw - yC);
      const dz0 = cam.targetDist, pz = p.pos.clone();
      let ax = W * 0.36, bx = W * 0.52;
      down(3, ax, H * 0.5); down(4, bx, H * 0.5);
      for (let i = 0; i < 6; i++) { ax -= 12; bx += 12; fire('touchmove', [{ id: 3, x: ax, y: H * 0.5 }, { id: 4, x: bx, y: H * 0.5 }]); wait(33); }
      // solta um dedo: o outro volta a girar a câmera
      up(3, ax, H * 0.5);
      const yP = cam.yaw;
      for (let i = 0; i < 6; i++) { bx -= 20; move(4, bx, H * 0.5); wait(33); }
      up(4, bx, H * 0.5); wait(60);
      ok.push(`câmera ${turned.toFixed(2)} rad (alvo intacto ${g.interaction.target === tgt0}); pinça ${dz0.toFixed(1)} → ${cam.targetDist.toFixed(1)} m, andou ${p.pos.distanceTo(pz).toFixed(2)} m, dedo que sobrou girou ${Math.abs(cam.yaw - yP).toFixed(2)} rad`);
      if (turned < 0.5 || g.interaction.target !== tgt0) fail('arrasto da câmera falhou');
      if (cam.targetDist >= dz0 - 0.5 || p.pos.distanceTo(pz) > 0.05 || Math.abs(cam.yaw - yP) < 0.2) fail('pinça falhou');

      // 5. PNJ: no lado direito e no lado esquerdo (zona do joystick), toque longo mostra, toque conversa
      const n = QW.npcs.prefeito;
      const npcTest = (x0, x1, id) => {
        tp(n.pos.x + Math.sin(n.homeYaw) * 3, n.pos.z + Math.cos(n.homeYaw) * 3);
        cam.yaw = p.yaw = n.homeYaw + Math.PI; cam.pitch = 0.2; wait(300);
        const s = aim(n.pos, 1.3, x0, x1);
        if (!s) fail(`não achei ângulo para o prefeito entre ${x0 | 0} e ${x1 | 0}`);
        const p0 = p.pos.clone();
        down(id, s.x, s.y); wait(700);
        const held = g.interaction.hover === n.inter && !g.ui.tooltip.classList.contains('hidden');
        up(id, s.x, s.y); wait(100);
        const noTalk = !g.ui.dialog.open, still = p.pos.distanceTo(p0) < 0.05;
        down(id + 1, s.x, s.y); up(id + 1, s.x, s.y); wait(300);
        const talked = g.ui.dialog.open;
        g.ui.dialog.close(); wait(100);
        return { held, noTalk, still, talked };
      };
      const R = npcTest(W * 0.5, W * 0.9, 10), Lz = npcTest(W * 0.05, W * 0.38, 20);
      ok.push(`PNJ à direita ${JSON.stringify(R)}, à esquerda ${JSON.stringify(Lz)}`);
      if (!Object.values(R).every(Boolean) || !Object.values(Lz).every(Boolean)) fail('toque no PNJ falhou');
      // polegar parado no joystick + a outra mão toca o PNJ ali perto (lado esquerdo): conversa, não vira pinça
      {
        tp(n.pos.x + Math.sin(n.homeYaw) * 3, n.pos.z + Math.cos(n.homeYaw) * 3);
        cam.yaw = p.yaw = n.homeYaw + Math.PI; cam.pitch = 0.2; wait(300);
        const s = aim(n.pos, 1.3, W * 0.24, W * 0.4);
        if (!s) fail('não achei ângulo para o prefeito perto do polegar');
        const thumb = { x: W * 0.12, y: H * 0.8 }, d0 = cam.targetDist;
        down(50, thumb.x, thumb.y); wait(300);
        down(51, s.x, s.y); up(51, s.x, s.y); wait(300);
        const stillStick = T.fingers.get(50)?.role === 'stick', talked = g.ui.dialog.open, noZoom = Math.abs(cam.targetDist - d0) < 0.01;
        g.ui.dialog.close();
        up(50, thumb.x, thumb.y); wait(100);
        ok.push(`polegar parado + toque perto: conversa ${talked}, joystick continua ${stillStick}, sem zoom ${noZoom}`);
        if (!talked || !stillStick || !noZoom) fail('toque perto do polegar parado falhou');
      }

      // 6. criatura: 1º toque seleciona, 2º ataca
      const m = C.mobs.filter((mb) => mb.alive && mb.inter.enabled()).sort((u, v) => u.pos.distanceTo(p.pos) - v.pos.distanceTo(p.pos))[0];
      if (m) {
        const dir = Math.atan2(p.pos.x - m.pos.x, p.pos.z - m.pos.z);
        tp(m.pos.x + Math.sin(dir) * 6, m.pos.z + Math.cos(dir) * 6);
        cam.yaw = p.yaw = dir + Math.PI; cam.pitch = 0.25; wait(100);
        const s = aim(m.pos, 0.6, W * 0.45, W * 0.95);
        if (!s) fail('não achei ângulo para a criatura');
        down(30, s.x, s.y); up(30, s.x, s.y); wait(60);
        const sel = g.interaction.target === m.inter && !C.autoAttack;
        g.camera.updateMatrixWorld();
        const v = m.pos.clone(); v.y += 0.6; v.project(g.camera);
        const sx = ((v.x + 1) / 2) * W, sy = ((1 - v.y) / 2) * H;
        down(31, sx, sy); up(31, sx, sy); wait(60);
        const atk = C.autoAttack;
        C.autoAttack = false; g.interaction.setTarget(null); m.evade?.(); wait(60);
        ok.push(`criatura: 1º toque seleciona ${sel}, 2º ataca ${atk}`);
        if (!sel || !atk) fail('toque na criatura falhou');
      }

      // 7. pular; voar: Subir sobe, segurar Descer pousa
      praca();
      const jump = T.root.querySelector('.tbtn.jump'), dn = T.root.querySelector('.tbtn.down');
      const press = (b, v) => b.dispatchEvent(new PointerEvent(v ? 'pointerdown' : 'pointerup', { bubbles: true, cancelable: true, pointerType: 'touch' }));
      press(jump, true); wait(100);
      const jumped = !p.grounded;
      press(jump, false); wait(1200);
      const hadCape = P.hasItem('capinha');
      if (!hadCape) P.addItem('capinha', 1, true);
      g.abilities.use('fly'); wait(200);
      const y1 = p.pos.y;
      press(jump, true); wait(1500); press(jump, false);
      const rose = p.pos.y - y1, downShown = dn.classList.contains('show');
      press(dn, true); let k = 0; while (p.flying && k++ < 300) wait(33); press(dn, false); wait(200);
      if (!hadCape) P.removeItem('capinha');
      ok.push(`pular ${jumped}; voo: Subir subiu ${rose.toFixed(1)} m, Descer à vista ${downShown}, pousou segurando Descer ${!p.flying}`);
      if (!jumped || rose < 4 || !downShown || p.flying) fail('pular ou voar pelo toque falhou');

      // 8. opção "Nunca": os dedos voltam a ser do navegador; "Automático" segue o último ponteiro (dedo ou mouse)
      g.applySetting('controls', 'off');
      const free = down(40, SX, SY); move(40, SX, SY - 60); wait(200);
      const offOk = free && g.input.move.m === 0 && !g.touchMode && !T.root.classList.contains('show');
      up(40, SX, SY - 60);
      g.applySetting('controls', 'auto');
      window.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', movementX: 6, movementY: 2, bubbles: true }));
      wait(60);
      const toMouse = !g.touchMode;
      down(41, W * 0.8, H * 0.3); up(41, W * 0.8, H * 0.3); wait(60);
      const toTouch = g.touchMode;
      // toque num botão gera mousemove de compatibilidade: isso não pode voltar para o modo mouse
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 300, clientY: 200, movementX: 4, bubbles: true }));
      wait(60);
      const keepTouch = g.touchMode;
      ok.push(`"Nunca" solta os dedos ${offOk}; automático: mouse ${toMouse}, dedo ${toTouch}, mousemove de compatibilidade mantém o toque ${keepTouch}`);
      if (!offOk || !toMouse || !toTouch || !keepTouch) fail('troca de modo de controle falhou');

      L.push('toque: ' + ok.join('; '));
      T.reset();
      g.applySetting('controls', prevMode);
      g.input.lastPointer = 'mouse';
      wait(60);
    },
  };
  return { run(name) { try { steps[name](); return 'ok'; } catch (err) { return 'ERRO ' + String(err); } }, log: L };
})();
