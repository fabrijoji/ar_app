# MindAR image runtime 1.2.5

Image-only distribution files from https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/:
- mindar-image-three.prod.js
- controller-mGt1s8dJ.js
- ui-fBadYuor.js

MIT license included. The controller bundle includes the upstream TensorFlow.js runtime.
Three.js is installed separately, pinned to the compatible 0.160.1 release.
The full MindAR npm package is intentionally not installed: it includes MediaPipe
face-tracking and native canvas dependencies, neither of which this prototype needs.

Local lifecycle patches in mindar-image-three.prod.js:
- Retain and remove the resize listener; ignore resize before the controller exists.
- Make stop safe during partial initialization and mark the instance stopped.
- Settle pending video startup when stopped.
- Release a camera stream that arrives after stop (pending permission prompt).
- Check cancellation after asynchronous startup stages before starting tracking.
- Propagate camera and target-loading failures (remove the async Promise executor).

The declaration file describes only the API used by ARView.
When updating upstream, preserve or re-evaluate these lifecycle patches.

Sample assets in static/targets are copied unchanged from:
https://github.com/hiukim/mind-ar-js/tree/v1.2.5/examples/image-tracking/assets/card-example

The controller bundle uses native fetch in its unused Node fetch fallback so
Vite does not try to resolve node-fetch for this browser-only runtime.
