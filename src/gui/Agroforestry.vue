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
  },

  created() {},

  mounted() {
    this.__mounted = true;
    this.canvas = this.$refs.canvas;

    this.resizeCallback = () => {
      const width = this.canvas.clientWidth;
      const height = this.canvas.clientHeight;
      const pixelRatio = window.devicePixelRatio;

      worker.postMessage({
        type: "resize",
        width,
        height,
        pixelRatio,
      });
    };

    this.camera = new PerspectiveCamera();
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.camera.position.set(-20, 8, 3);
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

    this.renderLoop();
  },

  methods: {
    async renderLoop() {
      while (this.__mounted) {
        this.stats.beginFrame();
        this.controls.update();

        const seconds = (this.day * 24 + this.timeOfDay) * 60 * 60;

        await worker.onReply(
          worker.postMessage({
            type: "render",
            latitude: 10,
            leafGrowth: 1,
            seconds: seconds,
            camera: this.camera.matrix.toArray(),
          })
        );

        this.stats.endFrame();
        await rafPromise();
      }
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
