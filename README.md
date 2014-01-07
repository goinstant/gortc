## GoRTC

The GoRTC library glues together [webrtc.js](https://github.com/HenrikJoreteg/webrtc.js) and [GoInstant](http://www.goinstant.com)
to offer video conferencing with no server deployment or configuration.

## Usage

```html
<script type="text/javascript" src="https://cdn.goinstant.net/v1/platform.min.js"></script>
<script src="./dist/gortc.min.js"></script>

<script>
goinstant.connect(connectUrl, function(err, connection, lobby) {

  if (!goinstant.integrations.goRTC.support) {
    window.alert('Your browser does not support webrtc');
    return;
  }

  var gortc = new goinstant.integrations.goRTC({
    room: lobby,
    autoStart: true
  });

  gortc.on('localStream', function() {
    document.getElementById('localVideoContainer').appendChild(gortc.localVideo);
  });

  gortc.on('localStreamStopped', function() {
    if (gortc.localVideo.parentNode) {
      gortc.localVideo.parentNode.removeChild(gortc.localVideo);
    }
  });

  gortc.on('peerStreamAdded', function(peer) {
    document.getElementById('videoContainer').appendChild(peer.video);
  });

  gortc.on('peerStreamRemoved', function(peer) {
    if (peer.video.parentNode) {
      peer.video.parentNode.removeChild(peer.video);
    }
  });

});
</script>
```

## Interface

### Events

GoRTC emits all of the events from the [webrtc.js](https://github.com/HenrikJoreteg/webrtc.js)
library, plus a few others. Most of the time, you'll care about the following events:

* `localStream`: Called when the local user's outgoing stream is available. The stream
is passed, or you can access a video element with the stream attached via `gortc.localVideo`.
* `localStreamStopped`: The local user's outgoing stream ended.
* `peerStreamAdded`: A remote user's incoming stream is available. Passes the peer object.
The peer's `id` property matches the GoInstant `id` property for that user. You can access
the `video` property on the peer for a video element with the stream attached.
* `peerStreamRemoved`: A remote user's incoming stream was removed, because e.g. they called `stop` or closed their browser. Passes the peer object.

Other events that are available:

* `started`: The `start` function has completed successfully.
* `stopped`: The `stop` function has completed successfully.
* `audioOff`: Outgoing audio has stopped (e.g. `mute` was called).
* `audioOn`: Outgoing audio has started (e.g. `unmute` was called).
* `videoOff`: Outgoing video has stopped (e.g. `pause` was called).
* `videoOn`: Outgoing video has started (e.g. `resume` was called).
* `speaking`: Emitted when someone is speaking. Gets passed an empty object when
the local user is speaking, and an object with an `id` property when a remote
user is speaking.
* `stoppedSpeaking`: Emitted when somone has stopped speaking. Passed the same
arguments as `speaking`.

### Options

The following options are supported when instantiating GoRTC:

* `room`: Required. The GoInstant room to use for conferencing with other users.
* `autoStart`: Will call `start` at the end of the constructor if true. Default false.
* `video`: Whether to include video in the outgoing stream. Default true.
* `audio`: Whether to include audio in the outgoing stream. Default true.
* `debug`: Will log debug information to the console if true. Default false.
* `autoAdjustMic`: If true, will turn down outgoing volume when not speaking so as
to minimize audio echo. Default false.

### Functions

* `start`: Starts conferencing with other users.
* `stop`: Stops conferencing.
* `pause`: Pauses the outgoing video and audio streams.
* `resume`: Unpauses the outgoing video and audio streams.
* `mute`: Mutes the outgoing audio stream only.
* `unmute`: Unmutes the outgoing audio stream only.

## Contributing

### Development Dependencies

- [node.js](http://nodejs.org/) >= 0.8.0
- [grunt-cli installed globally](http://gruntjs.com/getting-started)
  - `npm install -g grunt-cli`

### Set-Up

The following assumes that you have already installed the dependencies above.

```
git clone https://github.com/goinstant/gortc.git
cd gortc
npm install
```

#### Building GoRTC for Development

GoRTC is built as a [component](https://github.com/component/component).
Feel free to manually install dependencies and build using the `component`
command line tool.

For convenience, we've included a simple grunt command for installing
component dependencies and building:

```
grunt build
```

If this command runs succesfully you'll now have `components` and `build`
directories in your Git repo root.

## License

&copy; 2013 GoInstant Inc., a salesforce.com company

Licensed under the BSD 3-clause license.
