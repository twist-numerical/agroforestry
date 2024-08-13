<template lang="pug">
.input-group
  .input-group-text x:
  number-input.form-control(
    :min="xbounds[0]",
    :max="xbounds[1]",
    v-model="x",
    v-bind="$attrs"
  )
  .input-group-text y:
  number-input.form-control(
    :min="ybounds[0]",
    :max="ybounds[1]",
    v-model="y",
    v-bind="$attrs"
  )
</template>

<script lang="ts">
import NumberInput from "./NumberInput.vue";

export default {
  inheritAttrs: false,
  components: {
    NumberInput,
  },
  emits: ["update:modelValue"],
  props: {
    xbounds: {
      type: Array,
      default: () => [-1, 1],
    },
    ybounds: {
      type: Array,
      default: () => [-1, 1],
    },
    modelValue: {
      type: Array,
      default: () => [0, 0],
    },
  },
  data() {
    return {
      x: this.modelValue[0],
      y: this.modelValue[1],
    };
  },
  computed: {
    input() {
      return [this.x, this.y];
    },
  },
  watch: {
    modelValue() {
      this.x = this.modelValue[0];
      this.y = this.modelValue[1];
    },
    input() {
      this.$emit("update:modelValue", this.input);
    },
  },
};
</script>
