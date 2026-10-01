import * as THREE from 'three';
import { clamp, damp, dampAngle } from '../util/math.js';

/** Câmera de terceira pessoa no estilo WoW (órbita, zoom na roda, colisão com terreno e casas). */
export class WowCamera {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;
    this.yaw = Math.PI;
    this.pitch = 0.3;
    this.dist = 8.5;
    this.targetDist = 8.5;
    this.curDist = 8.5;
    this.minDist = 1.2;
    this.maxDist = 30;
    this.sens = 0.0045;
    this.invertY = false;
    this.followRate = 2.4;
    this.pivot = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this.shake = 0;
    this.override = null; // cinematográfica (tela de título)
  }

  /** aplica arrasto do mouse e roda (antes do jogador se mover) */
  handleInput(input) {
    if (input.dragging) {
      this.yaw -= input.dx * this.sens;
      this.pitch += input.dy * this.sens * (this.invertY ? -1 : 1);
      this.pitch = clamp(this.pitch, -1.15, 1.48);
    }
    if (input.wheel) {
      this.targetDist = clamp(this.targetDist * Math.pow(1.14, input.wheel), this.minDist, this.maxDist);
    }
  }

  snapBehind(player) {
    this.yaw = player.yaw;
    this.pivot.set(player.pos.x, player.pos.y + 1.55, player.pos.z);
  }

  update(dt, player, input) {
    if (this.override) {
      this.camera.position.copy(this.override.pos);
      this.camera.lookAt(this.override.look);
      return;
    }
    // teclado A/D gira a câmera junto; "seguir de forma inteligente" quando anda
    const leftDrag = input.left && !input.right;
    if (!leftDrag) this.yaw += player.turnDelta;
    if (!input.anyButton && player.isMoving && !player.backpedal) this.yaw = dampAngle(this.yaw, player.yaw, this.followRate, dt);

    this.dist = damp(this.dist, this.targetDist, 10, dt);
    const tx = player.pos.x, tz = player.pos.z, ty = player.pos.y + (player.mounted ? 2.0 : 1.55);
    this.pivot.x = tx;
    this.pivot.z = tz;
    this.pivot.y = damp(this.pivot.y, ty, 14, dt);
    if (Math.abs(this.pivot.y - ty) > 3) this.pivot.y = ty;

    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const dir = this._dir.set(-Math.sin(this.yaw) * cp, sp, -Math.cos(this.yaw) * cp);

    // colisão: chão (e forro, dentro da mansão) ao longo do raio + paredes das casas
    let maxT = this.dist;
    const w = this.world;
    const indoor = w.interior?.active;
    for (let t = 0.5; t <= this.dist; t += indoor ? 0.2 : 0.35) {
      const px = this.pivot.x + dir.x * t, py = this.pivot.y + dir.y * t, pz = this.pivot.z + dir.z * t;
      if (py < w.groundHeight(px, pz, py + 0.3) + 0.4 || (indoor && py > w.ceilingHeight(px, pz, this.pivot.y) - 0.3)) {
        maxT = Math.max(0.5, t - (indoor ? 0.2 : 0.35));
        break;
      }
    }
    const hit = w.colliders.raycast(this.pivot.x, this.pivot.y, this.pivot.z, dir.x, dir.y, dir.z, maxT);
    if (hit < maxT) maxT = Math.max(0.5, hit - 0.35);
    this.curDist = maxT < this.curDist ? maxT : damp(this.curDist, maxT, 5, dt);

    const cam = this.camera;
    cam.position.copy(this.pivot).addScaledVector(dir, this.curDist);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.5);
      const s = this.shake * 0.25;
      cam.position.x += (Math.random() - 0.5) * s;
      cam.position.y += (Math.random() - 0.5) * s;
    }
    // olha um pouco acima da cabeça quando afastada (personagem fica no terço inferior)
    this._look.copy(this.pivot);
    this._look.y += 0.25 + Math.min(this.curDist, 14) * 0.03;
    cam.lookAt(this._look);

    // esconde o personagem quando a câmera entra na cabeça
    player.setVisible(this.curDist > 0.9);
  }
}
