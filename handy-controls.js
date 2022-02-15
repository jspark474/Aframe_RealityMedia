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
    this.handyWorkCallback = this.handyWorkCallback.bind(this);
    
    const webxrData = this.el.sceneEl.getAttribute('webxr');
    const optionalFeaturesArray = webxrData.optionalFeatures;
    if (!optionalFeaturesArray.includes('hand-tracking')) {
      optionalFeaturesArray.push('hand-tracking');
      this.el.setAttribute('webxr', webxrData);
    }
    
    const self = this;
    const dracoLoader = this.el.sceneEl.systems['gltf-model'].getDRACOLoader();
    const meshoptDecoder = this.el.sceneEl.systems['gltf-model'].getMeshoptDecoder();
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
      () => {
        this.session = sceneEl.renderer.xr.getSession();
        this.referenceSpace = sceneEl.renderer.xr.getReferenceSpace();
      }
    );
    sceneEl.addEventListener("exit-vr", () => (this.session = null));
  },

  async gltfToJoints(src) {
    const el = this.el;
    await this.ready;
    const gltf = await new Promise(function (resolve, reject) {
      this.loader.load(src, resolve, undefined, reject);
    }.bind(this));

    const object = gltf.scene.children[0];
    const mesh = object.getObjectByProperty("type", "SkinnedMesh");
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const bones = [];
    for (const jointName of joints) {
      const bone = object.getObjectByName(jointName);
      if (bone !== undefined) {
        bone.jointName = jointName;
        bones.push(bone);
      } else {
        console.warn(
          `Couldn't find ${jointName} in ${src} hand mesh`
        );
        bones.push(undefined); // add an empty slot
      }
    }
    el.setObject3D("mesh-right", mesh);
    el.emit("model-loaded", { format: "gltf", model: mesh });
    return bones;
  },

  async update() {
    const self = this;
    const el = this.el;
    const srcLeft = this.data.left;
    const srcRight = this.data.right;

    this.remove();
    try {
      this.bonesRight = await this.gltfToJoints(srcRight);
      this.bonesLeft = await this.gltfToJoints(srcLeft);
    } catch (error) {
      const message =
        error && error.message ? error.message : "Failed to load glTF model";
      console.warn(message);
      el.emit("hand-model-error", { message });
    }
  },
  tick() {
    if (!this.session) return;
    
    const toUpdate = [];
    const frame = this.el.sceneEl.frame;
    for (const inputSource of this.session.inputSources) {
      if (!inputSource.hand) continue;
      toUpdate.push(inputSource);

      const bones =
        (this.handedness === "right" && this.bonesRight) ||
        (this.handedness === "left" && this.bonesLeft);
      if (!bones) continue;
      for (const bone of bones) {
        const joint = inputSource.hand.get(bone.jointName);
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
        toUpdate,
        this.referenceSpace,
        frame,
        this.handyWorkCallback
      );
    }
  },
  handyWorkCallback: function ({
		distances
	}) {
		this.el.emit('pose_' + distances[0][0]);
		this.el.emit('pose', distances[0][0]);
	},
  remove() {
    if (this.bonesLeft) {
      this.bonesLeft = null;
      this.el.removeObject3D("mesh-left");
    }
    if (this.bonesRight) {
      this.bonesRight = null;
      this.el.removeObject3D("mesh-right")
    };
  },
});
