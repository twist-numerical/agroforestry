<template lang="pug">
.row.g-0.position-relative(@mousemove="move", @mouseup="up", ref="sbsContainer")
  .gutter(@mousedown.prevent="down", :style="gutterStyle")
  .h-100(:style="{ width: `${100 * leftWidth}%` }")
    slot(name="left")
  .h-100(:style="{ width: `${100 - 100 * leftWidth}%` }")
    slot(name="right")
</template>

<script lang="ts">
export default {
  props: {
    minWidth: { default: 0.1 },
    maxWidth: { default: 0.9 },
    position: { default: "center" },
  },
  data() {
    return {
      leftWidth: 0.3,
      isDown: false,
    };
  },
  computed: {
    offset() {
      return {
        left: -10,
        right: 10,
        center: 0,
      }[this.position];
    },
    gutterStyle() {
      return {
        left: `calc(${100 * this.leftWidth}% + ${this.offset - 6}px)`,
      };
    },
  },
  methods: {
    down() {
      this.isDown = true;
    },
    validate(width: number): number {
      return Math.min(Math.max(width, this.minWidth), this.maxWidth);
    },
    move(e: MouseEvent) {
      if (this.isDown && e.buttons != 0) {
        e.preventDefault();
        let bbox = this.$refs.sbsContainer.getBoundingClientRect();
        this.leftWidth = this.validate(
          (e.clientX - this.offset - bbox.left) / bbox.width
        );
        this.$nextTick(() => this.$emit("resize"));
      } else {
        this.up();
      }
    },
    up() {
      if (this.isDown) {
        this.isDown = false;
        this.$nextTick(() => this.$emit("resizeDone"));
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.gutter {
  z-index: 100;
  height: calc(min(200px, 30vh));
  position: absolute;
  top: calc(50% - calc(min(200px, 30vh)) / 2);
  width: 12px;

  &::before {
    content: "";
    background: gray;
    border: 3px solid white;
    width: 8px;
    height: 100%;
    display: block;
  }
}
</style>
