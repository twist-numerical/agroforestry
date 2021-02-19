<template lang="pug">
div
  agroforestry(:stats="statistics")
</template>

<script lang="ts">
import Statistics from "./Statistics";
import Agroforestry from "./Agroforestry.vue";

export default {
  components: {
    agroforestry: Agroforestry,
  },
  data() {
    return {
      statistics: new Statistics(50),
    };
  },
};
</script>

<style lang="scss" scoped>
.container {
  color: green;
}
</style>
