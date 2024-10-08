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
      tabs.d-flex.flex-column.h-100(
        :items="[ { slot: 'field', title: 'Agroforestry' }, { slot: 'trees', title: 'Trees' }, { slot: 'references', title: 'References' }, ]"
      )
        template(v-slot:title="{ item }")
          span {{ item.title }}
        template(v-slot:field="")
          form.flex-grow-1.position-relative.m-0(@drop.stop.prevent="onDrop")
            .position-absolute.container-fluid.h-100.overflow-y-auto.p-3
              h2 Geography

              .form-group
                gui-setting(
                  v-for="setting of settingsLayout.geography",
                  :attributes="setting.attributes",
                  :name="setting.name",
                  :type="setting.type",
                  :info="setting.info",
                  v-model="changedField.geography[setting.value]",
                  @update:model-value="invalidate"
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
                  @update:modelValue="invalidate"
                )

              h2 Trees

              button.btn.btn-link(type="button", @click="() => addTree()") Add new tree

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
                  @update:model-value="() => { invalidate(); if (setting.invalidateTree) invalidateTree(tree); }"
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
                label.form-label.row
                  gui-label.col-4 Tree line
                  .col-8.input-group-sm
                    input.form-check-input(
                      type="checkbox",
                      v-model="tree.treeline",
                      @update:model-value="invalidate"
                    )

                div(v-if="tree.treeline")
                  gui-setting(
                    v-for="setting of settingsLayout.treeline",
                    :attributes="setting.attributes.apply ? setting.attributes(tree) : setting.attributes",
                    :name="setting.name",
                    :type="setting.type",
                    :info="setting.info",
                    v-model="tree[setting.value]",
                    @update:model-value="invalidate"
                  )
                .clearfix
                  button.float-end.btn.btn-link.btn-sm(
                    type="button",
                    @click="() => { changedField.trees.splice(index, 1); invalidate(); }"
                  ) Remove
                .col-12.float-none
                  hr

            button.update-button.btn.btn-primary.btn-lg(
              type="button",
              :disabled="updated",
              @click="() => update()"
            )
              <i class="bi bi-arrow-clockwise"></i> Update

        template(v-slot:trees="")
          .flex-grow-1.position-relative.m-0
            .position-absolute.container-fluid.h-100.overflow-y-auto.p-3
              h2 Tree types
              tree-overview(:trees="availableTrees", @error="onError")

        template(v-slot:references="")
          .flex-grow-1.position-relative.m-0
            .position-absolute.container-fluid.h-100.overflow-y-auto.p-3
              h2 References
              ul
                li
                  cite
                    | Instruction manual <a href="https://github.com/twist-numerical/agroforestry/raw/main/InstructionManualLightModel.pdf">(Download manual)</a>
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
import SideBySide from "./layout/SideBySide.vue";
import { saveAs } from "file-saver";
import {
  FieldConfiguration,
  TreeConfiguration,
  TreelineConfiguration,
} from "../data/Field";
import workerManager from "./workerManager";
import TreeOverview from "./TreeOverview.vue";
import Tabs from "./layout/Tabs.vue";
import { toRaw } from "vue";

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
    "tree-overview": TreeOverview,
    tabs: Tabs,
  },
  created() {
    this.updateAvailableTrees = (available: string[]) => {
      this.availableTrees = available;
    };
    workerManager.addMessageListener(
      "availableTrees",
      this.updateAvailableTrees
    );
    (async () => {
      this.updateAvailableTrees(
        (
          await workerManager.onReply(
            workerManager.postMessage("availableTrees")
          )
        ).data
      );
    })();
  },
  destroyed() {
    workerManager.removeMessageListener(
      "availableTrees",
      this.updateAvailableTrees
    );
  },
  data() {
    const field: FieldConfiguration = {
      geography: {
        latitude: 50.5,
        rotation: 15,
        inclination: 0,
        //inclinationRotation: 45,
      },
      sensors: {
        size: [16, 16],
        count: [4, 4],
        renderSize: 1024,
        diffuseLightCount: 21,
      },
      trees: [
        {
          id: "Oak young",
          position: [-5, -5],
          scale: 1,
          rotation: 0,
          leafLength: 0.1,
          leafWidth: 0.07,
          leavesPerTwig: 15,
          maxTwigRadius: 0.02,
          treeline: false,
          xCount: 4,
          xDistance: 3,
          yCount: 1,
          yDistance: 5,
        },
        {
          id: "Oak medium",
          position: [0, 0],
          scale: 1,
          rotation: 0,
          leafLength: 0.1,
          leafWidth: 0.07,
          leavesPerTwig: 15,
          maxTwigRadius: 0.02,
          treeline: false,
          xCount: 4,
          xDistance: 3,
          yCount: 1,
          yDistance: 5,
        },
        {
          id: "Oak old",
          position: [5, 5],
          scale: 1,
          rotation: 0,
          leafLength: 0.1,
          leafWidth: 0.07,
          leavesPerTwig: 15,
          maxTwigRadius: 0.02,
          treeline: false,
          xCount: 4,
          xDistance: 3,
          yCount: 1,
          yDistance: 5,
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
      availableTrees: [],
      changedField: clone(field),
      settingsLayout: settingsLayout(this),
    };
  },
  methods: {
    invalidate() {
      console.log("invalidated")
      this.updated = false;
    },
    invalidateTree(tree: TreelineConfiguration) {
      console.log("invalidated tree")
      delete tree["leafDensityValues"];
      delete tree["leafAreaIndex"];
    },
    update() {
      this.updated = true;
      this.field = clone(this.changedField);
    },
    addTree() {
      this.changedField.trees.push({
        id: "Alder medium",
        position: [0, 0],
        scale: 1,
        rotation: 0,
        leafLength: 0.1,
        leafWidth: 0.1,
        leavesPerTwig: 10,
        maxTwigRadius: 0.05,
        treeline: false,
        xCount: 1,
        xDistance: 2,
        yCount: 1,
        yDistance: 0,
      } as TreelineConfiguration);
      this.invalidate();
    },
    async calculateLeafDensity(tree: any) {
      tree["leafDensityValues"] = "loading";
      const density = (
        await workerManager.onReply(
          workerManager.postMessage("leafDensity", toRaw(tree))
        )
      ).data as number[];
      tree["leafDensityValues"] = density;
    },
    async calculateLeafAreaIndex(tree: any) {
      tree["leafAreaIndex"] = "loading";
      const leafAreaIndex = (
        await workerManager.onReply(
          workerManager.postMessage("leafAreaIndex", toRaw(tree))
        )
      ).data as number;
      tree["leafAreaIndex"] = leafAreaIndex;
    },
    onError(e: { message: string }) {
      this.error(e.message);
    },
    error(message: string, time: number = 5000) {
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
    onDrop(e: DragEvent) {
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

.update-button {
  position: absolute;
  bottom: 1em;
  right: 2em;
  z-index: 10;
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
