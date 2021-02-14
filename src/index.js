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
  Vector3,
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

const viewSize = 30;
const renderSize = 1024;
const sensorGrid = new SensorGrid(20, 5, 20, 5);
scene.add(sensorGrid);

const camera = new PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  1,
  10000
);

const controls = new OrbitControls(camera, renderer.domElement);

const light = new THREE.AmbientLight(0x404040); // soft white light
scene.add(light);

function addPhotosynthesisMaterial(material) {
  material.photosynthesisMaterial = new MeshBasicMaterial({
    side: THREE.DoubleSide,
  });
  return material;
}

const ground = new Mesh(
  new PlaneGeometry(viewSize, viewSize),
  addPhotosynthesisMaterial(
    new MeshPhongMaterial({
      color: "#8a763a",
      side: THREE.DoubleSide,
    })
  )
);
ground.position.set(0, -0.01, 0);
ground.rotateX(Math.PI / 2);
scene.add(ground);
scene.background = new Color(0.9, 0.9, 0.9);

//controls.update() must be called after any manual changes to the camera's transform
camera.position.set(-20, 8, 3);
camera.lookAt(0, 0, 0);
scene.add(camera);
controls.update();

const diffuseLight = new DiffuseLight(51, viewSize, 512);
const diffuseSphere = new PlaneGeometry(2, 2);
diffuseSphere.applyMatrix4(new Matrix4().makeTranslation(0, 0, viewSize / 2));
const diffuseIndicator = new InstancedMesh(
  diffuseSphere,
  new MeshBasicMaterial({
    color: "green",
    side: THREE.DoubleSide,
  }),
  diffuseLight.transforms.length
);
diffuseLight.add(diffuseIndicator);
diffuseLight.transforms.forEach((matrix, i) => {
  diffuseIndicator.setMatrixAt(i, matrix);
});
scene.add(diffuseLight);

const sun = new Sun();

const sunlight = new Sunlight(viewSize, renderSize);
sunlight.lookAt(new Vector3(1, 0, 0));
sun.add(sunlight);
const sunIndicator = new Mesh(
  new SphereGeometry(1, 21, 11),
  new MeshBasicMaterial({ color: "yellow" })
);
sunIndicator.position.set(-10, 0, 0);
sun.add(sunIndicator);

scene.add(sun);

const photosynthesis = new Photosynthesis(renderer, 1024);
window.photosynthesis = photosynthesis;

const drawViewOfSun = (() => {
  const scene = new Scene();
  const planeMaterial = new MeshBasicMaterial();
  planeMaterial.map = sunlight.target.texture;
  const plane = new Mesh(new PlaneGeometry(2, 2), planeMaterial);
  plane.scale.set(-1, 1, 1);
  scene.add(plane);
  const camera = new OrthographicCamera(-1, 1, -1, 1, -1, 1);
  camera.lookAt(0, 0, 1);
  return () => {
    // planeMaterial.map = photosynthesis.summaryTargets[0].texture;
    // planeMaterial.map = diffuseLight.target.texture;
    renderer.render(scene, camera);
  };
})();

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
let secondsCounter = 0;
let leaves = undefined;
function animate() {
  stats.begin();

  controls.update();

  secondsCounter += settings.speed * 60 * 60 * clock.getDelta();
  sun.setLatitude(settings.latitude);
  sun.setSeconds(secondsCounter);

  if (leaves) {
    leaves.material.uniforms.growth.value = settings.leafGrowth;
    leaves.material.photosynthesisMaterial.uniforms.growth.value =
      settings.leafGrowth;
  }

  sunIndicator.visible = true;
  diffuseIndicator.visible = settings.display.diffuseLight;
  renderer.setScissorTest(false);
  renderer.setViewport(
    0,
    0,
    renderer.domElement.width,
    renderer.domElement.height
  );
  renderer.render(scene, camera);
  sunIndicator.visible = false;
  diffuseIndicator.visible = false;

  photosynthesis.calculate(+new Date(), scene, [sunlight]);

  renderer.setScissorTest(true);
  {
    const size = 300;
    renderer.setScissor(0, 0, size, size);
    renderer.setViewport(0, 0, size, size);
  }
  drawViewOfSun();

  stats.end();
  requestAnimationFrame(animate);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});

(async () => {
  const { LidarTree, Leaves } = await loadLidarTree();
  const basisLidarTree = new LidarTree(
    addPhotosynthesisMaterial(
      new MeshPhongMaterial({
        color: "brown",
        side: THREE.DoubleSide,
      })
    )
  );
  const trees = new Group();

  for (let i = 0; i <= 0; ++i) {
    const lidarTree = basisLidarTree.clone();
    leaves = new Leaves({
      leafLength: 0.3,
      leafWidth: 0.05,
      leavesPerTwig: 10,
    });
    leaves.setGrowth(1);
    lidarTree.add(leaves);
    // lidarTree.position.set(i * 2, 0, 4);
    // lidarTree.rotateY(Math.random() * Math.PI * 2);
    // lidarTree.rotateX(-Math.PI / 2);
    trees.add(lidarTree);
  }
  scene.add(trees);

  sunIndicator.visible = false;
  diffuseIndicator.visible = false;
  photosynthesis.calculate(+new Date(), scene, [diffuseLight]);
  const diffuseRapport = photosynthesis.getTimesteps()[0][1];
  console.log(diffuseRapport);
  photosynthesis.clearTimesteps();
  requestAnimationFrame(animate);
})();
