/* global AFRAME, THREE */

const DEFAULT_HAND_PROFILE_PATH =
  "https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/generic-hand/";
const joints = [
  "wrist",
  "thumb-metacarpal",
  "thumb-phalanx-proximal",
  "thumb-phalanx-distal",
  "thumb-tip",
  "index-finger-metacarpal",
  "index-finger-phalanx-proximal",
  "index-finger-phalanx-intermediate",
  "index-finger-phalanx-distal",
  "index-finger-tip",
  "middle-finger-metacarpal",
  "middle-finger-phalanx-proximal",
  "middle-finger-phalanx-intermediate",
  "middle-finger-phalanx-distal",
  "middle-finger-tip",
  "ring-finger-metacarpal",
  "ring-finger-phalanx-proximal",
  "ring-finger-phalanx-intermediate",
  "ring-finger-phalanx-distal",
  "ring-finger-tip",
  "pinky-finger-metacarpal",
  "pinky-finger-phalanx-proximal",
  "pinky-finger-phalanx-intermediate",
  "pinky-finger-phalanx-distal",
  "pinky-finger-tip",
];

AFRAME.registerComponent("handy-controls", {
  schema: {
    left: {
      default: DEFAULT_HAND_PROFILE_PATH + "left.glb",
    },
    right: {
      default: DEFAULT_HAND_PROFILE_PATH + "right.glb",
    },
  },
  init() {
    const self = this;
    const dracoLoader = this.system.getDRACOLoader();
    const meshoptDecoder = this.system.getMeshoptDecoder();
    this.model = null;
    this.loader = new THREE.GLTFLoader();
    if (dracoLoader) {
      this.loader.setDRACOLoader(dracoLoader);
    }
    if (meshoptDecoder) {
      this.ready = meshoptDecoder.then(function (meshoptDecoder) {
        self.loader.setMeshoptDecoder(meshoptDecoder);
      });
    } else {
      this.ready = Promise.resolve();
    }

    const sceneEl = this.el.sceneEl;
    sceneEl.addEventListener(
      "enter-vr",
      () => (this.session = sceneEl.renderer.xr.getSession())
    );
    sceneEl.addEventListener("exit-vr", () => (this.session = null));
  },
  update() {
    const self = this;
    const el = this.el;
    const srcLeft = this.data.left;
    const srcRight = this.data.right;

    this.remove();

    this.ready.then(function () {
      self.loader.load(
        srcRight,
        function gltfLoaded(gltf) {
          const object = gltf.scene.children[0];
          const mesh = object.getObjectByProperty("type", "SkinnedMesh");
          mesh.frustumCulled = false;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          self.bonesRight = [];
          for (const jointName of joints) {
            const bone = object.getObjectByName(jointName);
            if (bone !== undefined) {
              bone.jointName = jointName;
              self.bonesRight.push(bone);
            } else {
              console.warn(
                `Couldn't find ${jointName} in ${handedness} hand mesh`
              );
              self.bonesRight.push(undefined); // add an empty slot
            }
          }
          el.setObject3D("mesh-right", mesh);
          el.emit("model-loaded", { format: "gltf", model: mesh });
        },
        undefined /* onProgress */,
        function gltfFailed(error) {
          const message =
            error && error.message
              ? error.message
              : "Failed to load glTF model";
          console warn(message);
          el.emit("model-error", { format: "gltf", src: srcRight });
        }
      );

      self.loader.load(
        srcLeft,
        function gltfLoaded(gltf) {
          const object = gltf.scene.children[0];
          const mesh = object.getObjectByProperty("type", "SkinnedMesh");
          mesh.frustumCulled = false;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          self.bonesLeft = [];
          for (const jointName of joints) {
            const bone = object.getObjectByName(jointName);
            if (bone !== undefined) {
              bone.jointName = jointName;
              self.bonesLeft.push(bone);
            } else {
              console.warn(
                `Couldn't find ${jointName} in ${handedness} hand mesh`
              );
              self.bonesLeft.push(undefined); // add an empty slot
            }
          }
          el.setObject3D("mesh-left", mesh);
          el.emit("model-loaded", { format: "gltf", model: mesh });
        },
        undefined /* onProgress */,
        function gltfFailed(error) {
          const message =
            error && error.message
              ? error.message
              : "Failed to load glTF model";
          warn(message);
          el.emit("model-error", { format: "gltf", src: srcLeft });
        }
      );
    });
  },
  tick() {
    if (!this.session) return;

    const toUpdate = [];
    const frame = this.el.sceneEl.frame;
    for (const source of session.inputSources) {
      if (!source.hand) continue;
      toUpdate.push(source);

      const bones =
        (this.handedness === "right" && this.bonesRight) ||
        (this.handedness === "left" && this.bonesLeft);
      if (!bones) continue;
      for (const jointName of joints) {
        const joint = inputSource.hand.get(jointName);
        if (joint) {
          const pose = frame.getJointPose(joint, this.referenceSpace);
          bone.position.copy(pose.position);
          bone.quaternion.copy(pose.quaternion);
        }
      }
    }

    // perform hand tracking
    if (toUpdate.length && window.handyWorkUpdate) {
      window.handyWorkUpdate(
        [controller],
        this.referenceSpace,
        frame,
        this.handyWorkCallback.bind(this)
      );
    }
  },
  remove() {
    this.el.removeObject3D("mesh-left");
    this.el.removeObject3D("mesh-right");
  },
});
