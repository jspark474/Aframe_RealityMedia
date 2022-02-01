/* global AFRAME */
AFRAME.registerComponent('lightmap', {
  schema: {
    type: "map"
  },
  init() {
    this.el.addEventListener('object3dset', this.update.bind(this));
  },
  update() {
    this.el.object3D.traverse(function (o) {
      if (o.material) {
        o.material.lightMap = this.data;
      }
    }.bind(this));
  }
});
