/* global AFRAME, THREE */
AFRAME.registerComponent('lightmap', {
  schema: {
    type: "map"
  },
  init() {
    this.el.addEventListener('object3dset', this.update.bind(this));
	  this.texture = new THREE.TextureLoader().load( typeof this.data === 'string' ? this.data : this.data.src );
  },
  update() {
    this.el.object3D.traverse(function (o) {
      if (o.material) {
        o.material.lightMap = this.texture;
      }
    }.bind(this));
  }
});
