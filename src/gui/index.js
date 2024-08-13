import { createApp } from 'vue'
import GUI from "./GUI.vue";
import "bootstrap";
import "bootstrap-icons/font/bootstrap-icons.css";

import "./style.scss";

const app = createApp(GUI);
app.mount("#app");
