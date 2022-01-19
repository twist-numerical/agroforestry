<template lang="pug">
.gui.h-100.p-0.position-relative.overflow-hidden
  .error-message(:class="{ visible: showErrorMessage }")
    .error-message-text.alert.alert-danger
      | {{ errorMessage }}
  side-by-side.h-100(
    :minWidth="0.2",
    :maxWidth="0.6",
    position="right",
    @resizeDone="() => $refs.agroforestry.resize()"
  )
    template(v-slot:left="")
      form.h-100.position-relative.gui-padding-bottom(
        @drop.prevent="onDrop",
        @dragenter.prevent="onDrop",
        @dragover.prevent="onDrop"
      )
        .update-panel.p-3.pt-0.row
          .col-4.text-center
            upload-file.btn.btn-link(@file="upload", accept=".json") 
              | Import
          .col-4.text-center
            button.btn.btn-link(type="button", @click="() => download()") Export
          .col-4.text-center
            button.btn.btn-primary.btn-lg(
              type="button",
              :disabled="updated",
              @click="() => update()"
            ) Update
        .container-fluid.h-100.overflow-y-auto.px-4
          h1 Agroforestry

          h2 Field

          .form-group
            gui-setting(
              v-for="setting of settingsLayout.field",
              :attributes="setting.attributes",
              :name="setting.name",
              :type="setting.type",
              :info="setting.info",
              v-model="changedField.field[setting.value]",
              @input="invalidate"
            )

          h2 Sensors

          .form-group
            gui-setting(
              v-for="setting of settingsLayout.sensors",
              :attributes="setting.attributes",
              :name="setting.name",
              :type="setting.type",
              :info="setting.info",
              v-model="changedField.sensors[setting.value]",
              @input="invalidate"
            )

          h2 Trees

          .form-group(
            v-for="(tree, index) of changedField.trees",
            @mouseover="() => { highlightTree = index; }",
            @mouseout="() => { if (highlightTree == index) highlightTree = -1; }"
          )
            gui-setting(
              v-for="setting of settingsLayout.tree",
              :attributes="setting.attributes.apply ? setting.attributes(tree) : setting.attributes",
              :name="setting.name",
              :type="setting.type",
              :info="setting.info",
              v-model="tree[setting.value]",
              @input="() => { invalidate(); if (setting.invalidateTree) invalidateTree(tree); }"
            )
            .form-label.row
              gui-label.col-4(
                info="The leaf density is estimated by calculating the average maximal density over many different side views of the tree. The values reported are respectively the leaf density at 0%, 25%, 50%, 75% and 100% leaf growth."
              ) Leaf density
              .col-8
                .col-form-label(v-if="tree.leafDensityValues == 'loading'")
                  | Loading...
                .col-form-label(v-else-if="!!tree.leafDensityValues")
                  .float-start.text-center(
                    v-for="(d, i) of tree.leafDensityValues",
                    :title="`Leaf density by ${Math.round((i * 100) / (tree.leafDensityValues.length - 1))}% growth`",
                    :style="{ width: `${Math.floor(100 / tree.leafDensityValues.length)}%` }"
                  ) {{ `${(d * 100).toFixed(1)}%` }}
                  .clearfix
                button.btn.btn-link(
                  v-else,
                  type="button",
                  @click.preventDefault="() => calculateLeafDensity(tree)"
                ) Calculate
            .form-label.row
              gui-label.col-4(
                info="The leaf area index is the ratio between the total leaf area on 100% growth and the (convex) ground area covered by the tree."
              ) Leaf area index
              .col-8
                .col-form-label(v-if="tree.leafAreaIndex == 'loading'")
                  | Loading...
                .col-form-label(v-else-if="!!tree.leafAreaIndex")
                  | {{ tree.leafAreaIndex.toFixed(2) }}
                button.btn.btn-link(
                  v-else,
                  type="button",
                  @click.preventDefault="() => calculateLeafAreaIndex(tree)"
                ) Calculate
            .clearfix
              button.float-end.btn.btn-link.btn-sm(
                type="button",
                @click="() => { changedField.trees.splice(index, 1); invalidate(); }"
              ) Remove
            .col-12.float-none
              hr
          button.btn.btn-link(type="button", @click="() => addTree()") Add new tree

          hr
          .form-group
            h4 References
            ul
              li
                cite
                  | Van Den Berge Sanne, Vangansbeke Pieter, Calders Kim, Vanneste Thomas, Baeten Lander, Verbeeck Hans, … Verheyen Kris.
                  | <i>Terrestrial laser scanning - RIEGL VZ-1000, individual tree point clouds and cylinder models, Belgian hedgerows and tree rows [Data set].</i>
                  | Zenodo. (2021) <a href="http://doi.org/10.5281/zenodo.4487116">http://doi.org/10.5281/zenodo.4487116</a>
              li
                cite
                  | Van Den Berge, S., Vangansbeke, P., Calders, K. et al.
                  | <i>Biomass Expansion Factors for Hedgerow-Grown Trees Derived from Terrestrial LiDAR.</i>
                  | Bioenerg. Res. (2021).
                  | <a href="https://doi.org/10.1007/s12155-021-10250-y">https://doi.org/10.1007/s12155-021-10250-y</a>

    template(v-slot:right="")
      .position-relative
        agroforestry(
          ref="agroforestry",
          :stats="statistics",
          :field="field",
          :highlightTree="highlightTree"
        )
</template>

<script lang="ts">
import Statistics from "./Statistics";
import Agroforestry from "./Agroforestry.vue";
import settingsLayout from "./settingsLayout";
import UploadFile from "./UploadFile.vue";
import GUILabel from "./GUILabel.vue";
import GUISetting from "./GUISetting.vue";
import SideBySide from "./SideBySide.vue";
import { saveAs } from "file-saver";
import Vue from "vue";

function clone(obj: any) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((v) => clone(v));
  } else if (typeof obj === "object") {
    const copy = {};
    for (const key of Object.keys(obj)) copy[key] = clone(obj[key]);
    return copy;
  } else {
    return obj;
  }
}

export default {
  components: {
    Agroforestry,
    UploadFile,
    "gui-setting": GUISetting,
    "gui-label": GUILabel,
    "side-by-side": SideBySide,
  },
  data() {
    const field = {
      field: {
        size: 40,
        latitude: 50.5,
        rotation: 15,
        inclination: 5,
        inclinationRotation: 45,
      },
      sensors: {
        size: [16, 16],
        count: [4, 4],
        renderSize: 1024,
        diffuseLightCount: 21,
      },
      trees: [
        {
          type: "oak_young",
          position: [-5, -5],
          scale: 1,
          rotation: 0,
          leafLength: 0.1,
          leafWidth: 0.2,
          leavesPerTwig: 10,
          maxTwigRadius: 0.05,
        },
        {
          type: "oak_medium",
          position: [0, 0],
          scale: 1,
          rotation: 120,
          leafLength: 0.1,
          leafWidth: 0.2,
          leavesPerTwig: 10,
          maxTwigRadius: 0.05,
        },
        {
          type: "oak_old",
          position: [5, 5],
          scale: 1,
          rotation: 240,
          leafLength: 0.2,
          leafWidth: 0.2,
          leavesPerTwig: 10,
          maxTwigRadius: 0.05,
        },
      ],
    };

    return {
      statistics: new Statistics(50),
      updated: true,
      errorMessage: "",
      showErrorMessage: false,
      highlightTree: -1,
      field: field,
      changedField: clone(field),
      settingsLayout: settingsLayout(this),
    };
  },
  methods: {
    invalidate() {
      this.updated = false;
    },
    invalidateTree(tree) {
      Vue.delete(tree, "leafDensityValues");
      Vue.delete(tree, "leafAreaIndex");
    },
    update() {
      this.updated = true;
      this.field = clone(this.changedField);
    },
    addTree() {
      this.changedField.trees.push({
        type: "alder_medium",
        position: [0, 0],
        scale: 1,
        rotate: 0,
        leafLength: 0.1,
        leafWidth: 0.1,
        leavesPerTwig: 10,
        maxTwigRadius: 0.05,
      });
      this.invalidate();
    },
    async calculateLeafDensity(tree: any) {
      Vue.set(tree, "leafDensityValues", "loading");
      const message = {
        type: "leafDensity",
        tree: tree,
      };
      const worker = this.$refs.agroforestry.worker;
      const messageEvent = await worker.onReply(worker.postMessage(message));
      Vue.set(tree, "leafDensityValues", messageEvent.data.density);
    },
    async calculateLeafAreaIndex(tree: any) {
      Vue.set(tree, "leafAreaIndex", "loading");
      const message = {
        type: "leafAreaIndex",
        tree: tree,
      };
      const worker = this.$refs.agroforestry.worker;
      const messageEvent = await worker.onReply(worker.postMessage(message));
      Vue.set(tree, "leafAreaIndex", messageEvent.data.leafAreaIndex);
    },
    error(message: String, time: number = 5000) {
      this.errorMessage = message;
      this.showErrorMessage = true;
      setTimeout(() => {
        if (this.errorMessage == message) {
          this.showErrorMessage = false;
        }
      }, time);
    },
    upload(file: File) {
      const reader = new FileReader();
      reader.onerror = () => this.error("The file could not be opened.");
      reader.onload = (event) => {
        try {
          this.changedField = JSON.parse(event.target.result as string);
          this.update();
        } catch (e) {
          console.error(e);
          this.error("The file could not be parsed.");
        }
      };
      reader.readAsText(file);
    },
    download() {
      this.update();
      saveAs(
        new Blob([JSON.stringify(this.changedField, null, 2)], {
          type: "text/json;charset=utf-8",
        }),
        "field.json"
      );
    },
    onDrop(e) {
      e.stopPropagation();
      e.preventDefault();
      if (
        e.dataTransfer &&
        e.dataTransfer.files &&
        e.dataTransfer.files.length > 0
      ) {
        this.upload(e.dataTransfer.files[0]);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.overflow-y-auto {
  overflow-y: auto;
  overflow-x: hidden;
}

.gui-padding-bottom {
  padding-bottom: 5em;
}

.update-panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
}

.error-message {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 0;
  right: 0;
  display: flex;
  justify-content: center;

  .error-message-text {
    display: flex;
    position: absolute;
    margin: 0 auto;
    top: 0;
    height: 3em;
    z-index: 100;
    width: auto;
    transition: top 500ms;
  }

  &.visible .error-message-text {
    top: -5em;
  }
}
</style>
