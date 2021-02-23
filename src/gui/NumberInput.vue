<template lang="pug">
  input.number-input.form-control(
    :class="{invalid: !valid}"
    inputmode="numeric"
    v-model="rawValue"
    @mousemove="mousemove"
    @change="evaluate"
    :style="{'--number-input-value': `${100*ratio}%`}")
</template>

<script lang="ts">
import * as math from "mathjs";

function clamp(value: number, min: number, max: number) {
  return value < min ? min : value > max ? max : value;
}

export function parse(input: string | number) {
  return +clamp(math.evaluate(this.rawValue), this.min, this.max).toFixed(
    this.precision
  );
}

export default {
  props: {
    min: {
      type: Number,
      default: -1,
    },
    max: {
      type: Number,
      default: 1,
    },
    value: {
      type: [Number, String],
      default: 0,
    },
    precision: {
      type: Number,
      default: 2,
    },
    convertToFloat: {
      type: Function,
      default: function(k: number) {
        return (k - this.min) / (this.max - this.min);
      },
    },
    convertFromFloat: {
      type: Function,
      default: function(value: number) {
        return +(this.min + (this.max - this.min) * value).toFixed(this.precision);
      },
    },
    parse: {
      type: Function,
      default: parse,
    },
  },
  created() {
    this.evaluationID = 0;
  },
  data() {
    return {
      rawValue: this.value,
      valid: true,
    };
  },
  computed: {
    inputValue() {
      const evaluationID = ++this.evaluationID;
      try {
        const value = this.parse(this.rawValue);
        this.valid = true;
        return value;
      } catch (error) {
        setTimeout(() => {
          if (evaluationID == this.evaluationID) this.valid = false;
        }, 200);
        return this.rawValue;
      }
    },
    ratio() {
      return clamp(this.convertToFloat(this.inputValue), 0, 1);
    },
  },
  watch: {
    value() {
      if (this.value != this.inputValue) this.rawValue = this.value;
    },
    inputValue() {
      if (this.valid) this.$emit("input", this.inputValue);
    },
  },
  methods: {
    evaluate() {
      this.rawValue = this.inputValue;
    },
    mousemove(e: MouseEvent) {
      if (e.buttons) {
        const target = e.target as HTMLInputElement;
        var x = e.clientX - target.getBoundingClientRect().left; //x position within the element.
        this.rawValue = this.convertFromFloat(
          clamp(x / target.clientWidth, 0, 1)
        );
        e.preventDefault();
      }
    },
  },
};
</script>

<style lang="scss" scoped>
@import "./style.scss";

.number-input {
  position: relative;
  z-index: 3;
  width: 100%;
  display: block;
  background: linear-gradient(
    90deg,
    theme-color(secondary) var(--number-input-value),
    #fff calc(var(--number-input-value) + 0.1%)
  );

  &.invalid {
    color: red;
  }
}
</style>
