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
      type: 'model',
      default: DEFAULT_HAND_PROFILE_PATH + "left.glb",
    },
    right: {
      type: 'model',
      default: DEFAULT_HAND_PROFILE_PATH + "right.glb",
    },
    materialOverride: {
      oneOf: ['both', 'left', 'right', 'none'],
      default: 'both'
    }
  },
  init() {
    this.handyWorkCallback = this.handyWorkCallback.bind(this);
    
    const webxrData = this.el.sceneEl.getAttribute('webxr');
    const optionalFeaturesArray = webxrData.optionalFeatures;
    if (!optionalFeaturesArray.includes('hand-tracking')) {
      optionalFeaturesArray.push('hand-tracking');
      this.el.sceneEl.setAttribute('webxr', webxrData);
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
  },

  async gltfToJoints(src, name) {
    const el = this.el;
    await this.ready;

    const gltf = await new Promise(function (resolve, reject) {
      this.loader.load(src, resolve, undefined, reject);
    }.bind(this));

    const object = gltf.scene.children[0];
    const mesh = object.getObjectByProperty("type", "SkinnedMesh");
    
    if (this.el.components.material) {
      if (this.data.materialOverride === 'both' || this.data.materialOverride === name) {
        mesh.material = this.el.components.material.material;
      }
    }
    
    mesh.visible = false;
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.skeleton.pose();
    
    const bones = [];
    for (const jointName of joints) {
      const bone = object.getObjectByName(jointName);
      if (bone !== undefined) {
        bone.jointName = jointName;
        bones.push(bone);
        bone.applyMatrix4(this.el.object3D.matrixWorld);
        bone.updateMatrixWorld();
      } else {
        console.warn(`Couldn't find ${jointName} in ${src} hand mesh`);
        bones.push(undefined); // add an empty slot
      }
    }
    el.setObject3D('hand-mesh-' + name, mesh);
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
      this.bonesRight = await this.gltfToJoints(srcRight, "right");
      this.bonesLeft = await this.gltfToJoints(srcLeft, "left");
    } catch (error) {
      const message = error && error.message ? error.message : "Failed to load glTF model";
      console.warn(message);
      el.emit("hand-model-error", { message });
    }
  },
  tick() {
    const session = this.el.sceneEl.xrSession;
    if (!session) return;
    const referenceSpace = this.el.sceneEl.renderer.xr.getReferenceSpace();
    
    const toUpdate = [];
    const frame = this.el.sceneEl.frame;
    for (const inputSource of session.inputSources) {
      
      const currentMesh = this.el.getObject3D("hand-mesh-" + inputSource.handedness);
      if (!currentMesh) return;
      
      const els = Array.from(this.el.querySelectorAll(`[data-${inputSource.handedness}]`)); 

      if (!inputSource.hand) {
        for (const el of els) {
          el.object3D.visible = false;
        }
        currentMesh.visible = false;
        continue;
      }
      toUpdate.push(inputSource);

      const bones =
        (inputSource.handedness === "right" && this.bonesRight) ||
        (inputSource.handedness === "left" && this.bonesLeft);
      if (!bones) continue;
      for (const bone of bones) {
        const joint = inputSource.hand.get(bone.jointName);
        if (joint) {
          const pose = frame.getJointPose(joint, referenceSpace);
          if (pose) {
            currentMesh.visible = true;
            if (bone.jointName) {
              console.log(inputSource.handedness + ': ' + pose.transform.position);
            }
            for (const el of els) {
              if (el.dataset[inputSource.handedness] === bone.jointName) {
                el.object3D.position.copy(pose.transform.position);
                el.object3D.quaternion.copy(pose.transform.orientation);
                el.object3D.visible = true;
              }
            }
            bone.position.copy(pose.transform.position);
            bone.quaternion.copy(pose.transform.orientation);
            bone.applyMatrix4(this.el.object3D.matrixWorld);
            bone.updateMatrixWorld();
          }
        }
      }
    }

    // perform hand tracking
    if (toUpdate.length && window.handyWorkUpdate) {
      window.handyWorkUpdate(
        toUpdate,
        referenceSpace,
        frame,
        this.handyWorkCallback
      );
    }
  },
  handyWorkCallback: function ({
		distances, handedness
	}) {
		this.el.emit('pose_' + handedness + '_' + distances[0][0]);
		this.el.emit('pose', {
      pose: distances[0][0],
      poses: distances,
      handedness
    });
    
    const els = Array.from(this.el.querySelectorAll(`[data-${handedness}]`));
    for (const el of els) {
      el.emit('pose_' + distances[0][0], undefined, false);
      el.emit('pose', distances[0][0], false);
    }
    
	},
  remove() {
    if (this.bonesLeft) {
      this.bonesLeft = null;
      this.el.removeObject3D("hand-mesh-left");
    }
    if (this.bonesRight) {
      this.bonesRight = null;
      this.el.removeObject3D("hand-mesh-right")
    };
  },
});
