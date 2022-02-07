/* global AFRAME, THREE */
var KEYCODE_TO_CODE = {
  // Tiny KeyboardEvent.code polyfill.
  KEYCODE_TO_CODE: {
    '38': 'ArrowUp',
    '37': 'ArrowLeft',
    '40': 'ArrowDown',
    '39': 'ArrowRight',
    '87': 'KeyW',
    '65': 'KeyA',
    '83': 'KeyS',
    '68': 'KeyD'
  }
};
var utils = AFRAME.utils;

var bind = utils.bind;
var shouldCaptureKeyEvent = utils.shouldCaptureKeyEvent;

var CLAMP_VELOCITY = 0.00001;
var MAX_DELTA = 0.2;
var KEYS = [
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'
];

/**
 * WASD component to control entities using WASD keys.
 */
AFRAME.registerComponent('navmesh-controls', {
  schema: {
    type: 'selectorAll'
  },

  init: function () {
    
  },

  tick: (function () {
    var nextPosition = new THREE.Vector3();
    var down = new THREE.Vector3(0,-1,0);
    var raycaster = new THREE.Raycaster();
    var gravity = -1;
    var maxYVelocity = 0.5;
    var yVel = 0;
    
    return function (time, delta) {
      var el = this.el;

      // Get movement vector and translate position.
      el.object3D.getWorldPosition(nextPosition); 
      nextPosition.add(this.getMovementVector(delta));
      nextPosition.y += maxYVelocity;
      raycaster.set (nextPosition, down);
      var intersects = raycaster.intersectObjects( this.data.navmesh.map(el => el.object3D) );
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
  }())
});