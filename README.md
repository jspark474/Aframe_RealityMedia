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

This file provides the `ar-cursor