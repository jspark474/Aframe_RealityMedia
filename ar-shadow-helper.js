/* global AFRAME, THREE */

const bbox = this.bbox = new THREE.Box3();
const normal = new THREE.Vector3();
const cameraWorldPosition = new THREE.Vector3();
const tempMat = new THREE.Matrix4();
const sphere = new THREE.Sphere();

AFRAME.registerGeometry('shadow-plane', {
  schema: {
    width: { default: 1, min: 0 },
    height: { default: 1, min: 0 }
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
    light: {
      type: 'selector',
      default: 'a-light'
    },
    startVisibleInAR: {
      default: false
    },
    border: {
      default: 0.25
    }
  },
  init: function () {
    var self = this;

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
    if (this.data.light) {
      const light = this.data.light;
      const shadow = light.components.light.light.shadow;
    
      if (shadow) {
        const camera = shadow.camera;
        camera.getWorldDirection(normal);   
        
        const projectionOfCameraDirectionOnPlane = 
        
        bbox.setFromObject(this.el.object3D);
        bbox.getBoundingSphere(sphere);
        camera.getWorldPosition(cameraWorldPosition);
        const pointOnCameraPlane = nearestPointInPlane(cameraWorldPosition, normal, sphere.center, normal);
        tempMat.copy(camera.matrixWorld);
        tempMat.invert();
        const pointInXYPlane = pointOnCameraPlane.applyMatrix4(tempMat);
        camera.left    = -sphere.radius + pointInXYPlane.x;
        camera.right   =  sphere.radius + pointInXYPlane.x;
        camera.top     =  sphere.radius + pointInXYPlane.y;
        camera.bottom  = -sphere.radius + pointInXYPlane.y;
        camera.updateProjectionMatrix();
      }
    }
  },
  tick: function () {
    const border = this.data.border;
    this.el.object3D.scale.set(1,1,1).multiplyScalar(sphere.radius * (1 + border * 2));
    if (this.data.target) {
      bbox.setFromObject(this.data.target.object3D);
      bbox.getSize(this.el.object3D.scale);
      this.el.object3D.scale.multiplyScalar(2);
      this.el.object3D.position.copy(this.data.target.object3D.position);
      this.el.object3D.quaternion.copy(this.data.target.object3D.quaternion);
      this.updateShadowCam();
    }
  }
});
