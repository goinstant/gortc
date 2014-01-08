## GoRTC

[Github Link](../audio_and_video/static/html/gortc_github.html "include")

The GoRTC library glues together [webrtc.js](https://github.com/HenrikJoreteg/webrtc.js)
and [GoInstant](http://www.goinstant.com) to offer video and audio conferencing
with no server deployment and configuration. We use GoRTC as the base of our
[WebRTC](./index.md) widget. You can use GoRTC in other ways and extend it as
you see fit.

## Table of Contents

1. [Code Example](#code-example)
1. [Constructor](#constructor)
1. [GoRTC#start](#gortc#start)
1. [GoRTC#stop](#gortc#stop)
1. [GoRTC#pause](#gortc#pause)
1. [GoRTC#resume](#gortc#resume)
1. [GoRTC#mute](#gortc#mute)
1. [GoRTC#unmute](#gortc#unmute)
1. [GoRTC#on](#gortc#on)
1. [GoRTC#off](#gortc#off)

## Code Example

### 1. Include our CDN assets:

#### Note on Versioning

Specific version of widgets can be found on our [CDN](https://cdn.goinstant.net/).

```html
<head>
  <script type="text/javascript" src="https://cdn.goinstant.net/v1/platform.min.js"></script>
  <script type="text/javascript" src="https://cdn.goinstant.net/integrations/gortc/latest/gortc.min.js"></script>
</head>
<body onload="onload();">
  <div id="localVideoContainer"></div>
  <div id="videoContainer"></div>
</body>
```

### 2. Create a new instance of GoRTC and register stream listeners

```js
function onload() {
  // Connect URL
  var url = 'https://goinstant.net/YOURACCOUNT/YOURAPP';

  // Connect to GoInstant
  goinstant.connect(url, function(err, platformObj, roomObj) {
    if (err) {
      throw err;
    }

    if (!goinstant.integrations.GoRTC.support) {
      window.alert('Your browser does not support webrtc');
      return;
    }

    var goRTC = new goinstant.integrations.GoRTC({
      room: roomObj,
      autoStart: true
    });

    goRTC.on('localStream', function() {
      document.getElementById('localVideoContainer').appendChild(goRTC.localVideo);
    });

    goRTC.on('localStreamStopped', function() {
      if (gortc.localVideo.parentNode) {
        gortc.localVideo.parentNode.removeChild(goRTC.localVideo);
      }
    });

    goRTC.on('peerStreamAdded', function(peer) {
      document.getElementById('videoContainer').appendChild(peer.video);
    });

    goRTC.on('peerStreamRemoved', function(peer) {
      if (peer.video.parentNode) {
        peer.video.parentNode.removeChild(peer.video);
      }
    });
  });
}
```

## Constructor

Creates a new instance of GoRTC.

### Methods

- ###### **new GoRTC(optionsObject)**

### Parameters

| optionsObject |
|:---|
| Type: [Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) |
| An object with the following properties: |
| - `room` is the [Room](../../javascript_api/rooms/index.html).|
| - `autoStart` [**default: false**] will call `#start` at the end of the constructor if `true`.|
| - `video` [**true**] Whether to include video in the outgoing stream.|
| - `audio` [**true**] Whether to include audio in the outgoing stream.|
| - `debug` [**false**] Will log debug information to the console if `true`.|
| - `autoAdjustMic` [**false**] If `true`, will turn down outgoing volume when not speaking so as to minimize audio echo. Currently unavailable in FireFox.|

### Example

```js
var options = {
  room: exampleRoom,
  autoStart: true,
  video: false,
  audio: true,
  debug: true,
  autoAdjustMic: true
};

var goRTC = new goinstant.integrations.GoRTC(options);
```

## GoRTC#start

Starts conferencing with other users.

### Methods

- ###### goRTC.start();
- ###### goRTC.start(callback(errorObject));

### Parameters

| callback(errorObject) |
|:---|
| Type: [Function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function) |
| A callback function that is called once the conferencing has successfully started. |
| - errorObject - will be `null`, unless an error has occured. |

### Example

```js
goRTC.start(function(err) {
  if (err) {
    throw err;
  }
});
```

## GoRTC#stop

Stops conferencing with other users.

### Methods

- ###### goRTC.stop();
- ###### goRTC.stop(callback(errorObject));

### Parameters

| callback(errorObject) |
|:---|
| Type: [Function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function) |
| A callback function that is called once the conferencing has successfully stopped. |
| - errorObject - will be `null`, unless an error has occured. |

### Example

```js
goRTC.stop(function(err) {
  if (err) {
    throw err;
  }
});
```

## GoRTC#pause

Pauses the outgoing audio and video streams.

### Methods

- ###### goRTC.pause();

### Example

```js
goRTC.pause();
```

## GoRTC#resume

Resumes the outgoing audio and video streams.

### Methods

- ###### goRTC.resumes();

### Example

```js
goRTC.resume();
```

## GoRTC#mute

Mutes the outgoing audio stream only.

### Methods

- ###### goRTC.mute();

### Example

```js
goRTC.mute();
```

## GoRTC#unmute

Unmutes the outgoing audio stream only.

### Methods

- ###### goRTC.unmute();

### Example

```js
goRTC.unmute();
```

## GoRTC#on

Adds an event listener to GoRTC.

### Supported Events

GoRTC emits all of the events from the [webrtc.js](https://github.com/HenrikJoreteg/webrtc.js)
library, plus a few others. The following is a useful subset of those events:

- `localStream`: Called when the local user's outgoing stream is available. The stream
is passed, or you can access a video element with the stream attached via `gortc.localVideo`.
- `localStreamStopped`: The local user's outgoing stream ended.
- `peerStreamAdded`: A remote user's incoming stream is available. Passes the peer object.
The peer's `id` property matches the GoInstant `id` property for that user. You can access
the `video` property on the peer for a video element with the stream attached.
- `peerStreamRemoved`: A remote user's incoming stream was removed, because e.g.
they called `stop` or closed their browser. Passes the peer object.
- `started`: The `start` function has completed successfully.
- `stopped`: The `stop` function has completed successfully.
- `audioOff`: Outgoing audio has stopped (e.g. `mute` was called).
- `audioOn`: Outgoing audio has started (e.g. `unmute` was called).
- `videoOff`: Outgoing video has stopped (e.g. `pause` was called).
- `videoOn`: Outgoing video has started (e.g. `resume` was called).
- `speaking`: Emitted when someone is speaking. Gets passed an empty object when
the local user is speaking, and an object with an `id` property when a remote
user is speaking.
- `stoppedSpeaking`: Emitted when somone has stopped speaking. Passed the same
arguments as `speaking`.

### Methods

- goRTC.on(eventName, listener);

### Parameters

| eventName|
|:---|
| Type: [String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String() |
| The name of the event to add a listener for. |

| listener |
|:---|
| Type: [Function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function) |
| The listener to be called when the event triggers. |

## GoRTC#off

Removes an event listener from GoRTC.

### Methods
- goRTC.off()
- goRTC.off(eventName)
- goRTC.off(eventName, listener)

### Parameters

| eventName|
|:---|
| Type: [String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String() |
| The name of the event to remove listeners for. If unsupplied, all listeners will be removed. |

| listener |
|:---|
| Type: [Function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function) |
| The listener to remove, if any. If unsupplied, all listeners will be removed. |
