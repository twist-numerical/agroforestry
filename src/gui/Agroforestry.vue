<template lang="pug">
.position-relative
  .calculate-light(
    @drop.prevent="onDrop",
    @dragenter.prevent="onDrop",
    @dragover.prevent="onDrop"
  )
    accordion.card.w-100(
      :items="[ { slot: 'singlemoment', title: 'Single moment' }, { slot: 'fullyear', title: 'Full year' }, ]"
    )
      template(v-slot:title="{ item }")
        .card-header.w-100 {{ item.title }}
      template(v-slot:singlemoment="")
        .card-body.w-100
          .form-group
            label.input-group.row(v-for="setting of settingsLayout")
              .col-4.col-form-label.col-form-label-sm.text-right {{ setting.name }}
              .col-8.input-group-sm
                number-input.form-control(
                  v-bind="setting.attributes",
                  v-model="momentSettings[setting.value]"
                )

          .row
            .col-4.text-center
              button.btn.btn-link(
                type="button",
                v-show="active",
                @click="abort"
              ) Abort
            .col-8.text-center
              button.btn.btn-primary(
                type="button",
                :disabled="active",
                @click="calculateMoment"
              ) Calculate moment
      template(v-slot:fullyear="")
        .card-body.w-100
          label.input-group.row
            .col-4.col-form-label.col-form-label-sm.text-right Time step (min)
            .col-8.input-group-sm
              number-input.form-control(
                :min="15",
                :max="60 * 12",
                :precision="0",
                v-model="yearSettings.timeStep"
              )

          .row.mb-3
            .col-6
              UploadFile.btn.btn-link(@file="uploadLeafGrowth", accept="*") 
                | Import
            .col-12
              leaf-graph(
                :values="yearSettings.leafGrowth",
                :ymin="-0.05",
                :ymax="1.05",
                :aspectRatio="0.3",
                width="100%"
              )
                rect.summer(width="0.25", height="0.3", x="0.5", y="0")
                text(
                  x="0.5",
                  y="0.28",
                  textLength="0.25",
                  lengthAdjust="spacingAndGlyphs",
                  style="font-size: 0.05pt; text-anchor: bottom; fill: white"
                ) {{ String.fromCharCode(160) }}summer{{ String.fromCharCode(160) }}
                template(v-slot:overlay="")
                  rect.progress(
                    v-if="active",
                    :width="1 - progress",
                    height="0.3",
                    :x="progress",
                    y="0"
                  )

          .row
            .col-4.text-center
              button.btn.btn-link(
                type="button",
                v-show="active",
                @click="abort"
              ) Abort
            .col-8.text-center
              button.btn.btn-primary(
                type="button",
                :disabled="active",
                @click="calculateYear"
              ) Calculate year
  canvas(ref="canvas", :key="`canvas-${canvasID}`")
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
import Accordion from "./Accordion.vue";
import NumberInput from "./NumberInput.vue";

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
    Accordion,
    NumberInput,
  },
  props: {
    stats: {
      type: Statistics,
    },
    field: {
      type: Object,
    },
    highlightTree: {
      type: Number,
    },
  },

  data() {
    return {
      active: false,
      progress: 0,
      canvasID: 0,
      momentSettings: {
        timeOfDay: 12,
        day: 180,
        leafGrowth: 0.7,
      },
      yearSettings: {
        timeStep: 120,
        leafGrowth: [...range(0, 366)].map(
          (i) => 0.5 - 0.5 * Math.cos((i * 2 * Math.PI) / 366)
        ),
      },
      settingsLayout: [
        {
          name: "Time of day",
          value: "timeOfDay",
          attributes: {
            min: 0,
            max: 24,
          },
        },
        {
          name: "Day",
          value: "day",
          attributes: {
            precision: 0,
            min: 0,
            max: 366,
          },
        },
        {
          name: "Leaf growth",
          value: "leafGrowth",
          attributes: {
            min: 0,
            max: 1,
          },
        },
      ],
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
      const day = getOrDefault(this.momentSettings.day, 0);
      const time = getOrDefault(this.momentSettings.timeOfDay, 12);
      const seconds = (day * 24 + time) * 60 * 60;

      return this.worker.onReply(
        this.worker.postMessage({
          type: "render",
          leafGrowth: getOrDefault(this.momentSettings.leafGrowth, 0.5),
          seconds: seconds,
          camera: this.camera.matrix.toArray(),
          highlightTrees: this.highlightTree >= 0 ? [this.highlightTree] : [],
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
    async calculateYear() {
      this.active = true;
      const messageEvent = await this.worker.onReply(
        this.worker.postMessage({
          type: "year",
          leafGrowth: this.yearSettings.leafGrowth,
          stepSize: this.yearSettings.timeStep * 60,
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
    async calculateMoment() {
      this.active = true;
      const message = {
        type: "moment",
        day: this.momentSettings.day,
        time: this.momentSettings.timeOfDay,
        leafGrowth: this.momentSettings.leafGrowth,
      };
      const messageEvent = await this.worker.onReply(
        this.worker.postMessage(message)
      );
      this.active = false;

      console.log(messageEvent);

      saveAs(
        new Blob(
          messageEvent.data.data.map(
            ([t, ...row], index: number) =>
              `${t}, ${row
                .map((v) => (index == 0 ? v : v.toPrecision(8)))
                .join(",")}\n`
          ),
          {
            type: "text/csv",
          }
        ),
        `moment_${message.day.toFixed(0)}_${message.time.toFixed(0)}_${(
          100 * message.leafGrowth
        ).toFixed(0)}.csv`
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
          this.yearSettings.leafGrowth = leafGrowth;
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
  width: 50%;
}

.summer {
  fill: theme-color(secondary);
}

.progress {
  opacity: 0.8;
  fill: white;
}
</style>
