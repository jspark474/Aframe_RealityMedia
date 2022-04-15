/* jshint esversion: 9 */
/* global THREE, AFRAME, Ammo */

AFRAME.registerComponent("hide-on-hit-test-start", {
  init: function() {
    var self = this;
    this.el.sceneEl.addEventListener("ar-hit-test-start", function() {
      self.el.object3D.visible = false;
    });
    this.el.sceneEl.addEventListener("exit-vr", function() {
      self.el.object3D.visible = true;
    });
  }
});

AFRAME.registerComponent("origin-on-ar-start", {
  init: function() {
    var self = this.el;

    this.el.sceneEl.addEventListener("enter-vr", function() {
      if (this.is("ar-mode")) {
        self.setAttribute('position', {x:0,y:0,z:0});
        self.setAttribute('rotation', {x:0,y:0,z:0});
      }
    });
  }
});

AFRAME.registerComponent("xr-follow", {
  schema: {},
  init() {
  },
  tick() {
    const scene = this.el.sceneEl;
    const cameraObject = scene.camera;
    const camera = scene.is('vr-mode') ? scene.renderer.xr.getCamera(cameraObject) : cameraObject;
    const object3D = this.el.object3D;
    camera.getWorldPosition(object3D.position);
    object3D.parent.worldToLocal(object3D.position);
  }
});

AFRAME.registerComponent("match-position-by-id", {
  schema: {
    default: ''
  },
  tick() {
    let obj;
    
    if (this.data === 'xr-camera') {
      const xrCamera = this.el.sceneEl.renderer.xr.getCameraPose();
      if (xrCamera) {
        this.el.object3D.position.copy(xrCamera.transform.position);
        this.el.object3D.quaternion.copy(xrCamera.transform.orientation);
        return;
      }
      obj = this.el.sceneEl.camera;
    } else {
      obj = document.getElementById(this.data).object3D;
    }
    if (obj) {
      this.el.object3D.position.copy(obj.position);
      this.el.object3D.quaternion.copy(obj.quaternion);
    }

  }
});

bodyBits:
{
  const tempVector3 = new THREE.Vector3();
  const tempQuaternionA = new THREE.Quaternion();
  const tempQuaternionB = new THREE.Quaternion();
  const zAxis = new THREE.Vector3(0,0,1);
  AFRAME.registerComponent("torso", {
    schema: {
      head: {
        default: ''
      },
      offset: {
        type: 'vec3',
        default: "0 0.2 0"
      }
    },  
    update() {
      this.head = document.querySelector(this.data.head);
      if (this.head) this.head = this.head.object3D;
    },
    tick() {
      if (this.head) {
        const $o = this.el.object3D;
        this.head.getWorldPosition($o.position);
        $o.position.sub(this.data.offset);
        $o.parent.worldToLocal($o.position);
        $o.parent.getWorldQuaternion(tempQuaternionB).invert();
        this.head.getWorldQuaternion(tempQuaternionA).premultiply(tempQuaternionB);
        
        tempVector3.copy(zAxis);
        tempVector3.applyQuaternion(tempQuaternionA);
        tempVector3.y=0;
        tempVector3.normalize();
        
        $o.quaternion.setFromUnitVectors(tempVector3, zAxis);
      }
    }
  });

  AFRAME.registerComponent('control-part', {
    schema: {
      default: ''
    },
    tick() {
      if (!this.data) return;
      this.part = this.part || this.el.parentNode.object3D.getObjectByName(this.data);
      if (!this.part) return;

      const p = this.part;
      const pp = p.parent;
      const o = this.el.object3D;
      pp.getWorldQuaternion(tempQuaternionA).invert();
      o.getWorldQuaternion(p.quaternion).premultiply(tempQuaternionB);
      o.getWorldPosition(p.position);
      pp.worldToLocal(p.position);
      this.part.scale.copy(o.scale);
    }
  });
  
  const tempVectorShoulderPos = new THREE.Vector3();
  const tempVectorHandPos = new THREE.Vector3();
  const c0 = new THREE.Vector3();
  AFRAME.registerComponent("elbow", {
    schema: {
      shoulder: {
        default: ''
      },
      hand: {
        default: ''
      },
      foreArmLength: {
        default: 0.3
      },
      upperArmLength: {
        default: 0.3
      }
    },  
    update() {
      this.hand = document.querySelector(this.data.hand);
      if (this.hand) this.hand = this.hand.object3D;
      this.shoulder = document.querySelector(this.data.shoulder);
      if (this.shoulder) this.shoulder = this.shoulder.object3D;
    },
    tick(time,delta) {
      if (this.shoulder && this.hand) {
        const $o = this.el.object3D;
        
        // add a little gravity
        $o.position.y -= 0.1 * 9.8 * delta/1000;
        
        // Local hand position
        this.hand.getWorldPosition(tempVectorHandPos);
        $o.parent.worldToLocal(tempVectorHandPos);
        
        // Local Shoulder position
        this.shoulder.getWorldPosition(tempVectorShoulderPos);
        $o.parent.worldToLocal(tempVectorShoulderPos);
        
        const r1 = this.data.upperArmLength;
        const r2 = this.data.foreArmLength;
        
        const d=tempVector3.subVectors(tempVectorShoulderPos,tempVectorHandPos).length();
        
        // if arm is stretched longer than bones then elbow is placed proportionally
        if (d >= r1 + r2) {
          $o.position.lerpVectors(tempVectorShoulderPos,tempVectorHandPos,r1/(r1+r2));
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
        const normal = tempVector3.subVectors(tempVectorHandPos, tempVectorShoulderPos).normalize();
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
        
        const t = normal.dot(tempVector3.copy($o.position).sub(c0));
        
        // move elbow inline with elbow plane and place it on the circle
        $o.position.addScaledVector(normal, t).sub(c0).setLength(r).add(c0);
      }
    }
  });
}

AFRAME.registerComponent("exit-on", {
  schema: {
    default: 'click'
  },
  update(oldEvent) {
    const newEvent = this.data;
    this.el.removeEventListener(oldEvent, this.exitVR);
    this.el.addEventListener(newEvent, this.exitVR);
  },
  exitVR() {
    this.sceneEl.exitVR();
  }
});

AFRAME.registerComponent("ammo-shape-from-model", {
  schema: {
    type: 'string',
    default: ''
  },
  init () {
    const details = this.data;
    this.onLoad = function () {
      this.setAttribute('ammo-shape', details);
      this.removeAttribute('ammo-shape-from-model');
    }
    this.el.addEventListener('object3dset', this.onLoad);
  },
  remove () {
    this.el.removeEventListener('object3dset', this.onLoad);
  }
});


AFRAME.registerComponent("ammo-body-from-model", {
  schema: {
    type: 'string',
    default: ''
  },
  init () {
    const details = this.data;
    this.onLoad = function () {
      this.setAttribute('ammo-body', details);
      this.removeAttribute('ammo-body-from-model');
    }
    this.el.addEventListener('object3dset', this.onLoad);
  },
  remove () {
    this.el.removeEventListener('object3dset', this.onLoad);
  }
});


AFRAME.registerComponent("toggle-physics", {
  init () {
    this.onPickup = function () { this.el.setAttribute('ammo-body', 'type', 'kinematic'); }.bind(this);
    this.onPutDown = function (e) {
      const referenceSpace = this.el.sceneEl.renderer.xr.getReferenceSpace();
      this.el.setAttribute('ammo-body', 'type', 'dynamic');
      if (e.detail.frame && e.detail.inputSource) {
        const pose = e.detail.frame.getPose(e.detail.inputSource.gripSpace, referenceSpace);
        if (pose && pose.angularVelocity) {
          const velocity = new Ammo.btVector3(pose.angularVelocity.x,pose.angularVelocity.y,pose.angularVelocity.z);
          this.el.body.setAngularVelocity(velocity);
          Ammo.destroy(velocity);
        }
        if (pose && pose.linearVelocity) {
          const velocity = new Ammo.btVector3(pose.linearVelocity.x,pose.linearVelocity.y,pose.linearVelocity.z);
          this.el.body.setLinearVelocity(velocity);
          Ammo.destroy(velocity);
        }
      }
    }.bind(this);
    this.el.addEventListener('pickup', this.onPickup);
    this.el.addEventListener('putdown', this.onPutDown);
  },
  remove () {
    this.el.removeEventListener('pickup', this.onPickup);
    this.el.removeEventListener('putdown', this.onPutDown);
  }
});

AFRAME.registerComponent("ladder", {
  schema: {
    cameraRig: {
      default: ''
    },
    grabbables: {
      default: ''
    }
  },
  init () {
    this.ladderGrab = this.ladderGrab.bind(this);
    this.ladderRelease = this.ladderRelease.bind(this);
    this.startingRigPosition = new THREE.Vector3();
    this.startingHandPosition = new THREE.Vector3();
    this.ladderHands = [];
    this.grabbables = [];
    this.cameraRig = document.querySelector(this.data.cameraRig);
    if (this.data.grabbables) for (const el of this.el.querySelectorAll(this.data.grabbables)) {
      this.grabbables.push(el);
      el.addEventListener('grabbed', this.ladderGrab);
      el.addEventListener('released', this.ladderRelease);
    }
  },
  ladderRelease(e) {
    const oldActiveHand = e.detail.byNoMagnet;
    let index;
    while ((index=this.ladderHands.indexOf(oldActiveHand))!==-1) this.ladderHands.splice(index,1);
    
    const activeHand = this.ladderHands[0];
    if (activeHand) {
      this.startingHandPosition.copy(activeHand.object3D.position);
      this.startingRigPosition.copy(this.cameraRig.object3D.position);
    }
  },
  ladderGrab(e) {
    const activeHand = e.detail.byNoMagnet;
    this.startingHandPosition.copy(activeHand.object3D.position);
    this.startingRigPosition.copy(this.cameraRig.object3D.position);
    this.ladderHands.unshift(activeHand);
    this.holdingLadder = true;
  },
  tick () {
    const activeHand = this.ladderHands[0];
    if (activeHand) {
      this.cameraRig.object3D.position.subVectors(this.startingHandPosition, activeHand.object3D.position);
      this.cameraRig.object3D.position.applyQuaternion(this.cameraRig.object3D.quaternion);
      this.cameraRig.object3D.position.add(this.startingRigPosition);
    }
  },
  remove () {
    this.grabbables.forEach(el => {
      el.removeEventListener('grabbed', this.ladderGrab);
      el.removeEventListener('released', this.ladderRelease);
    });
  }
});

window.addEventListener("DOMContentLoaded", function() {
  const sceneEl = document.querySelector("a-scene");
  const message = document.getElementById("dom-overlay-message");
  const arContainerEl = document.getElementById("my-ar-objects");
  const cameraRig = document.getElementById("cameraRig");
  const building = document.getElementById("building");
  
  building.addEventListener('object3dset', function () {
    if (this.components && this.components.reflection) this.components.reflection.needsVREnvironmentUpdate = true;
  }, {once: true});
  
  const labels = Array.from(document.querySelectorAll('.pose-label'));
  for (const el of labels) {
    el.parentNode.addEventListener('pose', function (event) {
      el.setAttribute('text', 'value', event.detail.pose);
    });
    el.parentNode.addEventListener('gamepad', function (event) {
      el.setAttribute('text', 'value', event.detail.event);
    });
  }
  
  watergun: {
    const watergun = document.getElementById("watergun");
    const watergunSlider = watergun.firstElementChild;
    watergun.addEventListener('grabbed', function (e) {
      const by = e.detail.by;
      if (e.target === watergun) {
        watergun.className = '';
        if (by.dataset.right) watergunSlider.className = 'magnet-left';
        if (by.dataset.left) watergunSlider.className = 'magnet-right';
      }
      if (e.target === watergunSlider) {
        watergun.setAttribute('linear-constraint', 'target', '#' + e.detail.byNoMagnet.id);
      }
    });
    watergun.addEventListener('released', function (e) {
      const by = e.detail.by;
      watergun.setAttribute('linear-constraint', 'target', '');
      if (e.target === watergun) {
        watergun.className = 'magnet-right magnet-left';
        watergunSlider.className = '';
      }
    });
  }

  // If the user taps on any buttons or interactive elements we may add then prevent
  // Any WebXR select events from firing
  message.addEventListener("beforexrselect", e => {
    e.preventDefault();
  });

  sceneEl.addEventListener("enter-vr", function() {
    if (this.is("ar-mode")) {
      // Entered AR
      message.textContent = "";

      // Hit testing is available
      this.addEventListener(
        "ar-hit-test-start",
        function() {
          message.innerHTML = `Scanning environment, finding surface.`;
        },
        { once: true }
      );

      // Has managed to start doing hit testing
      this.addEventListener(
        "ar-hit-test-achieved",
        function() {
          message.innerHTML = `Select the location to place<br />By tapping on the screen or selecting with your controller.`;
        },
        { once: true }
      );

      // User has placed an object
      this.addEventListener(
        "ar-hit-test-select",
        function() {
          // Object placed for the first time
          message.textContent = "Well done!";
        },
        { once: true }
      );
    }
  });

  sceneEl.addEventListener("exit-vr", function() {
    message.textContent = "Exited Immersive Mode";
  });
});

AFRAME.registerComponent('window-replace', {
  schema: {
    default: ''
  },
  init() {
    this.el.addEventListener('object3dset', this.update.bind(this));
    this.materials = new Map();
  },
  update() {
    const filters = this.data.trim().split(',');
    this.el.object3D.traverse(function (o) {
      if (o.material) {
        if (filters.some(filter => o.material.name.includes(filter))) {
          o.renderOrder = 1;
          const m = o.material;
          const sceneEl = this.el.sceneEl;
          o.material = this.materials.has(m) ?
            this.materials.get(m) :
            new THREE.MeshPhongMaterial({
              name: 'window_' + m.name,
              lightMap: m.lightmap || null,
              lightMapIntensity: m.lightMapIntensity,
              shininess: 90,
              color: '#ffffff',
              emissive: '#999999',
              emissiveMap: m.map,
              transparent: true,
              depthWrite: false,
              map: m.map,
              transparent: true,
              side: THREE.DoubleSide,
              get envMap() {return sceneEl.object3D.environment},
              combine: THREE.MixOperation,
              reflectivity: 0.6,
              blending: THREE.CustomBlending,
              blendEquation: THREE.MaxEquation,
              toneMapped: m.toneMapped
            });
          ;
          window.mat = o.material;
          this.materials.set(m, o.material);
        }
      }
    }.bind(this));
  }
});