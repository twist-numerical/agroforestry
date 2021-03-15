<template lang="pug">
div.gui.h-100.p-0.position-relative.overflow-hidden
  div.error-message(:class="{visible: showErrorMessage}")
    div.error-message-text.alert.alert-danger
      | {{ errorMessage }}

  div.row.h-100.no-gutters
    form.col-5.h-100.position-relative.gui-padding-bottom(
        @drop.prevent="onDrop"
        @dragenter.prevent="onDrop"
        @dragover.prevent="onDrop"
      )
      div.update-panel.p-3.pt-0.row
        div.col-4.text-center
          upload-file.btn.btn-link(@file="upload", accept=".json") 
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
        
        h2 Sensors

        div.form-group
          label.row(v-for="setting of settingsLayout.sensors")
            div.col-4.col-form-label.col-form-label-sm.text-right {{setting.name}}
            div.col-8.input-group-sm
              coordinate-input.input-group-sm(
                v-if="setting.type == 'coordinate'"
                v-bind="setting.attributes"
                v-model="changedField.sensors[setting.value]"
                @input="invalidate")
              number-input.form-control(
                v-else
                v-bind="setting.attributes"
                v-model="changedField.sensors[setting.value]"
                @input="invalidate")

        h2 Trees

        div.form-group(v-for="(tree, index) of changedField.trees")
          label.row(v-for="setting of settingsLayout.tree")
            div.col-4.col-form-label.col-form-label-sm.text-right {{setting.name}}
            div.col-8.input-group-sm
              coordinate-input.input-group-sm(
                v-if="setting.type == 'coordinate'"
                v-bind="setting.attributes.apply ? setting.attributes(tree) : setting.attributes"
                v-model="tree[setting.value]"
                @input="invalidate")
              select(
                v-else-if="setting.type == 'select'"
                v-model="tree[setting.value]"
                @input="invalidate")
                option(
                  v-for="option of setting.options",
                  :value="option.value") {{option.name}}
              number-input.form-control(
                v-else
                v-bind="setting.attributes.apply ? setting.attributes(tree) : setting.attributes"
                v-model="tree[setting.value]"
                @input="invalidate")
          div.clearfix
            button.float-right.btn.btn-link.btn-sm(type="button" @click="() => { changedField.trees.splice(index, 1); invalidate(); }") Remove
          div.col-12.float-none
            hr
        button.btn.btn-link(type="button" @click="() => addTree()") Add new tree

        hr
        div.form-group
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


    div.col-7.h-100.position-relative
      agroforestry(
        ref="agroforestry"
        :stats="statistics"
        :settings="settings"
        :field="field"
      )
</template>

<script lang="ts">
import Statistics from "./Statistics";
import Agroforestry from "./Agroforestry.vue";
import settingsLayout from "./settingsLayout";
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
        timeStepSize: 120,
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
          position: [0,0],
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
      settings: {
        latitude: 53,
        timeOfDay: 12,
        day: 180,
        leafGrowth: 0.7,
      },
      field: field,
      changedField: clone(field),
      settingsLayout: settingsLayout(this),
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
        scale: 1,
        rotate: 0,
        leafLength: 0.1,
        leafWidth: 0.1,
        leavesPerTwig: 10,
        maxTwigRadius: 0.05,
      });
      this.invalidate();
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
