// Teste ponta a ponta que joga as 17 missões avançando só a simulação (sem render e sem timers).
// Funciona mesmo com a aba em segundo plano, onde o Chrome pausa o rAF e segura os timers.
//
// Uso (browser-harness, console do DevTools ou CDP):
//   1. abrir Tumbalacatumba.html?play&notut&t=12 (jogo novo) e esperar __game.state === 'play';
//   2. executar este arquivo na página;
//   3. chamar __T.run(passo) para cada passo, nesta ordem:
//        aboboras, gato, ossos, brasas, chocar, corvos, cartas, dentadura, cogumelos, vagalumes, combate,
//        cuspe, fogo, baile, pelos, sotao, capa, casamento, final, toque, toqueHud, contexto, desktop
//      (toque = controles de toque com dedos simulados; toqueHud = interface de toque, com o layout conferido
//       só em tela de celular deitado; contexto = placa de vídeo perdida e salvar ao sair do app; desktop = o
//       preset de desktop sem nada do celular; os quatro podem rodar sozinhos depois de qualquer passo)
//      Preset de celular: numa página aberta com &q=movel, rodar movel (e de novo toque, toqueHud e contexto).
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
      g.applySetting('controls', 'off', { confirmed: true });
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
    toqueHud() {
      const QIDS = ['aboboras', 'gato', 'ossos', 'brasas', 'chocar', 'corvos', 'carta', 'resposta', 'dentadura', 'cogumelos', 'vagalumes', 'cuspe', 'baile', 'pelo', 'sotao', 'capa', 'casamento'];
      // versão mobile, fase 2: interface de toque (grupo do polegar, menu do topo, janelas encaixadas)
      const prevMode = g.settings.controls;
      g.applySetting('controls', 'on'); wait(100);
      const T = g.touch, B = g.touchBar, ui = g.ui, p = g.player;
      const ok = [], fail = (m) => { throw new Error(m + ' | ' + ok.join('; ')); };
      if (!B) fail('grupo de botões do toque não foi criado');
      const phone = innerWidth <= 960 && innerHeight <= 480;
      const shown = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
      const R = (el) => el.getBoundingClientRect();
      const inside = (r) => r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
      const hit = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
      const press = (el, up = true) => {
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' }));
        if (up) el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch' }));
      };
      tp(1.5, 19.5); g.cam.yaw = p.yaw = Math.PI - 0.25; wait(400);

      // 1. layout (só faz sentido com tela de celular deitado)
      if (phone) {
        const btns = [...T.root.querySelectorAll('.tbar > .tb, .tbtn')].filter(shown);
        const frames = ['.unit.player', '#minimap', '#micro', '#tracker'].map((q) => ui.root.querySelector(q)).filter(shown);
        const out = [...btns, ...frames].filter((el) => !inside(R(el))).map((el) => el.className || el.id);
        const clash = [];
        btns.forEach((a, i) => btns.slice(i + 1).forEach((b) => {
          const ra = R(a), rb = R(b);
          const d = Math.hypot((ra.left + ra.right) / 2 - (rb.left + rb.right) / 2, (ra.top + ra.bottom) / 2 - (rb.top + rb.bottom) / 2);
          if (d < (ra.width + rb.width) / 2 - 2) clash.push(`${a.className}×${b.className}`);
        }));
        for (const a of btns) for (const f of frames) if (hit(R(a), R(f))) clash.push(`${a.className}×${f.id || f.className}`);
        const small = [...btns, ...ui.root.querySelectorAll('#micro button'), ...[ui.root.querySelector('#tracker .tog')].filter(shown)].filter((el) => Math.min(R(el).width, R(el).height) < 43.5).map((el) => el.className || el.tagName);
        const deskBar = shown(ui.root.querySelector('#bottom .bar-frame'));
        const trackerLeft = !!ui.root.querySelector('.anchor.tl #tracker');
        ok.push(`layout ${innerWidth}×${innerHeight}: fora da tela [${out}], sobreposições [${clash}], alvos < 44 px [${small}], barra do desktop escondida ${!deskBar}, rastreador à esquerda ${trackerLeft}`);
        if (out.length || clash.length || small.length || deskBar || !trackerLeft) fail('layout de toque com problema');
      } else ok.push(`layout não conferido (tela ${innerWidth}×${innerHeight} não é de celular)`);

      // 2. Lanternada: sem nada por perto avisa; com criatura a até 20 m, mira nela e liga o ataque automático
      const atk = T.root.querySelector('.tb.atk');
      g.interaction.setTarget(null); C.autoAttack = false;
      press(atk); wait(60);
      const warned = g.interaction.target === null && ui.errors.textContent.includes('Nenhuma criatura');
      // (no preset de celular as criaturas longe ficam invisíveis e só viram miráveis de perto)
      const m = C.mobs.filter((mb) => mb.alive && mb.state !== 'flee').sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos))[0];
      let aimed = 'sem criatura no mapa';
      if (m) {
        const dir = Math.atan2(p.pos.x - m.pos.x, p.pos.z - m.pos.z);
        tp(m.pos.x + Math.sin(dir) * 10, m.pos.z + Math.cos(dir) * 10); p.yaw = dir; wait(60); // de costas para ela
        g.interaction.setTarget(null); C.autoAttack = false;
        press(atk); wait(60);
        aimed = g.interaction.target === m.inter && C.autoAttack;
        C.autoAttack = false; g.interaction.setTarget(null); m.evade?.(); wait(60);
      }
      ok.push(`Lanternada: avisa sem criatura ${warned}, mira a 10 m (de costas) ${aimed}`);
      if (!warned || aimed !== true) fail('mira automática da Lanternada falhou');

      // 3. arco de habilidades acompanha o que o jogador tem (vassoura entra na frente)
      tp(1.5, 19.5); wait(300);
      const arc0 = B.arcIds.join();
      const hadBroom = P.hasItem('vassoura');
      if (!hadBroom) P.addItem('vassoura', 1, true);
      wait(300);
      const arc1 = B.arcIds.join();
      if (!hadBroom) P.removeItem('vassoura');
      wait(300);
      ok.push(`arco: ${arc0} → com vassoura ${arc1} → ${B.arcIds.join()}`);
      if (B.arcIds.length !== 3 || (!hadBroom && !arc1.split(',').includes('mount'))) fail('arco de habilidades não acompanhou os itens');

      // 4. botão contextual: perto do prefeito vira "Falar" e abre a conversa
      const n = QW.npcs.prefeito;
      tp(n.pos.x + Math.sin(n.homeYaw) * 2.5, n.pos.z + Math.cos(n.homeYaw) * 2.5); g.interaction.setTarget(null); wait(400);
      const ctx = T.root.querySelector('.tb.ctx');
      const ctxShown = shown(ctx) && ctx.textContent.includes('Falar');
      press(ctx); wait(300);
      const talked = ui.dialog.open;
      // janelas cabem na tela, com botões de 44 px
      const winCheck = [];
      const fits = (el, name) => {
        if (!phone || !shown(el)) return;
        const r = R(el);
        // botões, caixinhas e listas: os dois lados ≥ 44; itens de lista e controles deslizantes: a altura
        const both = [...el.querySelectorAll('button, input[type=checkbox], select')].filter(shown);
        const tall = [...el.querySelectorAll('li, .qi, input[type=range]')].filter(shown);
        const tiny = [...both.filter((b) => Math.min(R(b).width, R(b).height) < 43.5), ...tall.filter((b) => R(b).height < 43.5)];
        if (!inside(r) || tiny.length) winCheck.push(`${name}${inside(r) ? '' : ' fora'}${tiny.length ? ` alvos < 44 px: ${tiny.map((b) => b.className || b.tagName).join('/')}` : ''}`);
      };
      fits(ui.root.querySelector('#quest'), 'diálogo');
      ui.dialog.close(); wait(60);
      ui.qlog.toggle(true); wait(30); fits(ui.root.querySelector('#qlog'), 'diário'); ui.qlog.toggle(false);
      ui.bags.toggle(); wait(30); fits(ui.root.querySelector('#bags'), 'mochila'); ui.bags.toggle();
      ui.menu.toggle(); wait(30); fits(ui.root.querySelector('#menu'), 'menu'); ui.menu.toggle();
      ui.menu.showOptions(); wait(30); fits(ui.root.querySelector('#options'), 'opções'); ui.hideWin(ui.root.querySelector('#options'));
      ui.toggleMap(true); wait(30); fits(ui.root.querySelector('#worldmap'), 'mapa'); ui.toggleMap(false);
      wait(60);
      ok.push(`contextual "Falar" ${ctxShown}, conversa ${talked}; janelas com problema [${winCheck}]`);
      if (!ctxShown || !talked || winCheck.length) fail('botão contextual ou janelas falharam');

      // 5. grimório: abre por cima do HUD, Sentar senta e fecha; toque longo mostra a dica sem usar a habilidade
      tp(1.5, 19.5); wait(200);
      press(T.root.querySelector('.tb.more')); wait(60);
      const bookOpen = shown(B.book) && T.root.classList.contains('booking');
      const sit = [...B.book.querySelectorAll('.tb.bk')].find((b) => b.textContent.includes('Sentar'));
      press(sit); wait(100);
      const sat = p.sitting && !shown(B.book) && !T.root.classList.contains('booking');
      p.sitting = false; wait(60);
      const v0 = B.arc[0], s0 = v0.slot, cd0 = s0.cdLeft;
      press(v0.el, false); wait(700);
      const tr = R(ui.tooltip), tipFont = parseFloat(getComputedStyle(ui.tooltip).fontSize);
      const tip = !ui.tooltip.classList.contains('hidden') && ui.tooltip.textContent.includes(s0.name)
        && inside(tr) && Math.abs((tr.left + tr.right) / 2 - innerWidth / 2) < 4 && tipFont >= 16 && !getComputedStyle(ui.tooltip).transform.includes('matrix(0');
      v0.el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch' })); wait(60);
      const notUsed = s0.cdLeft === cd0 && ui.tooltip.classList.contains('hidden');
      ok.push(`grimório abre ${bookOpen}, Sentar ${sat}; toque longo em "${s0.name}" mostra a dica ${tip} sem usar ${notUsed}`);
      if (!bookOpen || !sat || !tip || !notUsed) fail('grimório ou toque longo falhou');

      // 5b. com o polegar no joystick, o toque num botão do menu ainda abre a janela (vira click)
      const cv = g.renderer.domElement, micro = [...ui.root.querySelectorAll('#micro button')];
      const bagBtn = micro[micro.length - 1];
      const tch = (id, target, x, y) => new Touch({ identifier: id, target, clientX: x, clientY: y });
      const stickT = tch(90, cv, innerWidth * 0.2, innerHeight * 0.65), br = R(bagBtn), bagT = tch(91, bagBtn, (br.left + br.right) / 2, (br.top + br.bottom) / 2);
      cv.dispatchEvent(new TouchEvent('touchstart', { touches: [stickT], targetTouches: [stickT], changedTouches: [stickT], bubbles: true, cancelable: true }));
      bagBtn.dispatchEvent(new TouchEvent('touchstart', { touches: [stickT, bagT], targetTouches: [bagT], changedTouches: [bagT], bubbles: true, cancelable: true }));
      bagBtn.dispatchEvent(new TouchEvent('touchend', { touches: [stickT], targetTouches: [], changedTouches: [bagT], bubbles: true, cancelable: true }));
      wait(60);
      const multiClick = ui.bags.open;
      cv.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [stickT], bubbles: true, cancelable: true }));
      // item da mochila: toque longo mostra a dica sem usar; toque usa
      // conta a partir do que o jogador já tem (no fim do e2e ele já carrega biscoitos) e devolve a mochila como estava
      const count = () => P.bag.find((b) => b.id === 'biscoito')?.count ?? 0;
      const c0 = count();
      P.addItem('biscoito', 2, true); ui.bags.render(); wait(30);
      let it = ui.root.querySelector('#bags [data-item=biscoito]');
      const pd = (el, id) => el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch', pointerId: id }));
      const pu = (el, id) => el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerType: 'touch', pointerId: id }));
      pd(it, 21); wait(700);
      const itemTip = !ui.tooltip.classList.contains('hidden') && ui.tooltip.textContent.includes('Biscoito');
      pu(it, 21); wait(30);
      const keptOnHold = count() === c0 + 2 && ui.tooltip.classList.contains('hidden');
      it = ui.root.querySelector('#bags [data-item=biscoito]');
      pd(it, 22); pu(it, 22); wait(30);
      const usedOnTap = count() === c0 + 1;
      while (count() > c0) P.removeItem('biscoito');
      ui.bags.toggle(false); ui.hideTooltip(); wait(30);
      ok.push(`polegar no joystick + toque no menu abre a mochila ${multiClick}; item: toque longo mostra ${itemTip} sem usar ${keptOnHold}, toque usa ${usedOnTap}`);
      if (!multiClick || !itemTip || !keptOnHold || !usedOnTap) fail('toque com outro dedo na tela ou item da mochila falhou');

      // 5c. tocar no vazio solta o alvo...
      const tapAt = (id, x, y) => {
        const q = tch(id, cv, x, y);
        cv.dispatchEvent(new TouchEvent('touchstart', { touches: [q], targetTouches: [q], changedTouches: [q], bubbles: true, cancelable: true }));
        cv.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [q], bubbles: true, cancelable: true }));
        wait(60);
      };
      g.interaction.setTarget(QW.npcs.prefeito.inter); wait(30);
      tapAt(92, innerWidth * 0.5, innerHeight * 0.8);
      const cleared = g.interaction.target === null;
      // ...mas não no meio da briga: o polegar reencostando no joystick (ou errando a criatura) não desliga a Lanternada
      let fightKept = 'sem criatura no mapa';
      const foe = C.mobs.filter((mb) => mb.alive && mb.state !== 'flee').sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos))[0];
      if (foe) {
        // perto dela (alvo a mais de 60 m o jogo solta sozinho)
        const fd = Math.atan2(p.pos.x - foe.pos.x, p.pos.z - foe.pos.z);
        tp(foe.pos.x + Math.sin(fd) * 6, foe.pos.z + Math.cos(fd) * 6); p.yaw = g.cam.yaw = fd + Math.PI; wait(60);
        g.interaction.setTarget(foe.inter); C.autoAttack = true;
        tapAt(94, innerWidth * 0.15, innerHeight * 0.75); // zona do joystick
        tapAt(95, innerWidth * 0.55, innerHeight * 0.8); // vazio fora do joystick, com a briga ligada
        fightKept = g.interaction.target === foe.inter && C.autoAttack;
        C.autoAttack = false; g.interaction.setTarget(null); foe.evade?.(); wait(60);
      }
      // 5c'. com o polegar no joystick, tocar no ícone (SVG) da opção de conversa responde e não dá erro
      const nP = QW.npcs.prefeito, err0 = window.__errors.length;
      tp(nP.pos.x + Math.sin(nP.homeYaw) * 2.5, nP.pos.z + Math.cos(nP.homeYaw) * 2.5); wait(100);
      g.interaction.tryInteract(nP.inter); wait(200);
      const svg = ui.root.querySelector('#quest .opts li svg');
      let svgTap = 'sem opção com ícone';
      if (svg) {
        const before = ui.root.querySelector('#quest .scroll').innerHTML;
        const sr = svg.getBoundingClientRect(), stk = tch(96, cv, innerWidth * 0.2, innerHeight * 0.65), sv = tch(97, svg, (sr.left + sr.right) / 2, (sr.top + sr.bottom) / 2);
        cv.dispatchEvent(new TouchEvent('touchstart', { touches: [stk], targetTouches: [stk], changedTouches: [stk], bubbles: true, cancelable: true }));
        svg.dispatchEvent(new TouchEvent('touchstart', { touches: [stk, sv], targetTouches: [sv], changedTouches: [sv], bubbles: true, cancelable: true }));
        svg.dispatchEvent(new TouchEvent('touchend', { touches: [stk], targetTouches: [], changedTouches: [sv], bubbles: true, cancelable: true }));
        wait(60);
        cv.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [stk], bubbles: true, cancelable: true }));
        svgTap = ui.root.querySelector('#quest .scroll').innerHTML !== before && window.__errors.length === err0;
      }
      ui.dialog.close(); wait(60);
      ok.push(`briga continua com toque no joystick e no vazio ${fightKept}; ícone SVG da conversa com polegar no joystick ${svgTap}`);
      if (fightKept === false || svgTap === false) fail('toque no meio da briga ou no ícone SVG falhou');
      // 5d. à noite a lanterna entra no arco
      const h0 = g.dayNight.time;
      g.debug.setTime(22); wait(300);
      const nightArc = B.arcIds[0] === 'lantern';
      g.debug.setTime(h0); wait(300);
      // 5e. dois botões apertados ao mesmo tempo (dois dedos): os dois disparam
      const bk = (name) => [...B.book.querySelectorAll('.tb.bk')].find((b) => b.textContent.includes(name));
      const sBoo = B.byId.boo, sDance = B.byId.dance;
      sBoo.cdLeft = 0; sDance.cdLeft = 0; p.courage = 100;
      pd(bk('Buu'), 31); pd(bk('Dança'), 32); pu(bk('Buu'), 31); pu(bk('Dança'), 32); wait(30);
      const both = sBoo.cdLeft > 0 && sDance.cdLeft > 0;
      for (const b of B.book.querySelectorAll('.tb.on')) b.classList.remove('on');
      p.action = null; wait(30);
      // 5f. rastreador expandido recolhe quando o joystick anda (ele cobre a área do polegar)
      let collapsed = 'sem missão ativa';
      // sem missão ativa o rastreador some: aceita uma disponível só para o teste (e abandona depois)
      const tmpQ = P.activeQuests().length ? null : QIDS.find((id) => P.isAvailable(id));
      if (tmpQ) P.accept(tmpQ);
      if (P.activeQuests().length) {
        ui.setTrackerCollapsed(false); wait(30);
        const a = tch(93, cv, innerWidth * 0.2, innerHeight * 0.7), b2 = tch(93, cv, innerWidth * 0.2, innerHeight * 0.7 - 50);
        cv.dispatchEvent(new TouchEvent('touchstart', { touches: [a], targetTouches: [a], changedTouches: [a], bubbles: true, cancelable: true }));
        cv.dispatchEvent(new TouchEvent('touchmove', { touches: [b2], targetTouches: [b2], changedTouches: [b2], bubbles: true, cancelable: true }));
        wait(100);
        collapsed = ui.trackerCollapsed;
        cv.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [b2], bubbles: true, cancelable: true }));
        wait(60);
      }
      if (tmpQ) P.abandon(tmpQ);
      ok.push(`toque no vazio solta o alvo ${cleared}; lanterna no arco à noite ${nightArc}; dois botões juntos ${both}; rastreador recolhe ao andar ${collapsed}`);
      if (!cleared || !nightArc || !both || collapsed === false) fail('alvo, arco noturno, dois botões ou rastreador falharam');

      // 6. aviso de "vire o celular" existe (o touch.css só mostra em retrato)
      const rot = document.getElementById('rotate');
      // 7. volta ao modo do desktop: barra de ações e rastreador no lugar
      g.applySetting('controls', 'auto'); g.input.lastPointer = 'mouse'; wait(100);
      const back = !g.touchMode && shown(ui.root.querySelector('#bottom .bar-frame')) && !!ui.root.querySelector('.anchor.tr #tracker');
      g.applySetting('controls', prevMode); g.input.lastPointer = 'mouse'; wait(60);
      ok.push(`aviso de retrato ${!!rot}; de volta ao desktop ${back}`);
      if (!rot || !back) fail('volta ao modo desktop falhou');
      L.push('toqueHud: ' + ok.join('; '));
    },
    contexto() {
      // placa de vídeo perdida: chama o handler do jogo direto (um evento no canvas também chegaria ao three, que
      // pararia de desenhar de vez), confere que salva, para o jogo e avisa, e depois volta ao normal
      const ok = [], fail = (m) => { throw new Error(m + ' | ' + ok.join('; ')); };
      const s0 = P.save;
      let saves = 0, prevented = false;
      P.save = () => { saves++; };
      try {
        g._onContextLost({ preventDefault: () => { prevented = true; } });
        const t0 = g.time;
        g.tick(1 / 30);
        const el = document.getElementById('ctxlost'), b = el?.querySelector('button')?.getBoundingClientRect();
        const lost = g.contextLost && prevented && g.time === t0 && saves === 1 && !!el && b.height >= 43.5;
        el?.remove();
        g.contextLost = false;
        g.tick(1 / 30);
        const drawing = g.renderer.info.render.calls > 0;
        ok.push(`depois volta a desenhar ${drawing}`);
        if (!drawing) fail('o renderer parou depois do teste de contexto');
        ok.push(`contexto perdido: para, salva e avisa ${lost}`);
        // celular: o sistema mata a aba em segundo plano sem beforeunload; salva no pagehide
        saves = 0;
        window.dispatchEvent(new Event('pagehide'));
        ok.push(`salva no pagehide ${saves === 1}`);
        if (!lost || saves !== 1) fail('contexto perdido ou pagehide');
      } finally {
        P.save = s0;
      }
      L.push('contexto: ' + ok.join('; '));
    },
    desktop() {
      // os presets de desktop não levam nada do celular (regra: desktop sem mudança e ≥ 48 FPS em Full HD)
      const ok = [], fail = (m) => { throw new Error(m + ' | ' + ok.join('; ')); };
      if (g.qualityName === 'movel') fail('abra a página com uma qualidade de desktop (&q=media, por exemplo)');
      const Q = g.quality, sc = g.sun.shadow.camera;
      wait(30);
      const grass = [];
      g.outdoor.traverse((o) => { if (o.material?.defines?.GRASS_FAR) grass.push(o); });
      const inv = {
        corte: !g.farCull && !g.post.normalPass.cull,
        contorno: !('OUTLINE_FAR' in g.post.outlinePass.material.defines),
        grama: grass.length === 0,
        neblina: g.scene.fog.near === g.dayNight.cur.fd || !!g.indoors.active,
        sombra: sc.right === 44 && g.sun.shadow.mapSize.x === Q.shadow,
        bloom: g.post.bloomPass.enabled === Q.bloom,
        lod: Q.lod === undefined,
        adaptativa: Q.adapt === undefined && Q.cap === undefined,
        aranhas: g.life.spiders.every((s) => s.g.children.length === 2 && s.g.visible),
      };
      // a neblina continua contando a profundidade (no celular ela conta a distância até a câmera)
      const gl = g.renderer.getContext();
      const vsrc = g.renderer.info.programs.map((pr) => gl.getAttachedShaders(pr.program).map((sh) => gl.getShaderSource(sh)).join('\n')).filter((src) => src.includes('vFogDepth ='));
      inv.neblinaPorProfundidade = vsrc.length > 0 && vsrc.every((src) => src.includes('vFogDepth = - mvPosition.z') && !src.includes('length( mvPosition.xyz )'));
      // criatura a ~20 m à frente do jogador com a câmera afastada (30 m): sombra, contorno e visibilidade contam
      // só a câmera, como antes do celular (contar o jogador dava sombra e contorno a mais)
      const foe = C.mobs.filter((mb) => mb.alive && mb.state === 'idle').sort((a, b) => a.pos.distanceTo(g.player.pos) - b.pos.distanceTo(g.player.pos))[0];
      const cam = g.cam, d0 = [cam.targetDist, cam.dist, cam.curDist];
      let lodBad = 'sem criatura';
      if (foe) {
        const yaw = Math.atan2(foe.pos.x - g.player.pos.x, foe.pos.z - g.player.pos.z);
        tp(foe.pos.x - Math.sin(yaw) * 20, foe.pos.z - Math.cos(yaw) * 20);
        g.player.yaw = yaw;
        cam.targetDist = cam.dist = cam.curDist = 30;
        cam.snapBehind(g.player);
        wait(200);
        const cp = g.camera.position, near = (v, t) => Math.abs(v - t) < 1.5;
        lodBad = C.mobs.filter((mb) => {
          if (mb.state === 'gone' || mb.engaged) return false;
          const cd = cp.distanceTo(mb.pos), pd = Math.hypot(g.player.pos.x - mb.pos.x, g.player.pos.z - mb.pos.z);
          if (mb.state === 'idle' && pd > 95) return false;
          if (near(cd, 22) || near(cd, 36) || near(cd, 80)) return false;
          const vis = cd < 80;
          return mb.rig.root.visible !== vis || (vis && mb.lod !== (cd < 22 ? 0 : cd < 36 ? 1 : 2));
        }).length;
        [cam.targetDist, cam.dist, cam.curDist] = d0;
        cam.snapBehind(g.player);
        wait(60);
      }
      inv.lodPelaCamera = lodBad === 0;
      // sem limite de quadros: a 144 Hz desenha todos
      let t = g.last + 1000, n = 0;
      g.last = t;
      for (let i = 0; i < 72; i++) { t += 1000 / 144; if (g._frame(t)) n++; }
      g.last = performance.now();
      inv.quadros = n === 72;
      const bad = Object.entries(inv).filter(([, v]) => !v).map(([k2]) => k2);
      ok.push(`${g.qualityName}: ${Object.keys(inv).length} invariantes, falhas [${bad}]; programas com neblina ${vsrc.length}; criaturas fora do LOD antigo ${lodBad}`);
      if (bad.length) fail('o desktop pegou algo do celular');
      L.push('desktop: ' + ok.join('; '));
    },
    movel() {
      // preset de celular: corte por distância, neblina, sombra, LOD, limite de quadros e resolução adaptativa
      const ok = [], fail = (m) => { throw new Error(m + ' | ' + ok.join('; ')); };
      if (g.qualityName !== 'movel') fail('abra a página com &q=movel');
      const Q = g.quality, F = g.farCull, R = g.renderer, sc = g.sun.shadow.camera;
      if (!F || g.post.normalPass.cull !== F) fail('sem corte por distância');
      if (g.sun.shadow.mapSize.x !== Q.shadow || sc.right !== Q.shadowBox || g.post.bloomPass.enabled !== g.post.hdr) fail('sombra ou bloom fora do preset');
      if (g.post.outlinePass.material.defines.OUTLINE_FAR !== Q.outlineFar.toFixed(1)) fail('contorno sem apagar a tinta com a distância');
      const gm = F.items.find((it) => it.far === Q.grassFar)?.m.material;
      if (gm?.defines?.GRASS_FAR !== Q.grassFar.toFixed(1)) fail('grama sem afundar com a distância');
      // vista mais pesada do mapa: do farol, olhando o vale todo
      const h0 = g.dayNight.time;
      g.dayNight.setTime(12);
      tp(44, -124); g.player.yaw = 0; g.cam.snapBehind(g.player);
      for (let i = 0; i < 8; i++) g.tick(1 / 30);
      const calls = R.info.render.calls;
      const farDrawn = F.items.filter((it) => it.m.visible && it.d > it.far).length;
      const nearHidden = F.items.filter((it) => !it.m.visible && it.d <= it.far).length;
      const fog = g.scene.fog.near >= Q.fogMin;
      ok.push(`farol: ${calls} chamadas de desenho; células além do corte desenhadas ${farDrawn}, aquém escondidas ${nearHidden}; contorno devolveu as células ${F._hidden.length === 0}; neblina ${g.scene.fog.near.toFixed(4)}`);
      if (calls < 100 || calls > 400 || farDrawn || nearHidden || F._hidden.length || !fog) fail('corte por distância');
      // PNJs, criaturas e bichos aparecem mais perto
      // (PNJs e criaturas contam o mais perto entre câmera e jogador)
      const cp = g.camera.position, pp = g.player.pos, k = Q.lod;
      const near = (q) => Math.min(cp.distanceTo(q), Math.hypot(pp.x - q.x, pp.z - q.z));
      const npcFar = QW.npcList.filter((n) => !n.indoorLevel && n.rig.root.visible && near(n.pos) > 110 * k + 1).length;
      const mobFar = C.mobs.filter((m) => m.rig.root.visible && !m.engaged && near(m.pos) > 80 * k + 1).length;
      const sp = g.life.spiders;
      const spFar = sp.filter((s) => s.g.visible && Math.hypot(cp.x - s.x, cp.y - s.top, cp.z - s.z) > 70 * k).length;
      const spMerged = sp.every((s) => s.g.children.length === 2);
      ok.push(`longe e visíveis: PNJs ${npcFar}, criaturas ${mobFar}, aranhas ${spFar}; aranha em 2 malhas ${spMerged}`);
      if (npcFar || mobFar || spFar || !spMerged) fail('LOD do celular');
      g.dayNight.setTime(h0);
      // no máximo 60 quadros, sempre no mesmo ritmo
      let t = g.last + 1000;
      const rate = (hz, n, jit = 0) => {
        g.last = t;
        let c = 0;
        for (let i = 0; i < n; i++) { t += 1000 / hz + (i % 2 ? jit : -jit); if (g._frame(t)) c++; }
        return c;
      };
      const r120 = rate(120, 120), r90 = rate(90, 90), r75 = rate(75, 75), r60 = rate(60, 60, 0.6);
      g.last = performance.now();
      ok.push(`quadros por segundo: 120 Hz → ${r120}, 90 Hz → ${r90}, 75 Hz → ${r75}, 60 Hz → ${r60}`);
      if (r120 !== 60 || r90 !== 45 || r75 !== 75 || r60 !== 60) fail('limite de quadros');
      // resolução adaptativa: estável a 29 FPS fica; abaixo de 28 cai 0,1 por vez até 0,75; acima de 42 sobe
      let ad = 'aba escondida';
      if (!document.hidden) {
        const fps0 = g.fps;
        const adapt = (fps) => { g._fpsHist = []; for (let i = 0; i < 6; i++) { g.fps = fps; g._adapt(); } return g.dynScale ?? 1; };
        g.dynScale = 1;
        const a = [adapt(29), adapt(25), adapt(25), adapt(25), adapt(25), adapt(50)];
        ad = a.map((v) => v.toFixed(2)).join(' → ');
        g.fps = fps0; g.dynScale = 1; g._fpsHist = [];
        R.setPixelRatio(Math.min(window.devicePixelRatio, Q.maxPR) * Q.scale);
        g.resize();
        if (ad !== '1.00 → 0.90 → 0.80 → 0.75 → 0.75 → 0.80') fail('resolução adaptativa do celular: ' + ad);
      }
      // o quadro de volta do segundo plano (segundos) não entra na média
      g._fpsAcc = 0.2; g._fpsN = 7;
      const fpsB = g.fps;
      g._trackPerf(3);
      const bg = g._fpsAcc === 0 && g._fpsN === 0 && g.fps === fpsB;
      ok.push(`resolução adaptativa ${ad}; volta do segundo plano ignorada ${bg}`);
      if (!bg) fail('quadro de volta do segundo plano entrou na medida');
      L.push('movel: ' + ok.join('; '));
    },
  };
  return { run(name) { try { steps[name](); return 'ok'; } catch (err) { return 'ERRO ' + String(err); } }, log: L };
})();
