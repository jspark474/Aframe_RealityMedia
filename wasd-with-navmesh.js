/* global AFRAME, THREE */


/**
 * Ensure that the navmesh physics is added before the controls
 */
AFRAME.registerComponent('navmesh-controls', {
  schema: {
    default: ''
  },
  init: function () {
    this.el.removeAttribute('wasm-controls');
    this.el.setAttribute('wasm-controls');
    this.el.setAttribute('navmesh-physics', this.data);
  }
});

/**
 * This needs to run after the movement controls
 */
AFRAME.registerComponent('navmesh-physics', {
  schema: {
    type: 'selectorAll'
  },

  init: function () {
    this.lastPosition = new THREE.Vector3();
    this.lastPosition.copy(this.el.object3D.position);
  },

  tick: (function () {
    console.log('tick');
    
    var nextPosition = new THREE.Vector3();
    var down = new THREE.Vector3(0,-1,0);
    var raycaster = new THREE.Raycaster();
    var gravity = -1;
    var maxYVelocity = 0.5;
    var yVel = 0;
    
    return function (time, delta) {
      var el = this.el;
      if (!this.data) return;

      // Get movement vector and translate position.
      nextPosition.copy(this.lastPosition);
      nextPosition.y += maxYVelocity;
      raycaster.set (nextPosition, down);
      var intersects = raycaster.intersectObjects( this.data.map(el => el.object3D) );
      if (intersects.length) {
        if (el.object3D.position.y - (intersects[0].point.y - yVel*2) > 0.01) {
          yVel += Math.max(gravity * delta, -maxYVelocity);
          intersects[0].point.y = el.object3D.position.y + yVel;
          el.object3D.position.copy(intersects[0].point);
        } else {
          el.object3D.position.copy(intersects[0].point);
          yVel = 0;
        }
      }
    }
  }()),
  
  tock () {
    this.lastPosition.copy(this.el.object3D.position);
  }
});