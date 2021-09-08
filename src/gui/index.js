import Vue from "vue";
import GUI from "./GUI.vue";
import "bootstrap";

import "./style.scss";

new Vue({ render: (createElement) => createElement(GUI) }).$mount("#app");
