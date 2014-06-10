/*jshint browser:true, node:false*/
/*global require*/

describe('GoRTC Integration', function() {
  "use strict";

  var GoRTC = require('gortc');
  var Emitter = require('emitter');

  var assert = window.assert;
  var sinon = window.sinon;
  var _ = window._;

  var sandbox;
  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  var userId = '4567';
  var fakeRoom;
  var fakeChannel;
  var fakeKey;
  var fakeSelf;
  var fakeIds = {
    '1234': true,
    '6789': true,
    '9876': true
  };

  beforeEach(function() {
    fakeChannel = {
      emitter: new Emitter(),
      message: sandbox.spy(),
      on: function(evt, listener) { this.emitter.on(evt, listener); },
      off: function(evt, listener) { this.emitter.off(evt, listener); }
    };

    fakeKey = {
      emitter: new Emitter(),
      get: sandbox.stub().yields(null, fakeIds),
      set: sandbox.stub().yields(),
      remove: sandbox.stub().yields(),
      on: function(evt, options, listener) {
        listener = listener || options.listener;
        this.emitter.on(evt, listener);
      },
      off: function(evt) {
        this.emitter.off(evt);
      }
    };

    fakeKey.key = sandbox.stub().returns(fakeKey);

    fakeSelf = {
      name: '/.users/' + userId
    };

    fakeRoom = {
      channel: sandbox.stub().returns(fakeChannel),
      key: sandbox.stub().returns(fakeKey),
      self: sandbox.stub().returns(fakeSelf)
    };
  });

  if (!GoRTC.support) {
    it('throws on construction in unsupported browsers', function() {
      assert.exception(function() {
        /*jshint unused:false*/
        var gortc = new GoRTC({ room: fakeRoom });
      });
    });

    return; // Use supported browser for remaining tests
  }

  beforeEach(function() {
    sandbox.stub(window, 'addEventListener');
  });

  var peers;

  beforeEach(function() {
    peers = [];
  });

  function FakePeer(id) {
    this.id = id;
    this.start = sandbox.spy();
    this.end = function() {
      peers.splice(peers.indexOf(this), 1);
    };
    this.handleMessage = sandbox.spy();
  }

  function stubWebRtc(gortc) {
    sandbox.stub(gortc.webrtc, 'startLocalMedia').yields();
    sandbox.stub(gortc.webrtc, 'stopLocalMedia');
    sandbox.stub(gortc.webrtc, 'createPeer', function(params) {
      var peer = new FakePeer(params.id);
      peers.push(peer);
      return peer;
    });
    sandbox.stub(gortc.webrtc, 'removePeers', function(userId) {
      var peer = _.find(peers, { id: userId });
      peer.end();
    });
    sandbox.stub(gortc.webrtc, 'getPeers', function(userId) {
      return [ _.find(peers, { id: userId }) ];
    });

    gortc.webrtc.peers = peers;
  }

  it('gets the proper user id', function() {
    var gortc = new GoRTC({ room: fakeRoom });
    assert.equal(gortc.id, '4567');
  });

  describe('constraints', function() {
    it('defaults to video and audio', function() {
      var gortc = new GoRTC({ room: fakeRoom });
      assert.isTrue(gortc.constraints.video);
      assert.isTrue(gortc.constraints.audio);
    });

    it('can override via options', function() {
      var gortc = new GoRTC({ room: fakeRoom, video: false, audio: false });
      assert.isFalse(gortc.constraints.video);
      assert.isFalse(gortc.constraints.audio);
    });

    it('passes the constraints to startLocalMedia', function() {
      var gortc = new GoRTC({ room: fakeRoom, video: false, audio: false });
      stubWebRtc(gortc);
      gortc.start();
      sinon.assert.calledWith(gortc.webrtc.startLocalMedia, {
        video: false,
        audio: false
      });
    });
  });

  describe('start', function() {
    var gortc;
    var listener;

    beforeEach(function() {
      listener = sandbox.spy();
      gortc = new GoRTC({ room: fakeRoom });
      stubWebRtc(gortc);
      gortc.on('started', listener);
    });

    it('emits the started event', function(done) {
      gortc.start(function() {
        sinon.assert.calledOnce(listener);
        done();
      });
    });

    it('does not start twice', function(done) {
      gortc.start(function() {
        gortc.start(function() {
          sinon.assert.calledOnce(listener);
          done();
        });
      });
    });
  });

  describe('stop', function() {
    var gortc;

    beforeEach(function() {
      gortc = new GoRTC({ room: fakeRoom });
      stubWebRtc(gortc);
    });

    it('stops local media', function(done) {
      gortc.start(function() {
        gortc.stop(function() {
          sinon.assert.calledOnce(gortc.webrtc.stopLocalMedia);
          done();
        });
      });
    });

    it('exits early if not started', function(done) {
      gortc.stop(function() {
        sinon.assert.notCalled(gortc.webrtc.stopLocalMedia);
        done();
      });
    });

    it('removes user from membership key', function(done) {
      gortc.start(function() {
        gortc.stop(function() {
          sinon.assert.calledWith(fakeKey.key, userId);
          sinon.assert.calledOnce(fakeKey.remove);
          done();
        });
      });
    });
  });

  describe('peers', function() {
    var gortc;

    beforeEach(function() {
      gortc = new GoRTC({ room: fakeRoom });
      stubWebRtc(gortc);
    });

    it('get sent offer during start if they have a lesser id', function(done) {
      gortc.start(function() {
        assert.lengthOf(peers, 1);
        done();
      });
    });

    it('get created by received offer', function(done) {
      gortc.start(function() {
        var context = { userId: '6789' };
        fakeChannel.emitter.emit('message', { type: 'offer' }, context);
        assert.lengthOf(peers, 2);
        done();
      });
    });

    it('get ended by stop', function(done) {
      gortc.start(function() {
        gortc.stop(function() {
          assert.lengthOf(peers, 0);
          done();
        });
      });
    });

    it('get removed by leaving the conference key', function(done) {
      gortc.start(function() {
        var context = { key: fakeKey.name + '/1234' };
        fakeKey.emitter.emit('remove', null, context);
        assert.lengthOf(peers, 0);
        done();
      });
    });

    it('get passed any received message', function(done) {
      gortc.start(function() {
        var message = { foo: 'bar' };
        var context = { userId: '1234' };
        fakeChannel.emitter.emit('message', message, context);
        sinon.assert.calledWith(peers[0].handleMessage, message);
        assert.equal(peers[0].handleMessage.firstCall.args[0].from, '1234');
        done();
      });
    });
  });
});
