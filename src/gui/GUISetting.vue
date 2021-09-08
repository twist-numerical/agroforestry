<template lang="pug">
label.form-label.row
  gui-label.col-4(:info="info") {{ name }}
  .col-8.input-group-sm
    coordinate-input.input-group-sm(
      v-if="type == 'coordinate'",
      v-bind="attributes",
      :value="value",
      @input="onInput"
    )
    select.form-select(
      v-else-if="type == 'select'",
      :value="value",
      @input="onInput"
    )
      option(v-for="option of attributes.options", :value="option.value") {{ option.name }}
    number-input.form-control(
      v-else,
      v-bind="attributes.apply ? attributes(tree) : attributes",
      :value="value",
      @input="onInput"
    )
</template>

<script lang="ts">
import NumberInput from "./NumberInput.vue";
import CoordinateInput from "./CoordinateInput.vue";
import GUILabel from "./GUILabel.vue";

export default {
  components: {
    NumberInput,
    CoordinateInput,
    "gui-label": GUILabel,
  },
  props: {
    name: {
      type: String,
    },
    info: {
      type: String,
    },
    value: {},
    type: {
      type: String,
    },
    attributes: {
      type: [Object],
      default: () => ({}),
    },
  },
  methods: {
    onInput(event) {
      this.$emit("input", event.target ? event.target.value : event);
    },
  },
};
</script>
