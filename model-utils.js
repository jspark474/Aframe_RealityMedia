/* global AFRAME, THREE */
import { KTX2Loader } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/loaders/KTX2Loader.js";

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
    basis: {
      default: false
    }
  },
  init() {
    
    const src = typeof this.data.src === 'string' ? this.data.src : this.data.src.src;
    
    const ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath( 'https://cdn.jsdelivr.net/npm/three@0.136.0/examples/js/libs/basis/' );
    ktx2Loader.detectSupport( this.el.sceneEl.renderer );
    this.texturePromise = new Promise (function (resolve, reject) {
      
      if (this.data.basis) {
        ktx2Loader.load( src, function ( texture ) {
          texture.flipY = false;
          console.log(texture);
          resolve(texture);
        }, function () {
          console.log( 'Loading Basis: ' + src );
        }, function (e) {
          reject(e);
        });
      } else {
        const texture = new THREE.TextureLoader().load( typeof this.data.src === 'string' ? this.data.src : this.data.src.src );
        texture.flipY = false;
        resolve(texture);
      }
    }.bind(this));

    this.el.addEventListener('object3dset', this.update.bind(this));
    this.materials = new Map();
  },
  update() {
    const filters = this.data.filter.trim().split(',');
    this.el.object3D.traverse(async function (o) {
      if (o.material) {
        if (filters.some(filter => o.material.name.includes(filter))) {
          const sceneEl = this.el.sceneEl;
          const m = o.material;
          o.material = this.materials.has(m) ? this.materials.get(m) : new THREE.MeshPhongMaterial({
            name: 'phong_' + m.name,
            lightMap: await this.texturePromise,
            lightMapIntensity: this.data.intensity,
            color: m.color,
            map: m.map,
            transparent: m.transparent,
            side: m.side,
            depthWrite: m.depthWrite,
            reflectivity: m.metalness,
            toneMapped: m.toneMapped,
            get envMap() {return sceneEl.object3D.environment}
          });
          
          this.materials.set(m, o.material);
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
  schema: {
    default: 0.5
  },
  init () {
    const renderer = this.el.renderer;
    renderer.physicallyCorrectLights = true;
    renderer.logarithmicDepthBuffer = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = this.data;
  }
})

AFRAME.registerComponent('no-tonemapping', {
  schema: {
    default: ''
  },
  init() {
    this.el.addEventListener('object3dset', this.update.bind(this));
  },
  update() {
    const filters = this.data.trim().split(',');
    this.el.object3D.traverse(function (o) {
      if (o.material) {
        if (filters.some(filter => o.material.name.includes(filter))) {
          o.material.toneMapped = false;
        }
      }
    }.bind(this));
  }
});