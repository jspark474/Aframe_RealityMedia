/* global AFRAME, THREE */

AFRAME.registerComponent('lightmap', {
  schema: {
    type: "map"
  },
  init() {
    this.el.addEventListener('object3dset', this.update.bind(this));
	  this.texture = new THREE.TextureLoader().load( typeof this.data === 'string' ? this.data : this.data.src );
    this.texture.flipY = false;
  },
  update() {
    this.el.object3D.traverse(function (o) {
      if (o.material) {
        o.material.lightMap = this.texture;
      }
    }.bind(this));
  }
});

AFRAME.registerComponent('depthwrite', {
  schema: {
    default: true
  },
  init() {
    this.el.addEventListener('object3dset', this.update.bind(this));
  },
  update() {
    this.el.object3D.traverse(function (o) {
      if (o.material) {
        o.material.depthWrite = this.data;
      }
    }.bind(this));
  }
});

AFRAME.registerComponent('hideparts', {
  schema: {
    default: ""
  },
  init() {
    this.el.addEventListener('object3dset', this.update.bind(this));
  },
  update() {
    const filter = this.data.split(',');
    this.el.object3D.traverse(function (o) {
      if (o.type === 'Mesh' && filter.includes(o.name)) {
        o.visible = false;
      }
    }.bind(this));
  }
});

AFRAME.registerSystem('exposure', {
  init () {
    const renderer = this.el.renderer;
    renderer.physicallyCorrectLights = true;
    renderer.logarithmicDepthBuffer = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.5;
    renderer.shadowMap.enabled = true;
  }
})