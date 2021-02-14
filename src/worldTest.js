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
  InstancedMesh,
  SphereGeometry,
  Matrix4,
  DoubleSide,
  BoxGeometry,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Photosynthesis from "./photosynthesis/Photosynthesis";
import Stats from "stats.js";
import * as dat from "dat.gui";
import loadLidarTree from "./photosynthesis/loadLidarTree";
import Sunlight from "./photosynthesis/Sunlight.ts";
import DiffuseLight from "./photosynthesis/DiffuseLight.ts";
import SensorGrid from "./photosynthesis/SensorGrid.ts";
import Sun from "./Sun";

const stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  1,
  10000
);

const controls = new OrbitControls(camera, renderer.domElement);

scene.background = new Color(0.9, 0.9, 0.9);

//controls.update() must be called after any manual changes to the camera's transform
camera.position.set(0, 8, 20);
camera.lookAt(0, 0, 0);
controls.update();

const settings = {
  season: 0,
  latitude: 10,
};
{
  const gui = new dat.GUI();
  gui.add(settings, "season", 0, 1, 0.01).name("Speed (h/s)");
  gui.add(settings, "latitude", 0, 90, 0.1).name("Latitude (°)");
}
scene.add(camera);

const sun = new Sun();
{
  const sunSphere = new Mesh(
    new SphereGeometry(2, 31, 19),
    new MeshBasicMaterial({
      color: "yellow",
    })
  );
  sunSphere.position.set(-10, 0, 0);
  sun.add(sunSphere);
}
scene.add(sun);

{
  const cube = new Mesh(
    new BoxGeometry(2, 2, 2),
    new MeshBasicMaterial({
      color: "green",
    })
  );
  cube.position.set(0, 1.1, 0);
  scene.add(cube);
}
{
  const cube = new Mesh(
    new BoxGeometry(0.5, 0.5, 0.5),
    new MeshBasicMaterial({
      color: "green",
    })
  );
  cube.position.set(2.5, 0, 0);
  scene.add(cube);
}

const ground = new Mesh(
  new PlaneGeometry(4, 4),
  new MeshBasicMaterial({
    color: "brown",
    side: DoubleSide,
  })
);
ground.rotateX(Math.PI / 2);
scene.add(ground);

const clock = new Clock();
function animate() {
  stats.begin();
  const now = 10000 * clock.getElapsedTime(); // seconds in year;
  if (now > 24 * 60 * 60 * 365) return;

  sun.setSeconds(now);
  sun.setLatitude(settings.latitude);

  renderer.render(scene, camera);

  stats.end();
  requestAnimationFrame(animate);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});
requestAnimationFrame(animate);
