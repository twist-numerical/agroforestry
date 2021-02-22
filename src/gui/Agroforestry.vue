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

function getOrDefault<T>(value: T | undefined, def: T): T {
  if (value === undefined) return def;
}

export default {
  props: {
    stats: {
      type: Statistics,
    },
    settings: {
      type: Object,
      default: () => {},
    },
    field: {
      type: Object,
    },
  },

  created() {},

  mounted() {
    this.__mounted = true;
    this.canvas = this.$refs.canvas;

    this.resizeCallback = () => {
      this.worker.postMessage({
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

    this.initWorker();

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
      const day = getOrDefault(this.settings.day, 0);
      const time = getOrDefault(this.settings.timeOfDay, 12);
      const seconds = (this.day * 24 + this.time) * 60 * 60;

      return this.worker.onReply(
        this.worker.postMessage({
          type: "render",
          latitude: getOrDefault(this.settings.latitude, 10),
          leafGrowth: getOrDefault(this.settings.leafGrowth, 0.5),
          seconds: seconds,
          camera: this.camera.matrix.toArray(),
        })
      );
    },
    initWorker() {
      const offscreen = this.canvas.transferControlToOffscreen();
      this.worker = new MessageHandler(new Worker("../worker/worker.ts"));
      this.worker.postMessage(
        {
          type: "init",
          canvas: offscreen,
        },
        [offscreen]
      );
      this.worker.postMessage({ type: "loadField", field: this.field });
    },
    abort() {
      if (this.worker !== undefined) {
        this.worker.terminate();
      }
      this.initWorker();
    },
  },
  watch: {
    field() {
      this.worker.postMessage({ type: "loadField", field: this.field });
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
