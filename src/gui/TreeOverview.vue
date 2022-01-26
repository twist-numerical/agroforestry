<template lang="pug">
table
  thead
    tr
      th Tree
      th Height
      th Segments
  tbody
    tr(v-for="tree of trees")
      td
        input.editable(
          type="text",
          :disabled="!tree.editable",
          :value="tree.name",
          @change="(e) => rename(tree.name, e.target.value)"
        )
      td {{ tree.height === undefined ? '?' : tree.height.toFixed(1) + 'm' }}
      td {{ tree.segments === undefined ? '?' : tree.segments }}
</template>

<script lang="ts">
import workerManager from "./workerManager";
export default {
  components: {},
  props: {
    trees: { type: Array },
  },
  methods: {
    rename(oldName: string, newName: string) {
      workerManager.postMessage("renameTree", {
        from: oldName,
        to: newName.trim(),
      });
    },
  },
};
</script>

<style lang="scss" scoped>
input.editable {
  border: 0 solid black;

  &:disabled {
    background: transparent;
    color: inherit !important;
  }
}
</style>
