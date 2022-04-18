/* jshint esversion: 9 */
/* global THREE, AFRAME, Ammo */

avatarStuff:
{
  const tempVector3 = new THREE.Vector3();
  const tempQuaternionA = new THREE.Quaternion();
  const tempQuaternionB = new THREE.Quaternion();
  const zAxis = new THREE.Vector3(0,0,1);
  const yAxis = new THREE.Vector3(0,1,0);
  const tempVectorShoulderPos = new THREE.Vector3();
  const tempVectorHandPos = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const c0 = new THREE.Vector3();

  AFRAME.registerComponent("torso", {
    schema: {
      head: {
        default: ''
      },
      torso: {
        default: ''
      }
    },  
    update() {
      this.head = null;
      this.torso = null;
      this.offset = null;
    },
    tick() {
      if (!this.head && this.data.head) {
        if (this.data.head.indexOf('part__') === 0) {
          const partName = this.data.head.slice(6);
          this.head = this.el.object3D.getObjectByName(partName);
        } else {
          this.head = document.querySelector(this.data.head);
          if (this.head) this.head = this.head.object3D;
        }
      }
      if (!this.torso) {
        if (this.data.torso) {
          if (this.data.torso.indexOf('part__') === 0) {
            const partName = this.data.torso.slice(6);
            this.torso = this.el.object3D.getObjectByName(partName);
          } else {
            this.torso = document.querySelector(this.data.torso);
            if (this.torso) this.torso = this.torso.object3D;
          }
        } else {
          this.torso = this.el.object3D;
        }
      }
      if (this.head && this.torso) {
        if (!this.offset) {
          this.offset = new THREE.Vector3();
          this.offset.subVectors(this.head.position, this.torso.position);
        }

        this.head.getWorldPosition(this.torso.position);
        this.torso.position.sub(this.offset);
        this.torso.parent.worldToLocal(this.torso.position);

        tempVector3.copy(zAxis).applyQuaternion(this.head.quaternion);
        tempVector3.y=0;
        this.torso.quaternion.setFromUnitVectors(zAxis, tempVector3);
      }
    }
  });
  
  function pointBoneAt(boneToPoint, globalPosition) {
    
  }
  
  
  AFRAME.registerComponent("elbow", {
    multiple: true,
    schema: {
      shoulder: {
        default: ''
      },
      hand: {
        default: ''
      },
      elbow: {
        default: ''
      },
      foreArmLength: {
        default: 0.3
      },
      upperArmLength: {
        default: 0.3
      },
      bias: {
        type: 'vec3',
        default: new THREE.Vector3(0, -0.1, 0)
      }
    },  
    update() {
      this.hand = null;
      this.shoulder = null;
      this.elbow = null;
    },
    tick(time,delta) {
      if (!this.hand && this.data.hand) {
        if (this.data.hand.indexOf('part__') === 0) {
          const partName = this.data.hand.slice(6);
          this.hand = this.el.object3D.getObjectByName(partName);
        } else {
          this.hand = document.querySelector(this.data.hand);
          if (this.hand) this.hand = this.hand.object3D;
        }
      }
      if (!this.shoulder && this.data.shoulder) {
        if (this.data.shoulder.indexOf('part__') === 0) {
          const partName = this.data.shoulder.slice(6);
          this.shoulder = this.el.object3D.getObjectByName(partName);
        } else {
          this.shoulder = document.querySelector(this.data.shoulder);
          if (this.shoulder) this.shoulder = this.shoulder.object3D;
        }
      }
      if (!this.elbow && this.data.elbow) {
        if (this.data.elbow.indexOf('part__') === 0) {
          const partName = this.data.elbow.slice(6);
          this.elbow = this.el.object3D.getObjectByName(partName);
        } else {
          this.elbow = document.querySelector(this.data.elbow);
          if (this.elbow) this.elbow = this.elbow.object3D;
        }
      }


      if (this.shoulder && this.hand && this.elbow) {
        // add a little gravity
        this.elbow.position.addScaledVector(this.data.bias, 9.8 * delta/1000);

        // Local hand position
        this.hand.getWorldPosition(tempVectorHandPos);
        this.elbow.parent.worldToLocal(tempVectorHandPos);

        // Local Shoulder position
        this.shoulder.getWorldPosition(tempVectorShoulderPos);
        this.elbow.parent.worldToLocal(tempVectorShoulderPos);

        const r1 = this.data.upperArmLength;
        const r2 = this.data.foreArmLength;

        const d=tempVector3.subVectors(tempVectorShoulderPos,tempVectorHandPos).length();

        // if arm is stretched longer than bones then elbow is placed proportionally
        if (d >= r1 + r2) {
          this.elbow.position.lerpVectors(tempVectorShoulderPos,tempVectorHandPos,r1/(r1+r2));
          this.shoulder.quaternion.setFromUnitVectors(yAxis, tempVector3.subVectors(this.elbow.position, tempVectorShoulderPos).normalize());
          this.elbow.quaternion.setFromUnitVectors(yAxis, tempVector3.subVectors(tempVectorHandPos, this.elbow.position).normalize());
          return
        }

        // One bone sphere is inside the other, i.e. hand is placed on shoulder
        // and one bone is smaller than the other and do not intersect
        if (Math.max(r1,r2) >= (d + Math.min(r1,r2))) {
          // this weird so do nothing
          return
        }

        // The usual situation the two spheres intersesct so find the circle at the intersection point.
        const d1 = 0.5*(d+(r1*r1-r2*r2)/d);
        normal.subVectors(tempVectorHandPos, tempVectorShoulderPos).normalize();
        const r = Math.sqrt(r1*r1-d1*d1);

        // The intersection of the spheres form a circle radius r
        // with center c0
        c0.copy(tempVectorShoulderPos).addScaledVector(normal, d1);

        // We have a plane with normal that contains c0
        // We want to place the object where a vector n from the objects original position (p0) intersects the plane
        // n dot p = c0.n
        // Sub in vector equation p=tn + p0
        // t n.n + p0.n = c0.n
        // t = n.p0 - n.c0 / (n.n)
        // p[new] = p0 + t n

        const t = normal.dot(tempVector3.copy(c0).sub(this.elbow.position));

        // move elbow inline with elbow plane and place it on the circle
        this.elbow.position.addScaledVector(normal, t).sub(c0).setLength(r).add(c0);

        this.shoulder.quaternion.setFromUnitVectors(yAxis, tempVector3.subVectors(this.elbow.position, tempVectorShoulderPos).normalize());
        this.elbow.quaternion.setFromUnitVectors(yAxis, tempVector3.subVectors(tempVectorHandPos, this.elbow.position).normalize());
      }
    }
  });

  AFRAME.registerComponent('control-part', {
    schema: {
      part: {
        default: ''
      },
      levels: {
        default:1
      },
      yAxis: {
        default: false
      }
    },
    tick() {
      if (!this.data.part) return;
      if (!this.part) {
        let parent = this.el;
        for (let i=0;i<this.data.levels;i++) parent = parent.parentNode;
        this.part = parent.object3D.getObjectByName(this.data.part);
      }
      if (!this.part) return;

      const p = this.part;
      const pp = p.parent;
      const o = this.el.object3D;
      pp.getWorldQuaternion(tempQuaternionA).invert();
      o.getWorldQuaternion(p.quaternion).premultiply(tempQuaternionA);

      if (this.data.yAxis) {
        tempVector3.set(0,1,0).applyQuaternion(o.quaternion);
        o.quaternion.setFromUnitVectors(tempVector3, zAxis);
      }

      o.getWorldPosition(p.position);
      pp.worldToLocal(p.position);
      this.part.scale.copy(o.scale);
    }
  });
}