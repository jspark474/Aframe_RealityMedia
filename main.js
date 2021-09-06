/* jshint esversion: 9 */
/* global THREE, AFRAME */
(function() {
  "use strict";

  AFRAME.registerComponent("hide-on-hit-test-start", {
    init: function() {
      var self = this;
      this.el.sceneEl.addEventListener("ar-hit-test-start", function() {
        self.el.object3D.visible = false;
      });
      this.el.sceneEl.addEventListener("exit-vr", function() {
        self.el.object3D.visible = true;
      });
    }
  });
})();

window.addEventListener("DOMContentLoaded", function() {
  const sceneEl = document.querySelector("a-scene");
  const message = document.getElementById("dom-overlay-message");
  const raycaster = new THREE.Raycaster();
  const direction = new THREE.Vector3();

  // If the user taps on any buttons or interactive elements we may add then prevent
  // Any WebXR select events from firing
  message.addEventListener("beforexrselect", e => {
    e.preventDefault();
  });

  sceneEl.addEventListener("enter-vr", function() {
    if (this.is("ar-mode")) {
      // Entered AR
      message.textContent = "";

      sceneEl.xrSession.addEventListener("selectstart", function(e) {
        const inputSource = e.inputSource;
        const frame = this.el.sceneEl.frame;
        const refSpace = this.renderer.xr.getReferenceSpace();
        const pointerPose = frame.getPose(inputSource.targetRaySpace, refSpace);
        
        raycaster.set( origin, direction );
        
        
        e.stopImmediatePropagation();
        e.preventDefault();
      });

      // Hit testing is available
      this.addEventListener(
        "ar-hit-test-start",
        function() {
          message.innerHTML = `Scanning environment, finding surface.`;
        },
        { once: true }
      );

      // Has managed to start doing hit testing
      this.addEventListener(
        "ar-hit-test-achieved",
        function() {
          message.innerHTML = `Select the location to place<br />By tapping on the screen or selecting with your controller.`;
        },
        { once: true }
      );

      // User has placed an object
      this.addEventListener(
        "ar-hit-test-select",
        function() {
          // Object placed for the first time
          message.textContent = "Well done!";
        },
        { once: true }
      );
    }
  });

  sceneEl.addEventListener("exit-vr", function() {
    message.textContent = "Exited Immersive Mode";
  });
});
