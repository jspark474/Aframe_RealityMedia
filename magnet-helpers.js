/* jshint esversion: 9 */
/* global THREE, AFRAME */

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
AFRAME.registerComponent('linear-constraint', {
  schema: {
    axis: {
      type: 'vec3',
      default: {x:0, y:0, z:-1}
    },
    min: {
      default: -Infinity
    },
    max: {
      default: Infinity
    },
    target: {
      type: 'selector'
    },
    part: {
      default: ''
    },
    enabled: {
      default: true
    }
  },
  init() {
    this.tempVec3 = new THREE.Vector3();
    this.n =  new THREE.Vector3();
    this.el.addEventListener('object3dset', this.update.bind(this));
  },
  update () {
    // Ensure the axis is normalized
    this.n.copy(this.data.axis).normalize();
    if (this.data.part) this.part = this.el.object3D.getObjectByName(this.data.part);
  },
  tick() {
    if (!this.data.enabled || !this.data.target) return;
    const object3D = this.data.part ? this.part : this.el.object3D;
    if (!object3D) return;
    if (!this.originalOffset) this.originalOffset = new THREE.Vector3().copy(object3D.position);
    const n = this.n;
    const p0 = this.tempVec3;
    this.data.target.object3D.getWorldPosition(p0);
    object3D.parent.worldToLocal(p0);
    p0.sub(this.originalOffset);
    // We have a plane with normal n that contains p0
    // We want to place the object where a vector n from the origin intersects the plane
    // n.x x + n.y y + n.z z = p0.n
    // Sub in vector equation p=tn
    // t * n.x * n.x + t * n.y * n.y + t * n.z * n.z = p0.n
    // equivalent to  t * n.length() = p0.n
    const t = clamp(p0.dot(n)/n.length() ,this.data.min, this.data.max);
    object3D.position.copy(n).multiplyScalar(t).add(this.originalOffset);
  }
});




AFRAME.registerComponent("attach-to-model", {
  schema: {
    default: ''
  },
  init() {
    this.el.parentNode.addEventListener('object3dset', this.update.bind(this));
  },
  update () {
    if (this.data) this.part = this.el.parentNode.object3D.getObjectByName(this.data);
  },
  tick() {
    if (this.part) {
      const p = this.el.object3D.position;
      this.el.object3D.parent.worldToLocal(this.part.getWorldPosition(p));
    }
  }
});


const tempQuaternion = new THREE.Quaternion();
const tempVector3 = new THREE.Vector3();
AFRAME.registerComponent("grab-magnet-target", {
  schema: {
    startEvents: {
      type: 'array'
    },
    stopEvents: {
      type: 'array'
    }
  },
  init() {
    this.grabStart = this.grabStart.bind(this);
    this.grabEnd = this.grabEnd.bind(this);
    this.isGrabbing = false;
    this.oldParent = null;
    this.grabbedEl = null;
    this.targetEl = null;
    this.oldQuaternion = new THREE.Quaternion();
    this.oldPosition = new THREE.Quaternion();
  },
  update(oldData) {
    if (oldData.startEvents) {
      for (const eventName of oldData.startEvents) {
        this.el.removeEventListener(eventName, this.grabStart);
      }
    }
    if (oldData.stopEvents) {
      for (const eventName of oldData.stopEvents) {
        this.el.removeEventListener(eventName, this.grabEnd);
      }
    }
    for (const eventName of this.data.startEvents) {
      this.el.addEventListener(eventName, this.grabStart);
    }
    for (const eventName of this.data.stopEvents) {
      this.el.addEventListener(eventName, this.grabEnd);
    }
  },
  grabStart(e) {
    const targetId = this.el.dataset.magnetTarget;
    if (this.isGrabbing === false && targetId) {
      const target = document.getElementById(targetId);
      const pickUp = target.dataset.pickUp;
      const el = pickUp === 'parent' ? target.parentNode : target;
      this.isGrabbing = true;
      this.grabbedEl = el;
      this.targetEl = target;
      if (pickUp !== undefined) {
        const oldGrabber = el.dataset.oldGrabber;
        if (oldGrabber) document.getElementById(oldGrabber).components["grab-magnet-target"].grabEnd(e);
        el.dataset.oldGrabber = this.el.id;

        target.dataset.noMagnet = "";
        this.oldParent = el.parentNode;
        this.el.add(el);
        this.oldQuaternion.copy(el.object3D.quaternion);
        el.object3D.quaternion.identity();
        this.oldPosition.copy(el.object3D.position);
        el.object3D.position.set(0,0,0);
        if (pickUp === 'parent') {
          tempQuaternion.copy(target.object3D.quaternion).invert();
          tempVector3.copy(target.object3D.position).applyQuaternion(tempQuaternion);
          el.object3D.applyQuaternion(tempQuaternion);
          el.object3D.position.sub(tempVector3);
        }
      }
      el.emit('grabbed', Object.assign({by: this.el}, e && e.detail));
    }
  },
  grabEnd(e) {
    if (this.isGrabbing) {
      const el = this.grabbedEl;
      if (this.oldParent) {
        delete this.targetEl.dataset.noMagnet;
        delete el.dataset.oldGrabber;
        if (el.dataset.resetTransform !== undefined) {
          el.object3D.quaternion.copy(this.oldQuaternion);
          el.object3D.position.copy(this.oldPosition);
        } else {
          // Keep in place in the new parent
          this.oldParent.object3D.worldToLocal(el.object3D.getWorldPosition(el.object3D.position));

          this.oldParent.object3D.getWorldQuaternion(tempQuaternion).invert();
          el.object3D.getWorldQuaternion(el.object3D.quaternion).premultiply(tempQuaternion);
        }
        this.oldParent.add(el);
        this.oldParent = null;
      }
      this.isGrabbing = false;
      this.grabbedEl = null;
      this.targetEl = null;
      el.emit('released', Object.assign({by: this.el}, e.detail));
    }
  },
  tick () {
    if (this.isGrabbing) {
      if (this.targetEl.dataset.pickUp === undefined && this.el.dataset.magnetTarget !== this.targetEl.id){
        this.grabEnd();
      }
    }
  }
});