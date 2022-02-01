/* global AFRAME, THREE */

AFRAME.registerComponent('lightmap', {
  schema: {
    src: {
      type: "map"
    },
    intensity: {
      default: 1
    },
    filter: {
      default: ''
    },
    color: {
      type: "color",
      default: '#888888'
    }
  },
  init() {
    this.el.addEventListener('object3dset', this.update.bind(this));
	  this.texture = new THREE.TextureLoader().load( typeof this.data.src === 'string' ? this.data.src : this.data.src.src );
    this.texture.flipY = false;
  },
  update() {
    const filter = this.data.filter.trim();
    this.el.object3D.traverse(function (o) {
      if (o.material) {
        // o.material.lightMap = this.texture;
        // o.material.lightMapIntensity = this.data.intensity;
        if (o.name.includes(filter)) {
          const m = o.material;
          o.material = new THREE.MeshPhongMaterial({
            lightMap: this.texture,
            lightMapIntensity: this.data.intensity,
            color: this.data.color,
            map: m.map,
            transparent: m.transparent
          });
        }
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