import { Clock, PerspectiveCamera } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "stats.js";
import * as dat from "dat.gui";

const stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

const worker = new Worker("worker/worker.ts");

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const pixelRatio = window.devicePixelRatio;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";

  worker.postMessage({
    type: "resize",
    width,
    height,
    pixelRatio,
  });
}
window.addEventListener("resize", resize);

const camera = new PerspectiveCamera();
const controls = new OrbitControls(camera, canvas);
camera.position.set(-20, 8, 3);
camera.lookAt(0, 0, 0);
controls.update();

const settings = {
  speed: 3,
  latitude: 10,
  leafGrowth: 1,
  display: {
    diffuseLight: false,
  },
};
{
  const gui = new dat.GUI();
  gui.add(settings, "speed", 0, 10, 0.1).name("Speed (h/s)");
  gui.add(settings, "latitude", 0, 90, 0.1).name("Latitude (°)");
  gui.add(settings, "leafGrowth", 0, 1, 0.01).name("Leaf growth");
  const display = gui.addFolder("display");
  display.add(settings.display, "diffuseLight").name("Diffuse light");
  display.open();
}

const clock = new Clock();
let seconds = 0;

function render() {
  stats.begin();
  controls.update();

  seconds += settings.speed * 60 * 60 * clock.getDelta();

  const renderSettings = {
    ...settings,
    seconds: seconds,
    camera: camera.matrix.toArray(),
  };
  worker.postMessage({
    type: "sunlight",
    ...renderSettings,
  });
  worker.postMessage({
    type: "render",
    ...renderSettings,
  });
}

const messages = {
  renderDone: () => {
    stats.end();
    requestAnimationFrame(render);
  },
  sunlightDone: () => {},
};

worker.addEventListener("message", (event) => {
  const action = messages[event.data.type];

  if (action === undefined)
    console.error(`The action '${action}' is not available`);
  else action(event.data);
});

const offscreen = canvas.transferControlToOffscreen();
worker.postMessage(
  {
    type: "init",
    canvas: offscreen,
  },
  [offscreen]
);
resize();
render();
