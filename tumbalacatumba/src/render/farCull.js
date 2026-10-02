import * as THREE from 'three';

const _box = new THREE.Box3();
const _sph = new THREE.Sphere();

/**
 * Corte por distância do cenário estático (só no preset de celular). As malhas mescladas por célula e material
 * (StaticBatch) cuja borda está além de viewFar não são desenhadas; a neblina do celular é um pouco mais densa
 * e esconde o corte. A grama some mais perto (grassFar), depois de afundar no chão no shader (sem estalo).
 * No passe de normais do contorno, o que está além de outlineFar nem entra (o shader do contorno já apagou a tinta
 * antes dessa distância). Peças soltas presas a um prédio (pás do moinho, ponteiros do relógio) somem junto.
 */
export class FarCull {
  constructor(meshes, { viewFar = Infinity, grassFar = Infinity, outlineFar = Infinity, grassMat = null, loose = [] } = {}) {
    this.items = meshes.map((m) => {
      const s = m.geometry.boundingSphere; // as malhas mescladas ficam na origem: o centro já está no mundo
      return { m, c: s.center, r: s.radius, far: m.material === grassMat ? grassFar : viewFar, d: 0 };
    });
    for (const o of loose) {
      // centro no pivô e raio que cobre a peça girando (pás do moinho)
      const c = o.getWorldPosition(new THREE.Vector3());
      _box.setFromObject(o).getBoundingSphere(_sph);
      this.items.push({ m: o, c, r: _sph.radius + _sph.center.distanceTo(c), far: viewFar, d: 0 });
    }
    this.outlineFar = outlineFar;
    this._hidden = [];
  }

  /** distância de cada célula (até a borda da esfera) e quem é desenhado neste quadro */
  update(camPos) {
    for (const it of this.items) {
      it.d = Math.max(0, it.c.distanceTo(camPos) - it.r);
      it.m.visible = it.d <= it.far;
    }
  }

  /** passe de normais: tira o que está longe (endOutline devolve) */
  beginOutline() {
    const h = this._hidden;
    for (const it of this.items) {
      if (it.m.visible && it.d > this.outlineFar) {
        it.m.visible = false;
        h.push(it.m);
      }
    }
  }
  endOutline() {
    for (const m of this._hidden) m.visible = true;
    this._hidden.length = 0;
  }
}
