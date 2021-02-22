<template lang="pug">
div.gui.h-100.p-0
  div.row.h-100.no-gutters
    form.col-4
      div.container-fluid
        h1 Agroforestry

        label.form-group.row(v-for="setting of settingsLayout.main")
          div.col-4.col-form-label {{setting.name}}
          div.col-8
            number-input.form-control(
              :min="setting.min" :max="setting.max"
              :value="settings[setting.value]"
              @change="(v) => settings[setting.value]=v"
              :precision="setting.precision === undefined ? 2 : setting.precision")
        
        h2 Trees

        

    agroforestry.col-8.h-100(
      :stats="statistics"
      :settings="settings"
      :field="field"
    )
</template>

<script lang="ts">
import Statistics from "./Statistics";
import Agroforestry from "./Agroforestry.vue";
import NumberInput from "./NumberInput.vue";

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
    agroforestry: Agroforestry,
    "number-input": NumberInput,
  },
  data() {
    const field = {
      field: {
        size: 32.0,
        latitude: 50.5,
        rotation: 180.0,
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
            name: "Latitude",
            value: "latitude",
            min: -90,
            max: 90,
          },
          {
            name: "Time of day",
            value: "timeOfDay",
            min: 0,
            max: 24,
          },
          {
            name: "Day",
            value: "day",
            precision: 0,
            min: 0,
            max: 366,
          },
          {
            name: "Leaf growth",
            value: "leafGrowth",
            min: 0,
            max: 1,
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
      if (!this.updated) {
        this.updated = true;
        this.changed_field = clone(this.field);
      }
    },
  },
};
</script>

<style lang="scss" scoped></style>
