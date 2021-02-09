import * as THREE from "three";
import {
  Mesh,
  MeshPhongMaterial,
  OrthographicCamera,
  Plane,
  PlaneGeometry,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Plant from "./Plant.js";
import Photosynthesis from "./Photosynthesis.js";

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

for (let x = -2; x <= 2; ++x)
  for (let y = -2; y <= 2; ++y) {
    const plant = new Plant();
    scene.add(plant);
    plant.position.set(x, 0, y);
    plant.setGrowth(5 * Math.random());
  }

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  1,
  10000
);

const controls = new OrbitControls(camera, renderer.domElement);

const sun = new THREE.DirectionalLight(0xaaaaaa);
const sunCamera = new OrthographicCamera(-10, 10, -10, 10, -100, 100);
sunCamera.lookAt(0, -1, 0);
sun.add(sunCamera);
scene.add(sun);

const light = new THREE.AmbientLight(0x404040); // soft white light
scene.add(light);

const ground = new Mesh(
  new PlaneGeometry(10, 10),
  new MeshPhongMaterial({
    color: "brown",
    side: THREE.DoubleSide,
  })
);
ground.rotateX(Math.PI / 2);
scene.add(ground);

//controls.update() must be called after any manual changes to the camera's transform
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);
//controls.update();

const photosynthesis = new Photosynthesis(renderer, 1024);

function animate() {
  requestAnimationFrame(animate);

  // required if controls.enableDamping or controls.autoRotate are set to true
  controls.update();

  photosynthesis.calculate(scene, sunCamera);

  renderer.render(scene, camera);
}
animate();
