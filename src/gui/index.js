import Vue from "vue";
import GUI from "./GUI.vue";

import "bootstrap/dist/css/bootstrap.css";

new Vue({ render: (createElement) => createElement(GUI) }).$mount("#app");
