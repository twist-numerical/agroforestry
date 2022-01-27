<template lang="pug">
.drag-drop-region(
  :class="{ dragging: dragging }",
  @drop.prevent.stop="drop",
  @dragenter="dragOver",
  @dragover.prevent="dragOver",
  @dragleave="dragLeave"
)
  .upload-icon
    i.bi.bi-upload
  slot
</template>

<script lang="ts">
export default {
  data() {
    return {
      dragging: false,
      lastOver: 0,
    };
  },
  methods: {
    drop(e: DragEvent) {
      if (e.dataTransfer && e.dataTransfer.files) {
        const files = e.dataTransfer.files;
        for (let i = 0; i < files.length; ++i) {
          this.$emit("file", files[i]);
        }
        this.dragging = false;
      }
    },
    dragOver() {
      this.dragging = true;
      this.lastOver = +new Date();
    },
    dragLeave() {
      const left = +new Date();
      setTimeout(() => {
        if (this.lastOver < left) this.dragging = false;
      }, 100);
    },
  },
};
</script>

<style lang="scss">
.drag-drop-region {
  position: relative;

  & .upload-icon {
    display: none;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.7);
    box-sizing: border-box;
    border: 2px solid black;

    & i {
      font-weight: bold;
      display: block;
      position: absolute;

      font-size: 4em;
      line-height: 1em;
      width: 1em;
      height: 1.4em;
      text-align: center;

      top: calc(50% - 0.7em);
      left: calc(50% - 0.5em);
    }
  }

  &.dragging .upload-icon {
    display: block;
  }
}
</style>
