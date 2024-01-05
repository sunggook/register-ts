/*
 *  Copyright (c) 2020 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

/**
 * Applies a picture-frame effect using CanvasRenderingContext2D.
 * @implements {FrameTransform} in pipeline.js
 */
class CanvasTransform { // eslint-disable-line no-unused-vars
  constructor() {
    /**
     * @private {?OffscreenCanvas} canvas used to create the 2D context.
     *     Initialized in init.
     */
    this.canvas_ = null;
    /**
     * @private {?CanvasRenderingContext2D} the 2D context used to draw the
     *     effect. Initialized in init.
     */
    this.ctx_ = null;
    /** @private {string} */
    this.debugPath_ = 'debug.pipeline.frameTransform_';

    this.frameMetadata_ = [];

    this.registerListenerFromHost();
  }
  /** @override */
  async init() {
    console.log('[CanvasTransform] Initializing 2D context for transform');
    this.canvas_ = new OffscreenCanvas(1, 1);
    this.ctx_ = /** @type {?CanvasRenderingContext2D} */ (
      this.canvas_.getContext('2d', { alpha: false, desynchronized: true }));
    if (!this.ctx_) {
      throw new Error('Unable to create CanvasRenderingContext2D');
    }
    console.log(
      '[CanvasTransform] CanvasRenderingContext2D initialized.',
      `${this.debugPath_}.canvas_ =`, this.canvas_,
      `${this.debugPath_}.ctx_ =`, this.ctx_);
  }

  /** @override */
  async transform(frame, controller) {
    const ctx = this.ctx_;
    if (!this.canvas_ || !ctx) {
      frame.close();
      return;
    }
    const width = frame.displayWidth;
    const height = frame.displayHeight;
    this.canvas_.width = width;
    this.canvas_.height = height;
    const timestamp = frame.timestamp;


    console.log('CANVAS:timestamp:' + timestamp.toString());
    // sunggch
    const metaData = this.getMetadata(timestamp);

    if (metaData.timestamp === timestamp) {
      if (metaData.alpha != undefined) {
        ctx.globalAlpha = metaData.alpha / 10;
        console.log("globalAlpha:" + ctx.globalAlpha.toString());
      }

      // if (metaData.backgroundColor != undefined) {
      //   ctx.fillStyle = metaData.backgroundColor;
      //   ctx.fillRect(0, 0, width, height);
      // }
    }

    ctx.globalCompositeOperation = "lighter"; // sunggch
    ctx.drawImage(frame, 0, 0);
    frame.close();

    ctx.shadowColor = '#000';
    ctx.shadowBlur = 20;
    ctx.lineWidth = 50;
    ctx.strokeStyle = '#000';
    ctx.strokeRect(0, 0, width, height);

    // alpha: 'discard' is needed in order to send frames to a PeerConnection.
    // controller.enqueue(new VideoFrame(this.canvas_, { timestamp, alpha: 'discard' }));
    setTimeout(() => {
      console.log('InTimeout:' + timestamp.toString());
      controller.enqueue(new VideoFrame(this.canvas_, { timestamp, alpha: 'keep' }));
    }, 1000);
  }

  registerListenerFromHost() {
    /*
    const frame = {
      timestamp: 1234
      alpha: 0,
      backgroundColor: "red",
    };

    */

    window.chrome.webview.addEventListener("message", this.listenerFromHost.bind(this));

  }

  listenerFromHost(args) {
    if (typeof args.data === 'object' && "timestamp" in args.data) {
      console.log("new entry:" + args.data.timestamp);
      if (this.frameMetadata_.length > 0) {
        // If new timestamp is prior to the last timestamp, ignore it.
        if (this.frameMetadata_[this.frameMetadata_.length - 1].timestamp >= args.data.timestamp) {
          console.log("invalid timestamp: " + args.data.timestamp);
          return;
        }
      }

      console.log("add an entry: " + args.data.timestamp);
      this.frameMetadata_.push({timestamp: args.data.timestamp, alpha: args.data.alpha, backgroundColor:args.data.backgroundColor});
    } else {
      console.log("invalid parameters");
    }
  }

  getMetadata(timestamp) {
    let foundIndex = -1;
    for(var i = 0; i <  this.frameMetadata_.length; ++i){
      if(this.frameMetadata_[i].timestamp == timestamp){
        foundIndex = i;

        console.log("found an entry: " + timestamp.toString());
        break;
      }
    }

    // remove all items before found timestamp because timestamp
    // is increasing order and do not care about the previous order.
    if (foundIndex !== -1) {
      const metadata = this.frameMetadata_[foundIndex];
      this.frameMetadata_.splice(0, foundIndex + 1);
      return metadata;
    }
    // failed metadata.

    // console.log("failed to find:" + timestamp.toString());
    return {timestamp:-1};
  }

  /** @override */
  destroy() { }
}
