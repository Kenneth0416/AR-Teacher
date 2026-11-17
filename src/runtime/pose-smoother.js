// Pose smoothing for the AR anchor.
//
// MindAR writes a fresh pose into anchor.group.matrix every camera frame. With the few trackable
// features a text page offers, that pose is noisy, mostly in rotation, and rotation noise is
// amplified by the height of anything standing up off the page (the "lever arm"), so tall 3D
// elements visibly shake. Scenes are therefore mounted on a separate group that FOLLOWS the anchor:
//   - small pose changes (noise)  -> long time constant, the content stays still;
//   - large pose changes (motion) -> short time constant, the content keeps up with the page.
// Tunable from the URL: ?smooth=0 disables, ?smooth=2 doubles the damping (default 1).
import * as THREE from 'three';

const DEG = Math.PI / 180;

export class PoseSmoother {
  constructor({ strength = 1, holdS = 0.3 } = {}) {
    this.group = new THREE.Group();
    this.group.matrixAutoUpdate = false;
    this.group.visible = false;
    this.strength = strength;
    this.holdS = holdS; // keep the last pose on screen through short tracking drop-outs
    this.source = null;
    this._has = false;
    this._lostFor = 0;
    this._p = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3();
    this._tp = new THREE.Vector3(); this._tq = new THREE.Quaternion(); this._ts = new THREE.Vector3();
  }

  /** Follow this anchor group (or null to stop). Snaps to it on the next visible frame. */
  follow(source) {
    if (source !== this.source) this._has = false;
    this.source = source;
  }

  update(dt) {
    const src = this.source;
    if (!src || !src.visible) {
      this._lostFor += dt;
      if (!src || this._lostFor > this.holdS) { this.group.visible = false; this._has = false; }
      return;
    }
    this._lostFor = 0;
    src.matrix.decompose(this._tp, this._tq, this._ts);
    if (!this._has || this.strength <= 0 || !(dt > 0)) {
      this._p.copy(this._tp); this._q.copy(this._tq); this._s.copy(this._ts);
      this._has = true;
    } else {
      const k = this.strength;
      // rotation: noise is typically well under 1 degree; real motion is several degrees per frame
      const ang = this._q.angleTo(this._tq);
      const tauR = tau(ang, 0.6 * DEG, 5 * DEG, 0.28 * k, 0.045);
      this._q.slerp(this._tq, 1 - Math.exp(-dt / tauR));
      // position: error measured relative to the distance from the camera
      const rel = this._p.distanceTo(this._tp) / Math.max(this._tp.length(), 1e-6);
      const tauP = tau(rel, 0.003, 0.03, 0.16 * k, 0.035);
      this._p.lerp(this._tp, 1 - Math.exp(-dt / tauP));
      this._s.lerp(this._ts, 1 - Math.exp(-dt / 0.1));
    }
    this.group.matrix.compose(this._p, this._q, this._s);
    this.group.matrixWorldNeedsUpdate = true;
    this.group.visible = true;
  }
}

// time constant: slow below e0, fast above e1, smooth in between
function tau(err, e0, e1, slow, fast) {
  const x = Math.min(1, Math.max(0, (err - e0) / (e1 - e0)));
  const s = x * x * (3 - 2 * x);
  return slow + (fast - slow) * s;
}
