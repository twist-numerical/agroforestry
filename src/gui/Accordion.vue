<template lang="pug">
div
  template(v-for="item, i of items")
    div(@click="selected = i")
      slot(name="title", v-bind:item="item")
    slot(:name="item.slot", v-if="i == selected")
</template>

<script lang="ts">
export default {
  props: {
    items: Array,
  },
  data() {
    return {
      selected: 2,
    };
  },
  mounted() {
    console.log(this.$slots);
  },
};
</script>