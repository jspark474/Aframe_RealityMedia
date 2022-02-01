/* global AFRAME */
const p = 2;
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
