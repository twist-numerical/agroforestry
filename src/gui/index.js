import Vue from "vue";
import GUI from "./GUI.vue";
import "bootstrap";
import "bootstrap-icons/font/bootstrap-icons.css";

import "./style.scss";

new Vue({ render: (createElement) => createElement(GUI) }).$mount("#app");
