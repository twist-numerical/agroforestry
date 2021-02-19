import { Clock, PerspectiveCamera } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "stats.js";
import * as dat from "dat.gui";
import MessageHandler from "./worker/MessageHandler";
import { saveAs } from "file-saver";
import { map } from "./functional";

const stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

const worker = new MessageHandler(new Worker("worker/worker.ts"));

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
  day: 0,
  timeOfDay: 12,
  dayAnimation: true,
  display: {
    diffuseLight: false,
  },
};

async function calculateSunlight() {
  const seconds = (settings.day * 24 + settings.timeOfDay) * 60 * 60;

  const messageEvent = await worker.onReply(
    worker.postMessage({
      type: "sunlight",
      ...settings,
      seconds: seconds,
    })
  );

  console.log(messageEvent.data.data);
}

const calculateYearSettings = {
  stepSize: 60,
  async calculateYear() {
    const messageEvent = await worker.onReply(
      worker.postMessage({
        type: "year",
        stepSize: 60 * calculateYearSettings.stepSize,
      })
    );
    const data = messageEvent.data.data;

    saveAs(
      new Blob(
        map(
          ([time, row]) =>
            time + "," + row.map((v) => v.toPrecision(8)).join(",") + "\n",
          data
        ),
        {
          type: "text/csv",
        }
      )
    );
  },
};

const gui = new dat.GUI();
{
  gui.add(settings, "speed", 0, 10, 0.1).name("Speed (h/s)");
  gui.add(settings, "latitude", 0, 90, 0.1).name("Latitude (°)");
  gui.add(settings, "leafGrowth", 0, 1, 0.01).name("Leaf growth");
  gui.add(settings, "day", 0, 365, 1).name("Day");
  gui.add(settings, "timeOfDay", 0, 24, 0.1).name("Time");
  gui.add(settings, "dayAnimation");

  const display = gui.addFolder("display");
  display.add(settings.display, "diffuseLight").name("Diffuse light");
  display.open();

  const calculate = gui.addFolder("Calculate");
  calculate.add({ calculateSunlight }, "calculateSunlight");

  calculate
    .add(calculateYearSettings, "stepSize", 15, 60 * 12, 1)
    .name("Step size (min)");
  calculate.add(calculateYearSettings, "calculateYear").name("Calculate year");
  calculate.open();
}

const clock = new Clock();

async function render() {
  stats.begin();
  controls.update();

  if (settings.dayAnimation) {
    settings.day += 1;
    settings.day %= 365;
    gui.updateDisplay();
  }

  const seconds = (settings.day * 24 + settings.timeOfDay) * 60 * 60;

  const renderSettings = {
    ...settings,
    seconds: seconds,
    camera: camera.matrix.toArray(),
  };

  await worker.onReply(
    worker.postMessage({
      type: "render",
      ...renderSettings,
    })
  );

  stats.end();
  requestAnimationFrame(render);
}

const messages = {
  progress: (message) => {
    document.getElementById("progress-box").style.display = "block";
    document.getElementById("progress-message").innerText = message.message;
    document.getElementById("progress-bar").value = message.value;
  },
  progressDone: () => {
    document.getElementById("progress-box").style.display = "none";
  },
};

(async () => {
  for await (const messageEvent of worker.messages()) {
    const action = messages[messageEvent.data.type];

    if (action === undefined)
      console.error(`The action '${action}' is not available`);
    else action(messageEvent.data);
  }
})();

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
