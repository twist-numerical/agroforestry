<template lang="pug">
svg(:viewBox="`0 0 1 ${aspectRatio}`")
  slot
  g(:transform="`scale(${1/values.length}) translate(0.5 0)`")
    path.graph-path(:d="path" :stroke-width="strokeWidth" fill="none")
  <slot name="overlay" />
</template>

<script lang="ts">
export default {
  props: {
    values: {
      type: Array,
      default: [1, 3, 2, 4, 1],
    },
    ymin: {
      type: Number,
      default: 0,
    },
    ymax: {
      type: Number,
      default: 1,
    },
    aspectRatio: {
      type: Number,
      default: 1,
    },
    strokeWidth: {
      type: Number,
      default: 3,
    },
  },
  computed: {
    path() {
      return (
        "M" +
        this.values
          .map(
            (value: number, index: number) =>
              `${index} ${(1 - (value - this.ymin) / (this.ymax - this.ymin)) *
                this.values.length *
                this.aspectRatio}`
          )
          .join(" ")
      );
    },
  },
};
</script>

<style lang="scss" scoped>
@import "./style.scss";

.graph-path {
  stroke: $primary;
}
</style>
