<template lang="pug">
div.gui.h-100.p-0.position-relative(
  @drop.prevent="onDrop"
  @dragenter.prevent="onDrop"
  @dragover.prevent="onDrop"
)
  div.error-message(v-if="!!errorMessage")
    | {{ errorMessage }}
  div.row.h-100.no-gutters
    form.col-5.h-100.position-relative.gui-padding-bottom
      div.update-panel.p-3.pt-0.row
        div.col-4.text-center
          UploadFile.btn.btn-link(@file="upload", accept=".json") 
            | Import
        div.col-4.text-center
          button.btn.btn-link(
            type="button"
            @click="() => download()") Export
        div.col-4.text-center
          button.btn.btn-primary.btn-lg(
            type="button"
            :disabled="updated"
            @click="() => update()") Update
      div.container-fluid.h-100.overflow-y-auto
        h1 Agroforestry

        div.form-group
          label.input-group.row(v-for="setting of settingsLayout.main")
            div.col-4.col-form-label.col-form-label-sm.text-right {{setting.name}}
            div.col-8.input-group-sm
              number-input.form-control(
                v-bind="setting.attributes"
                v-model="settings[setting.value]")
        
        h2 Field

        div.form-group
          label.row(v-for="setting of settingsLayout.field")
            div.col-4.col-form-label.col-form-label-sm.text-right {{setting.name}}
            div.col-8.input-group-sm
              number-input.form-control(
                v-bind="setting.attributes"
                v-model="changedField.field[setting.value]"
                @input="invalidate")

        h2 Trees

        div.form-group(v-for="(tree, index) of changedField.trees")
          label.row(v-for="setting of settingsLayout.tree")
            div.col-4.col-form-label.col-form-label-sm.text-right {{setting.name}}
            div.col-8.input-group-sm
              coordinate-input.input-group-sm(
                v-if="setting.type == 'coordinate'"
                v-bind="setting.attributes"
                v-model="tree[setting.value]"
                @input="invalidate")
              number-input.form-control(
                v-else
                v-bind="setting.attributes"
                v-model="tree[setting.value]"
                @input="invalidate")
          div.clearfix
            button.float-right.btn.btn-link.btn-sm(type="button" @click="() => changedField.trees.splice(index, 1)") Remove
          div.col-12.float-none
            hr
        button.btn.btn-link(type="button" @click="() => addTree()") Add new tree


    agroforestry.col-7.h-100(
      :stats="statistics"
      :settings="settings"
      :field="field"
    )
</template>

<script lang="ts">
import Statistics from "./Statistics";
import Agroforestry from "./Agroforestry.vue";
import NumberInput from "./NumberInput.vue";
import CoordinateInput from "./CoordinateInput.vue";
import UploadFile from "./UploadFile.vue";
import { saveAs } from "file-saver";

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
    NumberInput,
    CoordinateInput,
    UploadFile,
  },
  data() {
    const field = {
      field: {
        size: 32,
        latitude: 50.5,
        rotation: 180,
        inclination: 2,
        inclinationRotation: 45,
      },
      trees: [
        {
          position: [-5, 0],
          height: 12.5,
          leafLength: 0.1,
          leafWidth: 0.2,
          leavesPerTwig: 10,
        },
        {
          position: [0, 1],
          height: 12.5,
          leafLength: 0.1,
          leafWidth: 0.2,
          leavesPerTwig: 10,
        },
      ],
      sensors: {
        size: [16, 16],
        count: [20, 20],
      },
    };

    return {
      statistics: new Statistics(50),
      updated: true,
      errorMessage: "",
      settings: {
        latitude: 53,
        timeOfDay: 12,
        day: 180,
        leafGrowth: 0.7,
      },
      field: field,
      changedField: clone(field),
      settingsLayout: {
        main: [
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
        field: [
          {
            name: "Size",
            value: "size",
            attributes: {
              min: 1,
              max: 100,
            },
          },
          {
            name: "Latitude",
            value: "latitude",
            attributes: {
              min: -90,
              max: 90,
            },
          },
          {
            name: "Rotation",
            value: "rotation",
            attributes: {
              min: 0,
              max: 360,
              precision: 1,
            },
          },
          {
            name: "Inclination",
            value: "inclination",
            attributes: {
              min: 0,
              max: 90,
            },
          },
          {
            name: "Uphill",
            value: "inclinationRotation",
            attributes: {
              min: 0,
              max: 360,
            },
          },
        ],
        tree: [
          {
            name: "Position",
            type: "coordinate",
            value: "position",
            attributes: {
              xbounds: [-field.field.size / 2, field.field.size / 2],
              ybounds: [-field.field.size / 2, field.field.size / 2],
            },
          },
          {
            name: "Leaf length",
            value: "leafLength",
            attributes: {
              min: 0,
              max: 1,
            },
          },
          {
            name: "Leaf width",
            value: "leafWidth",
            attributes: {
              min: 0,
              max: 1,
            },
          },
          {
            name: "Leaves per twig",
            value: "leavesPerTwig",
            attributes: {
              min: 0,
              max: 30,
              precision: 0,
            },
          },
        ],
      },
    };
  },
  methods: {
    invalidate() {
      this.updated = false;
    },
    update() {
      this.updated = true;
      this.field = clone(this.changedField);
    },
    addTree() {
      this.changedField.trees.push({
        position: [0, 0],
        leafLength: 0.1,
        leafWidth: 0.1,
        leavesPerTwig: 10,
      });
    },
    error(message: String, time: number = 5000) {
      this.errorMessage = message;
      setTimeout(() => {
        if (this.errorMessage == message) {
          this.errorMessage = "";
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
</style>
