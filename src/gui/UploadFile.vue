<template lang="pug">
label
  input.visually-hidden(type="file" @change="fileUpload" :accept="accept")
  slot
</template>

<script lang="ts">
export default {
  props: {
    accept: {
      type: String,
      default: "*",
    },
  },
  methods: {
    fileUpload(event: any) {
      this.$emit("file", event.target.files[0]);
      event.target.value = [];
    },
  },
};
</script>

<style lang="scss" scoped>
.visually-hidden {
  position: absolute !important;
  height: 1px;
  width: 1px;
  overflow: hidden;
  clip: rect(1px, 1px, 1px, 1px);
}
</style>
