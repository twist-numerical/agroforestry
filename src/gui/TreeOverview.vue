<template lang="pug">
on-drop(@file="uploadNewTree")
  table.table
    thead
      tr
        th
        th Tree
        th Height
        th Segments
    tbody
      tr(v-for="tree of trees")
        td
          button.btn.btn-outline.p-0(
            type="button",
            v-if="tree.editable",
            @click.prevent="() => deleteTree(tree)"
          )
            i.bi.bi-trash
        td
          input.editable(
            style="width: 100%",
            type="text",
            :disabled="!tree.editable",
            :value="tree.name",
            @change="(e) => rename(tree, e.target.value)"
          )
        td {{ tree.height === undefined ? '?' : tree.height.toFixed(1) + 'm' }}
        td {{ tree.segments === undefined ? '?' : tree.segments }}
      tr(v-for="l of loading")
        td ... {{ l }}
        td
        td
      tr
        td(colspan="3")
          upload-file.btn.btn-link.py-0(@file="uploadNewTree", accept="*") 
            | Upload new tree type
</template>

<script lang="ts">
import workerManager from "./workerManager";
import UploadFile from "./UploadFile.vue";
import OnDrop from "./OnDrop.vue";
import { AvailableTree } from "../data/AvailableTree";

export default {
  components: {
    "upload-file": UploadFile,
    "on-drop": OnDrop,
  },
  props: {
    trees: { type: Array },
  },
  data() {
    return {
      loading: [],
    };
  },
  methods: {
    rename(tree: AvailableTree, newName: string) {
      workerManager.postMessage("renameTree", {
        id: tree.id,
        newName: newName.trim(),
      });
    },
    deleteTree(tree: AvailableTree) {
      workerManager.postMessage("deleteTree", tree.id);
    },
    async uploadNewTree(tree: File) {
      this.loading.push(tree.name);
      const buffer = await tree.arrayBuffer();
      await workerManager.onReply(
        workerManager.postMessage(
          "uploadTree",
          { name: tree.name, data: buffer },
          [buffer]
        )
      );
      this.loading = this.loading.filter((v: string) => v != tree.name);
    },
    onDrop(e: DragEvent) {
      e.stopPropagation();
      e.preventDefault();
      if (
        e.dataTransfer &&
        e.dataTransfer.files &&
        e.dataTransfer.files.length > 0
      ) {
        this.uploadNewTree(e.dataTransfer.files[0]);
      }
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
