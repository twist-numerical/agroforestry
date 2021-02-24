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
        graph(
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
  canvas(ref="canvas")
</template>

<script lang="ts">
import MessageHandler from "../worker/MessageHandler";
import Statistics from "./Statistics";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { PerspectiveCamera } from "three";
import { map, range } from "../functional";
import Graph from "./Graph.vue";
import UploadFile from "./UploadFile.vue";
import { saveAs } from "file-saver";

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
    Graph,
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
    };
  },

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

      const messages = {
        progress: (message: any) => {
          console.log(message);
          this.progress = message.value;
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
    },
    abort() {
      if (this.worker !== undefined) {
        this.active = false;
        this.worker.terminate();
      }
      this.initWorker();
    },
    async calculateLight() {
      this.active = true;
      const messageEvent = await this.worker.onReply(
        this.worker.postMessage({
          type: "year",
          leafGrowth: this.leafGrowth,
          stepSize: 60*60,
        })
      );
      const data = messageEvent.data.data;

      saveAs(
        new Blob(
          map(
            ([time, row]) =>
              time + "," + row.map((v) => v.toPrecision(8)).join(",") + "\n",
            data
          ) as any,
          {
            type: "text/csv",
          }
        ),
        "sunlight.csv"
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
