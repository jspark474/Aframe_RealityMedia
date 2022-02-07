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
AFRAME.registerComponent('wasd-navmesh', {
  schema: {
    acceleration: {default: 65},
    adAxis: {default: 'x', oneOf: ['x', 'y', 'z']},
    adEnabled: {default: true},
    adInverted: {default: false},
    enabled: {default: true},
    navmesh: {type: 'selectorAll'},
    fly: {default: false},
    wsAxis: {default: 'z', oneOf: ['x', 'y', 'z']},
    wsEnabled: {default: true},
    wsInverted: {default: false}
  },

  init: function () {
    // To keep track of the pressed keys.
    this.keys = {};
    this.easing = 1.1;

    this.velocity = new THREE.Vector3();

    // Bind methods and add event listeners.
    this.onBlur = bind(this.onBlur, this);
    this.onContextMenu = bind(this.onContextMenu, this);
    this.onFocus = bind(this.onFocus, this);
    this.onKeyDown = bind(this.onKeyDown, this);
    this.onKeyUp = bind(this.onKeyUp, this);
    this.onVisibilityChange = bind(this.onVisibilityChange, this);
    this.attachVisibilityEventListeners();
  },

  tick: (function () {
    var nextPosition = new THREE.Vector3();
    var down = new THREE.Vector3(0,-1,0);
    var raycaster = new THREE.Raycaster();
    var gravity = -1;
    var maxYVelocity = 0.5;
    var yVel = 0;
    
    return function (time, delta) {
      var data = this.data;
      var el = this.el;
      var velocity = this.velocity;

      if (!velocity[data.adAxis] && !velocity[data.wsAxis] &&
          isEmptyObject(this.keys)) { return; }

      // Update velocity.
      delta = delta / 1000;
      this.updateVelocity(delta);

      if (!velocity[data.adAxis] && !velocity[data.wsAxis]) { return; }

      // Get movement vector and translate position.
      el.object3D.getWorldPosition(nextPosition); 
      nextPosition.add(this.getMovementVector(delta));
      nextPosition.y += maxYVelocity;
      raycaster.set (nextPosition, down);
      var intersects = raycaster.intersectObjects( this.data.navmesh.map(el => el.object3D) );
      if (intersects.length) {
        if (el.object3D.position.y > intersects[0].point.y - yVel*2) {
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

  remove: function () {
    this.removeKeyEventListeners();
    this.removeVisibilityEventListeners();
  },

  play: function () {
    this.attachKeyEventListeners();
  },

  pause: function () {
    this.keys = {};
    this.removeKeyEventListeners();
  },

  updateVelocity: function (delta) {
    var acceleration;
    var adAxis;
    var adSign;
    var data = this.data;
    var keys = this.keys;
    var velocity = this.velocity;
    var wsAxis;
    var wsSign;

    adAxis = data.adAxis;
    wsAxis = data.wsAxis;

    // If FPS too low, reset velocity.
    if (delta > MAX_DELTA) {
      velocity[adAxis] = 0;
      velocity[wsAxis] = 0;
      return;
    }

    // https://gamedev.stackexchange.com/questions/151383/frame-rate-independant-movement-with-acceleration
    var scaledEasing = Math.pow(1 / this.easing, delta * 60);
    // Velocity Easing.
    if (velocity[adAxis] !== 0) {
      velocity[adAxis] = velocity[adAxis] * scaledEasing;
    }
    if (velocity[wsAxis] !== 0) {
      velocity[wsAxis] = velocity[wsAxis] * scaledEasing;
    }

    // Clamp velocity easing.
    if (Math.abs(velocity[adAxis]) < CLAMP_VELOCITY) { velocity[adAxis] = 0; }
    if (Math.abs(velocity[wsAxis]) < CLAMP_VELOCITY) { velocity[wsAxis] = 0; }

    if (!data.enabled) { return; }

    // Update velocity using keys pressed.
    acceleration = data.acceleration;
    if (data.adEnabled) {
      adSign = data.adInverted ? -1 : 1;
      if (keys.KeyA || keys.ArrowLeft) { velocity[adAxis] -= adSign * acceleration * delta; }
      if (keys.KeyD || keys.ArrowRight) { velocity[adAxis] += adSign * acceleration * delta; }
    }
    if (data.wsEnabled) {
      wsSign = data.wsInverted ? -1 : 1;
      if (keys.KeyW || keys.ArrowUp) { velocity[wsAxis] -= wsSign * acceleration * delta; }
      if (keys.KeyS || keys.ArrowDown) { velocity[wsAxis] += wsSign * acceleration * delta; }
    }
  },

  getMovementVector: (function () {
    var directionVector = new THREE.Vector3(0, 0, 0);
    var rotationEuler = new THREE.Euler(0, 0, 0, 'YXZ');

    return function (delta) {
      var rotation = this.el.getAttribute('rotation');
      var velocity = this.velocity;
      var xRotation;

      directionVector.copy(velocity);
      directionVector.multiplyScalar(delta);

      // Absolute.
      if (!rotation) { return directionVector; }

      xRotation = this.data.fly ? rotation.x : 0;

      // Transform direction relative to heading.
      rotationEuler.set(THREE.Math.degToRad(xRotation), THREE.Math.degToRad(rotation.y), 0);
      directionVector.applyEuler(rotationEuler);
      return directionVector;
    };
  })(),

  attachVisibilityEventListeners: function () {
    window.oncontextmenu = this.onContextMenu;
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('focus', this.onFocus);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  },

  removeVisibilityEventListeners: function () {
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('focus', this.onFocus);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  },

  attachKeyEventListeners: function () {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  },

  removeKeyEventListeners: function () {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  },

  onContextMenu: function () {
    var keys = Object.keys(this.keys);
    for (var i = 0; i < keys.length; i++) {
      delete this.keys[keys[i]];
    }
  },

  onBlur: function () {
    this.pause();
  },

  onFocus: function () {
    this.play();
  },

  onVisibilityChange: function () {
    if (document.hidden) {
      this.onBlur();
    } else {
      this.onFocus();
    }
  },

  onKeyDown: function (event) {
    var code;
    if (!shouldCaptureKeyEvent(event)) { return; }
    code = event.code || KEYCODE_TO_CODE[event.keyCode];
    if (KEYS.indexOf(code) !== -1) { this.keys[code] = true; }
  },

  onKeyUp: function (event) {
    var code;
    code = event.code || KEYCODE_TO_CODE[event.keyCode];
    delete this.keys[code];
  }
});

function isEmptyObject (keys) {
  var key;
  for (key in keys) { return false; }
  return true;
}