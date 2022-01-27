<template lang="pug">
div
  ul.nav.nav-tabs.px-2.pt-2
    li.nav-item(v-for="item, i of items")
      button.nav-link(
        type="button",
        :class="{ active: i == selected }",
        @click.prevent="selected = i"
      )
        slot(name="title", v-bind:item="item")
  template(v-for="item, i of items")
    slot(:name="item.slot", v-if="i == selected")
</template>

<script lang="ts">
export default {
  props: {
    items: Array,
  },
  data() {
    return {
      selected: 0,
    };
  },
};
</script>
