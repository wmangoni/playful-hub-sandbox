import * as THREE from 'three';

/** Retratos 3D ao vivo (como no WoW) renderizados num WebGL separado e copiados para canvases 2D. */
export class Portraits {
  constructor() {
    const r = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    r.setPixelRatio(1);
    r.setSize(160, 160, false);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.15;
    r.setClearColor(0x000000, 0);
    this.renderer = r;
    this.scene = new THREE.Scene();
    const key = new THREE.DirectionalLight('#ffe8c8', 2.6);
    key.position.set(1.2, 1.6, 2.2);
    const rim = new THREE.DirectionalLight('#b88aff', 2.2);
    rim.position.set(-1.5, 0.8, -2);
    const hemi = new THREE.HemisphereLight('#9aa0d8', '#2a1a30', 1.8);
    this.scene.add(key, rim, hemi);
    this.camera = new THREE.PerspectiveCamera(26, 1, 0.05, 30);
    this.slots = {};
    this._t = 0;
  }
  bind(name, canvas) {
    canvas.width = canvas.height = 160;
    this.slots[name] = { canvas, ctx: canvas.getContext('2d'), rig: null };
  }
  setRig(name, rig) {
    const s = this.slots[name];
    if (!s) return;
    if (s.rig) this.scene.remove(s.rig.root);
    s.rig = rig;
    if (rig) {
      rig.root.position.set(0, 0, 0);
      rig.root.rotation.set(0, 0, 0);
      rig.root.visible = false;
      this.scene.add(rig.root);
    } else s.ctx.clearRect(0, 0, 160, 160);
  }
  update(dt) {
    this._t -= dt;
    if (this._t > 0) return;
    const step = 1 / 20;
    this._t = step;
    for (const s of Object.values(this.slots)) {
      if (!s.rig) continue;
      for (const o of Object.values(this.slots)) if (o.rig) o.rig.root.visible = o === s;
      const rig = s.rig;
      rig.animate(step, { speed: 0 });
      const y = rig.portraitY ?? 1.5;
      const d = rig.portraitDist ?? 1.75;
      const t = rig.t;
      this.camera.position.set(Math.sin(t * 0.3) * 0.08 * d + 0.1 * d, y + 0.05, d);
      this.camera.lookAt(0, y - 0.02, 0);
      this.renderer.render(this.scene, this.camera);
      s.ctx.clearRect(0, 0, 160, 160);
      s.ctx.drawImage(this.renderer.domElement, 0, 0);
    }
  }
}
