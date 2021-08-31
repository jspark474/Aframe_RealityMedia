/* global AFRAME, THREE */

const bbox = this.bbox = new THREE.Box3();
const tempVector = new THREE.Vector3();
const tempPosition = new THREE.Vector3();
const tempMat = new THREE.Matrix4();

AFRAME.registerGeometry('shadow-plane', {
  schema: {
    width: { default: 5, min: 0 },
    height: { default: 5, min: 0 }
  },

  init: function (data) {
    this.geometry = new THREE.PlaneGeometry(data.width, data.height);
    this.geometry.rotateX(-Math.PI / 2);
  }
});

function nearestPointInPlane(position, normal, p1, out) {
	const d = normal.dot(position);

	// distance of point from plane
	const t = (d - normal.dot(p1))/normal.length();

	// closest point on the plane
	out.copy(normal);
	out.multiplyScalar(t);
	out.add(p1);
	return out;
}

/**
Component to hide the shadow whilst the user is using ar-hit-test because they tend to interact poorly
*/
AFRAME.registerComponent('ar-shadow-helper', {
  schema: {
    target: {
      type: 'selector',
    },
    lights: {
      type: 'selectorAll',
      default: 'a-light'
    },
    startVisibleInAR: {
      default: false
    }
  },
  init: function () {
    var self = this;
    this.el.object3D.visible = false;

    this.el.sceneEl.addEventListener('enter-vr', function () {
      if (self.el.sceneEl.is('ar-mode')) {
        self.el.object3D.visible = self.data.startVisibleInAR;
      }
    });
    this.el.sceneEl.addEventListener('exit-vr', function () {
      self.el.object3D.visible = false;
    });

    this.el.sceneEl.addEventListener('ar-hit-test-select-start', function () {
      self.el.object3D.visible = false;
    });

    this.el.sceneEl.addEventListener('ar-hit-test-select', function () {
      self.el.object3D.visible = true;
    });
  },
  updateShadowCam() {
    bbox.setFromObject(this.el.object3D);
    const lights = Array.from(this.data.lights);
    for (const light of lights) {
      const shadow = light.components.light.light.shadow;
      if (shadow) {
        const camera = shadow.camera;
			  const normal = tempVector.set(0,0,1).applyQuaternion(camera.quaternion);
        bbox.getCenter(tempPosition);
        const pointOnCameraPlane = nearestPointInPlane(camera.position, normal, tempPosition, tempVector);
        tempMat.copy(camera.matrixWorld);
        tempMat.invert();
        const pointInPlane = pointOnCameraPlane.applyMatrix4(tempMat);
        console.log(pointInPlane);
      }
    }
  },
  tick: function () {
    this.updateShadowCam();
    if (this.data.target) {
      this.el.object3D.position.copy(this.data.target.object3D.position);
      this.el.object3D.quaternion.copy(this.data.target.object3D.quaternion);
    }
  }
});
