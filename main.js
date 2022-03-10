/* jshint esversion: 9 */
/* global THREE, AFRAME */

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
    this.el.addEventListener('object3dset', this.update.bind(this));
  },
  update () {
    if (this.data.part) this.part = this.el.object3D.getObjectByName(this.data.part);
  },
  tick() {
    if (this.part) {
      const p = this.el.object3D.position;
      this.el.object3D.parent.worldToLocal(this.part.getWorldPosition(p));
    }
  }
});

AFRAME.registerComponent("grab-magnet-target", {
  schema: {
    startEvents: {
      type: 'array'
    },
    stopEvents: {
      type: 'array'
    },
  },
  init() {
    this.grabStart = this.grabStart.bind(this);
    this.grabEnd = this.grabEnd.bind(this);
    this.isGrabbing = false;
    this.oldParent = null;
    this.grabbedEl = null;
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
  grabStart() {
    const targetId = this.el.dataset.magnetTarget;
    if (this.isGrabbing === false && targetId) {
      const el = document.getElementById(targetId);
      el.dataset.noMagnet = "";
      this.grabbedEl = el;
      this.oldParent = el.parentNode;
      this.el.add(el);
      this.isGrabbing = true;
      this.oldQuaternion.copy(el.object3D.quaternion);
      el.object3D.quaternion.identity();
      this.oldPosition.copy(el.object3D.position);
      el.object3D.position.set(0,0,0);
      el.emit('grabbed', {by: this});
    }
  },
  grabEnd() {
    if (this.isGrabbing) {
      const el = this.grabbedEl;
      this.oldParent.add(el);
      delete el.dataset.noMagnet;
      el.object3D.quaternion.copy(this.oldQuaternion);
      el.object3D.position.copy(this.oldPosition);
      this.isGrabbing = false;
      el.emit('released', {by: this});
    }
  },
});

window.addEventListener("DOMContentLoaded", function() {
  const sceneEl = document.querySelector("a-scene");
  const message = document.getElementById("dom-overlay-message");
  const arContainerEl = document.getElementById("my-ar-objects");
  const cameraRig = document.getElementById("cameraRig");
  
  const labels = Array.from(document.querySelectorAll('.pose-label'));
  for (const el of labels) {
    el.parentNode.addEventListener('pose', function (event) {
      el.setAttribute('text', 'value', event.detail.pose);
    });
    el.parentNode.addEventListener('gamepad', function (event) {
      el.setAttribute('text', 'value', event.detail.event);
    });
  }
  
  sceneEl.addEventListener('object3dset', function () {
    if (this.components && this.components.reflection) this.components.reflection.needsVREnvironmentUpdate = true;
  });

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