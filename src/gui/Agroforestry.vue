<template lang="pug">
div
  canvas(ref="canvas")
</template>

<script lang="ts">
import MessageHandler from "../worker/MessageHandler";
import Statistics from "./Statistics";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { PerspectiveCamera } from "three";

function rafPromise(): Promise<void> {
  let _resolve: () => void;
  const p = new Promise<void>((resolve) => (_resolve = resolve));
  requestAnimationFrame(_resolve);
  return p;
}

const worker = new MessageHandler(new Worker("../worker/worker.ts"));

export default {
  props: {
    stats: {
      type: Statistics,
    },
    day: {
      type: Number,
      default: 0,
    },
    timeOfDay: {
      type: Number,
      default: 12,
    },
    leafGrowth: {
      type: Number,
      default: 0.5,
    },
    latitude: {
      type: Number,
      default: 10,
    },
  },

  created() {},

  mounted() {
    this.__mounted = true;
    this.canvas = this.$refs.canvas;

    this.resizeCallback = () => {
      worker.postMessage({
        type: "resize",
        width: this.canvas.clientWidth,
        height: this.canvas.clientHeight,
        pixelRatio: window.devicePixelRatio,
      });
    };

    this.camera = new PerspectiveCamera();
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.camera.position.set(-30, 18, 3);
    this.camera.lookAt(0, 0, 0);
    this.controls.update();

    const offscreen = this.canvas.transferControlToOffscreen();
    worker.postMessage(
      {
        type: "init",
        canvas: offscreen,
      },
      [offscreen]
    );
    this.resizeCallback();
    window.addEventListener("resize", this.resizeCallback);

    (async () => {
      while (this.__mounted) {
        this.stats.beginFrame();
        this.controls.update();
        await this.render();
        this.stats.endFrame();
        await rafPromise();
      }
    })();
  },

  methods: {
    render() {
      const seconds = (this.day * 24 + this.timeOfDay) * 60 * 60;

      return worker.onReply(
        worker.postMessage({
          type: "render",
          latitude: this.latitude,
          leafGrowth: this.leafGrowth,
          seconds: seconds,
          camera: this.camera.matrix.toArray(),
        })
      );
    },
  },

  destroyed() {
    this.__mounted = false;
    window.removeEventListener("resize", this.resizeCallback);
  },
};
</script>

<style lang="scss" scoped>
canvas {
  width: 100%;
  height: 100%;
}
</style>
