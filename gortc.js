/* jshint browser:true */
/* global module, require */
'use strict';

/**
 * @fileOverview
 * Contains the GoRTC library: WebRTC + GoInstant for serverless video
 * conferencing!
 *
 * This library builds on the excellent WebRTC library from &yet, the folks
 * behind SimpleWebRtc. It layers on some GoInstant magic for the signalling,
 * so you can drop it in to an existing GoInstant application and get video
 * conferencing without deploying or writing a line of server code.
 *
 * @see https://github.com/HenrikJoreteg/webrtc.js
 * @see http://simplewebrtc.com/
 */

var support = window.mozRTCPeerConnection || window.webkitRTCPeerConnection ||
              window.RTCPeerConnection;

if (!support) {
  module.exports = function() {
    throw new Error('This browser doesn\'t support webrtc.');
  };
  module.exports.support = false;
  return;
}

var WebRTC = require('./vendor/webrtc/webrtc.bundle.js');
var attachMediaStream =
  require('./vendor/attachmediastream/attachmediastream.bundle.js');
var Emitter = require('emitter');

/**
 * @constructor
 * @param {object} opts The options object. Supports all the WebRTC options plus
 *        the following:
 * @param {Room} opts.room The GoInstant room to use for negotiating the WebRTC
 *        connection.
 * @param {boolean} opts.autoStart Will start the conference immediately on
 *        construction if true.
 */
function GoRTC (opts) {
  // Use the WebRTC library underneath.
  this.webrtc = new WebRTC(opts);

  this.room = opts.room;

  this.channel = this.room.channel('goinstant.gortc');
  this.key = this.room.key('goinstant/gortc');

  // Defaults to video and audio if not specified.
  this.constraints = {
    video: opts.video === undefined || opts.video,
    audio: opts.audio === undefined || opts.audio
  };

  this.started = false;

  // Get the local user id.
  var userKeyName = this.room.self().name;
  this.id = userKeyName.substr(userKeyName.lastIndexOf('/') + 1);

  // Stop this instance when the page unloads. This is an attempt to prevent
  // video freezes on remote client when e.g. the user closes the browser.
  this.unloadHandler = this.stop.bind(this);

  Emitter.call(this);

  // Autostart the connection if the flag was supplied.
  if (opts.autoStart) {
    this.start();
  }
}

GoRTC.support = true;

// Inherit a prototype from Emitter so we can emit events.
GoRTC.prototype = Object.create(Emitter.prototype, {
  constructor: { value: GoRTC }
});

/**
 * Start the conference. Establishes a WebRTC connection to any other users
 * in the room who have also started an instance of the library.
 *
 * @param {function(err)} cb Handler for when starting is complete or an
 *                           error occurs.
 */
GoRTC.prototype.start = function(cb) {
  cb = cb || function(){};

  if (this.started) {
    return cb();
  }

  this.started = true;
  var self = this;

  // Handle messages received over the signalling channel.
  this.channel.on('message', this._onMessageReceived.bind(this));

  // Messages from webrtc are just forwarded on to the goinstant channel
  this.webrtc.on('message', 'gortc', this.channel.message.bind(this.channel));

  this.webrtc.on('localStream', 'gortc', function(stream) {
    var video = attachMediaStream(stream, null, { muted: true, mirror: true });
    self.localVideo = video;
  });

  // Create video elements automatically on new remote streams.
  this.webrtc.on('peerStreamAdded', 'gortc', function(peer) {
    var video = attachMediaStream(peer.stream);
    peer.video = video;
  });

  // Re-emit all webrtc events.
  this.webrtc.on('*', 'gortc', this.emit.bind(this));

  // Attach an unload handler for sudden browser closes.
  window.addEventListener('beforeunload', this.unloadHandler);

  function setupPlatform(err) {
    if (err) {
      return cb(err);
    }

    self.key.get(function(err, userIds) {
      if (err) {
        return cb(err);
      }

      // Add any users who are already in the conferencing key as webrtc peers.
      for (var id in userIds) {
        self._addPeer(id);
      }

      // Add any users who get added to the conferencing key as webrtc peers.
      self.key.on('set', { bubble: true, listener: function(value, context) {
        var id = context.key.substr(context.key.lastIndexOf('/') + 1);
        self._addPeer(id);
      }});

      // Remove a peer whenever they are removed from the key.
      self.key.on('remove', { bubble: true, listener: function(value, context) {
        var id = context.key.substr(context.key.lastIndexOf('/') + 1);
        self._removePeer(id);
      }});

      // Add ourselves to the conference membership key.
      var opts = { cascade: self.room.self() };
      self.key.key(self.id).set(true, opts, function(err) {
        if (err) {
          return cb(err);
        }

        self.emit('started');
        cb();
      });
    });
  }

  this.webrtc.startLocalMedia(this.constraints, setupPlatform);
};

/**
 * Stop conferencing. The local user will leave the video conference.
 * @param {function(err)} cb Handler for when the user is fully removed.
 */
GoRTC.prototype.stop = function(cb) {
  cb = cb || function(){};

  if (!this.started) {
    return cb();
  }

  this.started = false;

  // Close all the existing connections.
  while (this.webrtc.peers.length) { this.webrtc.peers[0].end(); }

  // Stop the outgoing stream.
  this.webrtc.stopLocalMedia();

  // Remove all event listeners.
  this.key.off();
  this.channel.off();
  this.webrtc.releaseGroup('gortc');
  window.removeEventListener('beforeunload', this.unloadHandler);

  // Remove ourselves from the list of users in the video conference.
  var self = this;
  this.key.key(this.id).remove(function (err) {
    if (err) {
      return cb(err);
    }

    self.emit('stopped');
    cb();
  });
};

// Expose some functions from the underlying webrtc library.
GoRTC.prototype.pause = function() { this.webrtc.pause(); };
GoRTC.prototype.resume = function() { this.webrtc.resume(); };
GoRTC.prototype.mute = function() { this.webrtc.mute(); };
GoRTC.prototype.unmute = function() { this.webrtc.unmute(); };

/**
 * Adds a peer with the given id.
 * @param {string} userId The id for the peer.
 * @private
 */
GoRTC.prototype._addPeer = function(userId) {
  // Only add peers who have a smaller id than our own. This prevents two users
  // from both adding each other as peers. Instead, a peer will be created when
  // an offer is received from that user.
  if (userId >= this.id) {
    return;
  }

  var peer = this.webrtc.createPeer({ id: userId });
  peer.start();
};

/**
 * Removes the peer with the given id.
 * @param {string} userId The id of the peer to remove.
 * @private
 */
GoRTC.prototype._removePeer = function(userId) {
  this.webrtc.removePeers(userId);
};

/**
 * Handler for when a signalling message is received from a remote instance of
 * GoRTC.
 * @param {object} message The message that was received. This message is
 *        supplied by the underlying WebRTC library.
 * @private
 */
GoRTC.prototype._onMessageReceived = function(message, context) {
  // Ignore messages that aren't directed at us.
  if (message.to && message.to !== this.id) {
    return;
  }

  // When an offer is received we may not yet have a peer instance for that
  // user.
  if (message.type === 'offer') {
    var peer = this.webrtc.getPeers(context.userId, message.roomType);

    // Take the first peer from the array or create a new one.
    peer = peer && peer[0] || this.webrtc.createPeer({
      id: context.userId,
      type: message.roomType
    });

    return peer.handleMessage(message);
  }

  // Not an offer. Tell each peer to handle the received message.
  var peers = this.webrtc.getPeers(context.userId, message.roomType);
  peers.forEach(function(peer) { peer.handleMessage(message); });
};

module.exports = GoRTC;
