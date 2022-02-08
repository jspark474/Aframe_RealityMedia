xr-starter-kit
=============

A boiler plate project for getting started with VR and AR with AFrame

This site tries to demonstrate many of the WebXR features to work with VR or AR.

## Components

These are some provided components to aid with the endeavour:

### ar-cursor.js

This file provides the `ar-cursor` component for `clicking` on objects in AR using any
XR input such as tapping on the screen or using an external controller.

Add it to the `<a-scene>` element along with a raycaster and it will use the raycaster to
determine which objects are selected and fire `"click"` events on them.

```html
<a-scene ar-cursor raycaster="objects: #my-objects *">
```

### ar-shadow-helper.js

This file provides the `ar-shadow-helper` component which lets a plane track a particular object
so that it recieves an optimal amount of shadow from a directional light.

This should have an object which can receive a shadow and works well for augmented reality with the
`shader:shadow` material

It also includes `auto-shadow-cam` which controls the orthogonal shadow camera of a directional light
so that the camera covers the minimal area required to fully light an object.

```html
<a-light id="dirlight" auto-shadow-cam intensity="0.4" light="castShadow:true;type:directional" position="10 10 10"></a-light>
    
<a-entity
  material="shader:shadow; depthWrite:false; opacity:0.9;"
  visible="false"
  geometry="primitive:shadow-plane;"
  shadow="cast:false;receive:true;"
  ar-shadow-helper="target:#my-objects;light:#dirlight;"
></a-entity>
```

### model-utils.js

This file provides utilities for modifying 