<template lang="pug">
div.position-relative
  div.calculate-light.col-6.no-gutter.p-3(
        @drop.prevent="onDrop"
        @dragenter.prevent="onDrop"
        @dragover.prevent="onDrop"
      )
    div.row
      div.col-6
        h5.pt-1 Leaf growth
      div.col-6
        UploadFile.btn.btn-link(@file="uploadLeafGrowth", accept="*") 
          | Import

    div.row.mb-3
      div.col-12
        leaf-graph(
            :values="leafGrowth"
            :ymin="-0.05"
            :ymax="1.05"
            :aspectRatio="0.3"
            width="100%")
          rect.summer(
              width="0.25"
              height="0.3"
              x="0.5"
              y="0"
              
          )
          text(
              x="0.5"
              y="0.28"
              textLength="0.25"
              lengthAdjust="spacingAndGlyphs"
              style="font-size: 0.05pt; text-anchor: bottom; fill: white"
          ) &nbsp;summer&nbsp;
          template(v-slot:overlay="")
            rect.progress(
                v-if="active"
                :width="1-progress"
                height="0.3"
                :x="progress"
                y="0"
            )

    div.row
      div.col-4.text-center
        button.btn.btn-link(type="button" v-show="active" @click="abort") Abort
      div.col-8.text-center
        button.btn.btn-primary(type="button" :disabled="active" @click="calculateLight") Calculate light
  canvas(ref="canvas" :key="`canvas-${canvasID}`")
</template>

<script lang="ts">
import MessageHandler from "../worker/MessageHandler";
import Statistics from "./Statistics";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { PerspectiveCamera } from "three";
import LeafGraph from "./LeafGraph.vue";
import UploadFile from "./UploadFile.vue";
import { saveAs } from "file-saver";
import { clamp, map, range } from "../util";

function rafPromise(): Promise<void> {
  let _resolve: () => void;
  const p = new Promise<void>((resolve) => (_resolve = resolve));
  requestAnimationFrame(_resolve);
  return p;
}

function getOrDefault<T>(value: T | undefined, def: T): T {
  if (value === undefined) return def;
  return value;
}

export default {
  components: {
    LeafGraph,
    UploadFile,
  },
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

  data() {
    return {
      leafGrowth: [...range(0, 366)].map(
        (i) => 0.5 - 0.5 * Math.cos((i * 2 * Math.PI) / 366)
      ),
      active: false,
      progress: 0,
      canvasID: 0,
    };
  },

  mounted() {
    this.__mounted = true;

    this.resizeCallback = () => {
      this.worker.postMessage({
        type: "resize",
        width: this.$refs.canvas.clientWidth,
        height: this.$refs.canvas.clientHeight,
        pixelRatio: window.devicePixelRatio,
      });
    };

    this.camera = new PerspectiveCamera();
    this.camera.position.set(-30, 18, 3);
    this.camera.lookAt(0, 0, 0);

    this.initWorker();

    window.addEventListener("resize", this.resizeCallback);
  },

  methods: {
    render() {
      const day = getOrDefault(this.settings.day, 0);
      const time = getOrDefault(this.settings.timeOfDay, 12);
      const seconds = (day * 24 + time) * 60 * 60;

      return this.worker.onReply(
        this.worker.postMessage({
          type: "render",
          leafGrowth: getOrDefault(this.settings.leafGrowth, 0.5),
          seconds: seconds,
          camera: this.camera.matrix.toArray(),
        })
      );
    },
    initWorker() {
      const offscreen = this.$refs.canvas.transferControlToOffscreen();
      this.worker = new MessageHandler(new Worker("../worker/worker.ts"));
      this.worker.postMessage(
        {
          type: "init",
          canvas: offscreen,
        },
        [offscreen]
      );

      this.worker.postMessage({ type: "loadField", field: this.field });
      this.resizeCallback();

      if (this.controls) this.controls.dispose();
      this.controls = new OrbitControls(this.camera, this.$refs.canvas);
      this.controls.update();

      const messages = {
        progress: (message: any) => {
          this.progress = clamp(message.value, 0, 1);
        },
      };

      (async () => {
        for await (const messageEvent of this.worker.messages()) {
          const action = messages[messageEvent.data.type];

          if (action === undefined)
            console.error(`The action '${action}' is not available`);
          else action(messageEvent.data);
        }
      })();

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
    abort() {
      if (this.worker !== undefined) {
        this.active = false;
        this.worker.terminate();
        ++this.canvasID;
        this.$nextTick(() => this.initWorker(), 100);
      }
    },
    async calculateLight() {
      this.active = true;
      const messageEvent = await this.worker.onReply(
        this.worker.postMessage({
          type: "light",
          leafGrowth: this.leafGrowth,
          stepSize: this.field.sensors.timeStepSize * 60,
        })
      );
      this.active = false;

      console.log(messageEvent);

      saveAs(
        new Blob(
          messageEvent.data.sunlight.map(
            ([day, time, row], index: number) =>
              `${day}, ${time}, ${row
                .map((v) => (index == 0 ? v : v.toPrecision(8)))
                .join(",")}\n`
          ),
          {
            type: "text/csv",
          }
        ),
        "sunlight.csv"
      );

      saveAs(
        new Blob(
          messageEvent.data.diffuseLight.map(
            ([time, row], index: number) =>
              `${time}, ${row
                .map((v) => (index == 0 ? v : v.toPrecision(8)))
                .join(",")}\n`
          ),
          {
            type: "text/csv",
          }
        ),
        "diffuse_light.csv"
      );
    },
    uploadLeafGrowth(file: File) {
      const reader = new FileReader();
      reader.onerror = () => this.error("The file could not be opened.");
      reader.onload = (event) => {
        try {
          const result = event.target.result as string;
          const dataRegex = /\b[0-9]*([0-9]\.?|\.[0-9]+)\b/g;
          const leafGrowth = [];
          let match: RegExpExecArray;
          while ((match = dataRegex.exec(result)) && leafGrowth.length < 366)
            leafGrowth.push(+match[0]);
          while (leafGrowth.length < 366) leafGrowth.push(0.5);
          this.leafGrowth = leafGrowth;
        } catch (e) {
          console.error(e);
        }
      };
      reader.readAsText(file);
    },
    onDrop(e) {
      e.stopPropagation();
      e.preventDefault();
      if (
        e.dataTransfer &&
        e.dataTransfer.files &&
        e.dataTransfer.files.length > 0
      ) {
        this.uploadLeafGrowth(e.dataTransfer.files[0]);
      }
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
    if (this.worker !== undefined) {
      this.worker.terminate();
    }
  },
};
</script>

<style lang="scss" scoped>
@import "./style.scss";

canvas {
  width: 100%;
  height: 100%;
}

.calculate-light {
  position: absolute;
  right: 0;
  bottom: 0;
  background: white;
}

.summer {
  fill: theme-color(secondary);
}

.progress {
  opacity: 0.8;
  fill: white;
}
</style>
