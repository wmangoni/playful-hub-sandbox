import * as THREE from 'three';
import { clamp, damp, dampAngle, wrapAngle } from '../util/math.js';
import { createPlayerModel, createBroomModel } from './models.js';
import { WATER_LEVEL } from '../world/layout.js';

export class Player {
  constructor(game) {
    this.game = game;
    this.world = game.world;
    this.name = 'Vicente';
    this.pos = new THREE.Vector3(0, 0, 13);
    this.yaw = Math.PI;
    this.vel = new THREE.Vector3();
    this.grounded = true;
    this.autorun = false;
    this.radius = 0.4;
    this.runSpeed = 6.6;
    this.backSpeed = 4.2;
    this.turnSpeed = Math.PI;
    this.turnDelta = 0;
    this.isMoving = false;
    this.backpedal = false;
    this.speedNow = 0;
    this.strafe = 0;
    this.airTime = 0;
    this.mounted = false;
    this.action = null;
    this.actionT = 0;
    this.sitting = false;
    this.frozen = false;
    this.wading = 0;
    this.stepDist = 0;
    this.onStep = null;
    this.onLand = null;
    this.courage = 100;
    this.dead = false;
    this.hitStop = 0; // congela o golpe por um instante quando acerta (dá peso à pancada)

    this.rig = createPlayerModel();
    this.object = this.rig.root;
    this.visualYaw = this.yaw;
    this.broom = createBroomModel();
    this.broom.visible = false;
    this.broom.position.set(0, 0.62, 0.1);
    this.rig.body.add(this.broom);
    this.lanternOn = false;
    // a luz fica um pouco à frente e acima (não "estoura" o próprio personagem)
    this.lanternLight = new THREE.PointLight('#ffb35c', 0, 13, 1.5);
    this.lanternLight.position.set(0.3, 3.1, 1.7);
    this.object.add(this.lanternLight);
    this.pos.y = this.world.groundHeight(this.pos.x, this.pos.z);
  }

  setVisible(v) {
    this.rig.body.visible = v;
  }

  setHat(v) {
    this.rig.hat.visible = !!v;
  }

  /** senta num ponto fixo (ex.: em cima do ovo) até se mexer */
  seatAt(x, y, z) {
    this.seat = new THREE.Vector3(x, y, z);
    this.sitting = true;
    this.vel.set(0, 0, 0);
    this.autorun = false;
  }

  leaveSeat(hop = false) {
    if (!this.seat) return;
    const s = this.seat;
    this.seat = null;
    this.sitting = false;
    if (hop) {
      this.pos.set(s.x + Math.sin(this.yaw) * 1.4, s.y, s.z + Math.cos(this.yaw) * 1.4);
      this.vel.set(Math.sin(this.yaw) * 2, 5, Math.cos(this.yaw) * 2);
      this.grounded = false;
    }
  }

  setAction(name, duration = 0) {
    this.action = name;
    this.actionT = 0;
    this.actionDur = duration;
  }

  teleport(x, z, yaw) {
    this.pos.set(x, this.world.groundHeight(x, z), z);
    this.vel.set(0, 0, 0);
    if (yaw !== undefined) this.yaw = yaw;
    this.visualYaw = this.yaw;
  }

  update(dt, input, cam, allowInput = true) {
    const k = input;
    const rmb = input.right && allowInput, lmb = input.left && allowInput;
    const K = (c) => allowInput && k.down(c);

    let fwd = (K('KeyW') || K('ArrowUp') ? 1 : 0) - (K('KeyS') || K('ArrowDown') ? 1 : 0);
    if (allowInput && (k.hit('KeyR') || k.hit('NumLock'))) this.autorun = !this.autorun;
    if (fwd !== 0 && (k.hit('KeyW') || k.hit('KeyS') || k.hit('ArrowUp') || k.hit('ArrowDown'))) this.autorun = false;
    if (this.autorun && fwd === 0) fwd = 1;
    if (lmb && rmb) fwd = 1;
    let strafe = (K('KeyE') ? 1 : 0) - (K('KeyQ') ? 1 : 0);
    const left = K('KeyA') || K('ArrowLeft'), right = K('KeyD') || K('ArrowRight');
    let turn = 0;
    if (rmb) strafe += (right ? 1 : 0) - (left ? 1 : 0);
    else turn = (left ? 1 : 0) - (right ? 1 : 0);
    strafe = clamp(strafe, -1, 1);
    if (this.frozen) { fwd = 0; strafe = 0; turn = 0; }

    this.turnDelta = turn * this.turnSpeed * dt;
    if (rmb && !this.frozen) this.yaw = cam.yaw;
    else this.yaw += this.turnDelta;
    this.yaw = wrapAngle(this.yaw);

    if (this.seat) {
      if (fwd !== 0 || strafe !== 0 || (allowInput && k.hit('Space'))) {
        this.leaveSeat(true);
      } else {
        this.pos.copy(this.seat);
        this.grounded = true;
        this.isMoving = false;
        this.speedNow = 0;
        this.visualYaw = dampAngle(this.visualYaw, this.yaw, 10, dt);
        this.object.position.copy(this.pos);
        this.object.rotation.y = this.visualYaw;
        this.rig.animate(dt, { speed: 0, sit: true });
        return;
      }
    }

    // direção de movimento
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const rx = -fz, rz = fx;
    let mx = fx * fwd + rx * strafe, mz = fz * fwd + rz * strafe;
    const ml = Math.hypot(mx, mz);
    let speed = 0;
    if (ml > 0) {
      mx /= ml;
      mz /= ml;
      speed = fwd < 0 ? this.backSpeed : this.runSpeed;
      if (this.mounted) speed *= 1.65;
      speed *= 1 - this.wading * 0.4;
    }
    const moving = speed > 0;
    if (moving && (this.sitting || this.action === 'dance')) {
      this.sitting = false;
      if (this.action === 'dance') this.action = null;
    }
    this.backpedal = fwd < 0;
    this.strafe = strafe;

    if (this.grounded) {
      this.vel.x = mx * speed;
      this.vel.z = mz * speed;
      if (allowInput && k.hit('Space') && !this.frozen && !this.mounted) {
        this.vel.y = 7.3;
        this.grounded = false;
        this.sitting = false;
        this.game.audio?.sfx('jump');
      }
    } else {
      // WoW preserva o impulso no ar; um pouquinho de controle deixa mais gostoso
      this.vel.x = damp(this.vel.x, mx * speed, 0.9, dt);
      this.vel.z = damp(this.vel.z, mz * speed, 0.9, dt);
    }
    this.vel.y -= 20 * dt;

    // XZ com colisão
    const w = this.world;
    const [nx, nz] = w.moveCircle(this.pos, this.pos.x + this.vel.x * dt, this.pos.z + this.vel.z * dt, this.radius);
    const moved = Math.hypot(nx - this.pos.x, nz - this.pos.z);
    this.pos.x = nx;
    this.pos.z = nz;
    this.speedNow = dt > 0 ? moved / dt : 0;
    this.isMoving = moving && this.speedNow > 0.5;

    // Y
    const g = w.groundHeight(this.pos.x, this.pos.z);
    const floor = this.mounted ? g + 0.55 + Math.sin(this.rig.t * 2.6) * 0.08 : g;
    this.pos.y += this.vel.y * dt;
    if (this.pos.y <= floor) {
      if (!this.grounded) {
        const impact = clamp(-this.vel.y / 14, 0, 1);
        if (this.airTime > 0.25) {
          this.rig.land(0.4 + impact);
          this.onLand?.(impact);
        }
      }
      this.pos.y = this.mounted ? damp(this.pos.y, floor, 12, dt) : floor;
      this.vel.y = 0;
      this.grounded = true;
      this.airTime = 0;
    } else if (this.grounded && this.pos.y - floor < 0.55 && this.vel.y <= 0) {
      this.pos.y = floor;
      this.vel.y = 0;
    } else {
      this.grounded = false;
      this.airTime += dt;
    }

    this.wading = clamp((WATER_LEVEL - g) / 0.9, 0, 1) * (this.pos.y < WATER_LEVEL + 0.2 ? 1 : 0);

    // passos
    if (this.isMoving && this.grounded && !this.mounted) {
      this.stepDist += moved;
      if (this.stepDist > 1.55) {
        this.stepDist = 0;
        this.onStep?.();
      }
    }

    // visual: gira o corpo na direção do movimento diagonal (como no WoW)
    let offset = 0;
    if (moving && fwd >= 0 && strafe !== 0) offset = fwd > 0 ? -strafe * 0.7 : -strafe * 1.2;
    if (moving && fwd < 0 && strafe !== 0) offset = strafe * 0.6;
    this.visualYaw = dampAngle(this.visualYaw, this.yaw + offset, 14, dt);
    this.object.position.copy(this.pos);
    this.object.rotation.y = this.visualYaw;

    this.courage = Math.min(100, this.courage + dt * (this.sitting ? 12 : 4));
    if (this.action) {
      if (this.hitStop > 0) this.hitStop -= dt;
      else this.actionT += dt;
      if (this.actionDur && this.actionT > this.actionDur) this.action = null;
    }
    this.rig.animate(dt, {
      speed: this.grounded ? this.speedNow : 0,
      back: this.backpedal,
      strafe: offset === 0 ? strafe : 0,
      air: !this.grounded && !this.mounted,
      vy: this.vel.y,
      action: this.action,
      actionT: this.actionT,
      sit: this.sitting,
      mounted: this.mounted,
      snap: this.action === 'attack',
    });

    // lanterna: acende sozinha à noite ou pelo botão
    const night = this.game.dayNight?.night ?? 0;
    const target = (this.lanternOn ? 1 : 0) * (0.35 + 0.65 * night);
    const up = this.game.progress?.status('vagalumes') === 'done';
    if (up !== this._lanternUp) {
      this._lanternUp = up;
      this.lanternLight.color.set(up ? '#a8ff7a' : '#ffb35c');
      this.lanternLight.distance = up ? 17 : 13;
      this.rig.lanternMat.userData.greenish = up;
    }
    this.lanternLight.intensity = damp(this.lanternLight.intensity, target * (up ? 9 : 6.5), 6, dt);
    // na Lanternada a chama se aviva (o golpe fica visível mesmo de dia)
    const flare = this.action === 'attack' ? Math.sin(Math.min(1, this.actionT / 0.45) * Math.PI) : 0;
    this.rig.lanternGlow.scale.setScalar(0.6 + target * 0.7 + flare * 1.1);
  }

  setMounted(v) {
    this.mounted = v;
    this.broom.visible = v;
    if (v) this.sitting = false;
  }
}
