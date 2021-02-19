import Vue from "vue";
import GUI from "./GUI.vue";

new Vue({ render: (createElement) => createElement(GUI) }).$mount("#app");
