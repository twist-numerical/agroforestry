<template lang="pug">
div.gui.h-100.p-0
  div.row.h-100.no-gutters
    form.col-4
      div.container-fluid
        h1 Agroforestry

        label.form-group.row(v-for="setting of settingsLayout")
          div.col-4.col-form-label {{setting.name}}
          div.col-8
            number-input.form-control(
              :min="setting.min" :max="setting.max"
              :value="settings[setting.value]"
              @change="(v) => settings[setting.value]=v"
              :precision="setting.precision === undefined ? 2 : setting.precision")
        
    agroforestry.col-8.h-100(
      :stats="statistics"
      :day="settings.day"
      :timeOfDay="settings.timeOfDay"
      :latitude="settings.latitude"
      :leafGrowth="settings.leafGrowth"
    )
</template>

<script lang="ts">
import Statistics from "./Statistics";
import Agroforestry from "./Agroforestry.vue";
import NumberInput from "./NumberInput.vue";

export default {
  components: {
    agroforestry: Agroforestry,
    "number-input": NumberInput,
  },
  data() {
    return {
      statistics: new Statistics(50),
      settings: {
        latitude: 53,
        timeOfDay: 12,
        day: 180,
        leafGrowth: 0.7,
      },
      settingsLayout: [
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
    };
  },
};
</script>

<style lang="scss" scoped></style>
