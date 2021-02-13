import * as THREE from "three";
import {
  Clock,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SphereGeometry,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Plant from "./Plant.js";
import Photosynthesis from "./photosynthesis/Photosynthesis";
import Stats from "stats.js";
import * as dat from "dat.gui";
import loadLidarTreeGeometry from "./loadLidarTreeGeometry.js";
import Sunlight from "./photosynthesis/Sunlight.ts";

const stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const plants = [];
for (let x = -2; x <= 2; ++x)
  for (let y = -2; y <= 2; ++y) {
    const plant = new Plant();
    plants.push(plant);
    scene.add(plant);
    plant.position.set(x, 0, y);
    plant.setSize(0.8 + 0.2 * Math.random());
  }
window.plants = plants;

const camera = new PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  1,
  10000
);

const controls = new OrbitControls(camera, renderer.domElement);

const light = new THREE.AmbientLight(0x404040); // soft white light
scene.add(light);

(async () => {
  const lidarTreeGeometry = new (await loadLidarTreeGeometry())(7);
  const trees = new Group();
  for (let i = -5; i <= 5; ++i) {
    const lidarTree = new Mesh(
      lidarTreeGeometry,
      new MeshPhongMaterial({
        color: "blue",
      })
    );
    lidarTree.position.set(i * 0.8, 0, 4);
    lidarTree.scale.multiplyScalar(0.3);
    lidarTree.rotateY(Math.random() * Math.PI * 2);
    lidarTree.rotateX(-Math.PI / 2);
    trees.add(lidarTree);
  }
  scene.add(trees);
})();

const ground = new Mesh(
  new PlaneGeometry(10, 10),
  new MeshPhongMaterial({
    color: "#8a763a",
    side: THREE.DoubleSide,
  })
);
ground.position.set(0, -0.01, 0);
ground.rotateX(Math.PI / 2);
//scene.add(ground);
scene.background = new Color(0.9, 0.9, 0.9);

//controls.update() must be called after any manual changes to the camera's transform
camera.position.set(-20, 8, 3);
camera.lookAt(0, 0, 0);
scene.add(camera);
controls.update();

const sun = new Sunlight(5, 1024);
sun.position.set(0, 6, 0);
const sunIndicator = new Mesh(
  new SphereGeometry(1, 21, 11),
  new MeshBasicMaterial({ color: "yellow" })
);
sun.add(sunIndicator);

const sunAngle = new Group();
const sunRotation = new Group();

sunRotation.add(sun);
sunAngle.add(sunRotation);
scene.add(sunAngle);

const convertToHours = (seconds) => {
  // 1 h / s
  const hours = 60 * 60 * (seconds / 60 / 60);
  // skip night
  return hours - (hours % 24) / 2;
};

const setTime = (time = undefined) => {
  if (time === undefined) time = getTime();
  sunRotation.rotation.set(2 * ((6 - time) / 24) * Math.PI, 0, 0);
};

const photosynthesis = new Photosynthesis(renderer, 1024);

const drawViewOfSun = (() => {
  const scene = new Scene();
  const planeMaterial = new MeshBasicMaterial();
  planeMaterial.map = sun.target.texture;
  const plane = new Mesh(new PlaneGeometry(2, 2), planeMaterial);
  plane.scale.set(-1, 1, 1);
  scene.add(plane);
  const camera = new OrthographicCamera(-1, 1, -1, 1, -1, 1);
  camera.lookAt(0, 0, 1);
  return () => {
    planeMaterial.map = photosynthesis.summarizer.summaryTargets[0].texture;
    renderer.render(scene, camera);
  };
})();

const settings = {
  speed: 3,
  latitude: 10,
  growSpeed: 0.01, // mm/h
  lightRequired: 1500, // px / m^3
};
const gui = new dat.GUI();
gui.add(settings, "speed", 0, 10, 0.1).name("Speed (h/s)");
gui.add(settings, "latitude", 0, 90, 0.1).name("Latitude (°)");
const folder = gui.addFolder("ODE");
folder.add(settings, "growSpeed", 0, 0.02, 0.001).name("Growth (mm/h)");
folder.add(settings, "lightRequired", 400, 3000, 1).name("Light (px/m³)");
folder.open();

const clock = new Clock();
let secondsCounter = 0;
let lastTime = convertToHours(secondsCounter);
function animate() {
  stats.begin();

  // required if controls.enableDamping or controls.autoRotate are set to true
  controls.update();

  sunAngle.rotation.set(0, 0, (Math.PI / 180) * settings.latitude);
  secondsCounter += settings.speed * clock.getDelta();
  const hours = convertToHours(secondsCounter);
  const timeDiff = hours - lastTime;
  lastTime = hours;
  setTime(hours);
  sunIndicator.visible = true;
  renderer.setScissorTest(false);
  renderer.setViewport(
    0,
    0,
    renderer.domElement.width,
    renderer.domElement.height
  );
  renderer.render(scene, camera);
  sunIndicator.visible = false;

  const photo = photosynthesis.calculate(scene, [sun]);
  window.photo = photo;

  renderer.setScissorTest(true);
  {
    const size = 500;
    renderer.setScissor(0, 0, size, size);
    renderer.setViewport(0, 0, size, size);
  }
  drawViewOfSun();

  stats.end();
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});
