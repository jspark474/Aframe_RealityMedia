/* jshint esversion: 9 */
/* global THREE, AFRAME */
(function() {
  "use strict";
  const direction = new THREE.Vector3();

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

  AFRAME.registerComponent("ar-cursor", {
    dependencies: ['raycaster'],
    init() {
      const sceneEl = this.el;
      
      sceneEl.addEventListener("enter-vr", function() {
        if (this.is("ar-mode")) {

          sceneEl.xrSession.addEventListener("selectstart", function(e) {
            const inputSource = e.inputSource;
            const frame = sceneEl.frame;
            const refSpace = sceneEl.renderer.xr.getReferenceSpace();
            const pointerPose = frame.getPose(inputSource.targetRaySpace, refSpace);
            const transform = pointerPose.transform;

            direction.set(0,0,1);
            direction.applyQuaternion(transform.orientation);
            this.el.setAttribute('raycaster', {
              origin: transform.position,
              direction 
            });
            this.el.components.raycaster.checkIntersections();
            console.log(this.el.components.raycaster.intersectedEls);

            e.stopImmediatePropagation();
            e.preventDefault();
          });
      }
    });
    }
  });
})();

window.addEventListener("DOMContentLoaded", function() {
  const sceneEl = document.querySelector("a-scene");
  const message = document.getElementById("dom-overlay-message");

  // If the user taps on any buttons or interactive elements we may add then prevent
  // Any WebXR select events from firing
  message.addEventListener("beforexrselect", e => {
    e.preventDefault();
  });

  sceneEl.addEventListener("enter-vr", function() {
    if (this.is("ar-mode")) {
      // Entered AR
      message.textContent = "";

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
