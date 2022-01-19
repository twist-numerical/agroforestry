<template lang="pug">
.col-form-label.col-form-label-sm.text-end(
  :class="{ 'has-info': !!info }",
  v-bind="info ? { title: info } : {}",
  ref="name"
)
  slot
</template>

<script lang="ts">
import { Tooltip } from "bootstrap";

export default {
  props: {
    info: {
      type: String,
      default: "",
    },
  },
  mounted() {
    this.tooltip = null;
    this.prevElement = null;
    this.prevInfo = null;
    this.updateTooltip();
  },
  methods: {
    updateTooltip() {
      const nameElement = this.$refs.name;
      if (nameElement === this.prevElement && this.info == this.prevInfo)
        return;

      this.prevElement = nameElement;
      this.prevInfo = this.info;
      if (this.tooltip) this.tooltip.dispose();
      this.tooltip = null;
      if (this.info) {
        this.tooltip = new Tooltip(nameElement, {
          popperConfig: (defaultConfig) => {
            return {
              ...defaultConfig,
              placement: "bottom",
              modifiers: defaultConfig.modifiers
                .filter((m) => m.name != "flip" && m.name != "preventOverflow")
                .concat([
                  {
                    name: "preventOverflow",
                    options: {
                      boundary: "clippingParents",
                      padding: 10,
                    },
                  },
                ]),
            };
          },
        });
      }
    },
  },
  updated() {
    this.updateTooltip();
  },
  destroyed() {
    if (this.tooltip) this.tooltip.dispose();
    this.tooltip = null;
  },
};
</script>

<style lang="scss" scoped>
@import "./style.scss";

.has-info:after {
  content: "?";
  font-size: 80%;
  display: inline-block;
  position: relative;
  bottom: 0.5em;
  text-align: center;
}
</style>
