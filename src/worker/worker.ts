import * as THREE from "three";
import {
  Color,
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
  Vector3,
  WebGLRenderer,
  Object3D,
} from "three";
import Photosynthesis from "../photosynthesis/Photosynthesis";
import loadLidarTree from "../photosynthesis/loadLidarTree";
import Sunlight from "../photosynthesis/Sunlight";
import DiffuseLight from "../photosynthesis/DiffuseLight";
import SensorGrid from "../photosynthesis/SensorGrid";
import Sun from "../photosynthesis/Sun";
import MessageHandler from "./MessageHandler";

const messageHandler = new MessageHandler((self as any) as Worker);

function getSetting(object: any, ...args: any[]) {
  const dflt = args[args.length - 1];
  for (const arg of args.slice(0, args.length - 1)) {
    if (object === undefined) return dflt;
    object = object[arg];
  }
  return object;
}

function progress(message: string, value: number) {
  messageHandler.postMessage({
    type: "progress",
    message: "Calculating sunlight",
    value: value,
  });
}

function progressDone() {
  messageHandler.postMessage({
    type: "progressDone",
  });
}

(async () => {
  const { LidarTree, Leaves } = await loadLidarTree();

  type RenderSettings = {
    latitude?: number;
    seconds?: number;
    leafGrowth?: number;
    leafWidth?: number;
    leafLength?: number;
    camera?: number[];
    display?: {
      diffuseLight?: boolean;
    };
  };

  class WorkerAction {
    renderer: WebGLRenderer;
    scene: Scene;
    sun: Sun;
    camera: PerspectiveCamera;
    photosynthesis: Photosynthesis;
    leaves: any;
    sunIndicator: Object3D;
    diffuseIndicator: Object3D;
    sunlight: Sunlight;
    drawViewOfSun: () => void;
    width: number;
    height: number;
    pixelRatio: number;

    resize(settings: { width?: number; height?: number; pixelRatio?: number }) {
      this.width = getSetting(settings, "width", 300);
      this.height = getSetting(settings, "height", 300);
      this.pixelRatio = getSetting(settings, "pixelRatio", 1);
      this.renderer.setSize(this.width, this.height, false);
      this.renderer.setPixelRatio(this.pixelRatio);

      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
    }

    constructor(canvas: HTMLCanvasElement) {
      this.renderer = new WebGLRenderer({
        canvas: canvas,
      });

      const scene = new THREE.Scene();
      this.scene = scene;

      const viewSize = 30;
      const renderSize = 1024;
      const sensorGrid = new SensorGrid(64, 40, 16, 10);
      scene.add(sensorGrid);

      const camera = new PerspectiveCamera(45, 1, 1, 10000);
      this.camera = camera;

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

      camera.position.set(-20, 8, 3);
      camera.lookAt(0, 0, 0);
      camera.updateMatrix();
      camera.matrixAutoUpdate = false;
      scene.add(camera);

      const diffuseLight = new DiffuseLight(51, viewSize, 512);
      const diffuseSphere = new PlaneGeometry(2, 2);
      diffuseSphere.applyMatrix4(
        new Matrix4().makeTranslation(0, 0, viewSize / 2)
      );
      const diffuseIndicator = new InstancedMesh(
        diffuseSphere,
        new MeshBasicMaterial({
          color: "green",
          side: THREE.DoubleSide,
        }),
        diffuseLight.transforms.length
      );
      this.diffuseIndicator = diffuseIndicator;
      diffuseLight.add(diffuseIndicator);
      diffuseLight.transforms.forEach((matrix, i) => {
        diffuseIndicator.setMatrixAt(i, matrix);
      });
      scene.add(diffuseLight);

      const sun = new Sun();
      this.sun = sun;

      const sunlight = new Sunlight(viewSize, renderSize);
      this.sunlight = sunlight;
      sunlight.lookAt(new Vector3(1, 0, 0));
      sun.add(sunlight);
      const sunIndicator = new Mesh(
        new SphereGeometry(1, 21, 11),
        new MeshBasicMaterial({ color: "yellow" })
      );
      this.sunIndicator = sunIndicator;
      sunIndicator.position.set(-10, 0, 0);
      sun.add(sunIndicator);

      scene.add(sun);

      this.photosynthesis = new Photosynthesis(this.renderer);

      const lidarTree = new LidarTree(
        addPhotosynthesisMaterial(
          new MeshPhongMaterial({
            color: "brown",
            side: THREE.DoubleSide,
          })
        )
      );
      this.leaves = new Leaves({
        leafLength: 0.3,
        leafWidth: 0.05,
        leavesPerTwig: 10,
      });
      this.leaves.setGrowth(1);
      lidarTree.add(this.leaves);
      // lidarTree.position.set(i * 2, 0, 4);
      // lidarTree.rotateY(Math.random() * Math.PI * 2);
      // lidarTree.rotateX(-Math.PI / 2);
      scene.add(lidarTree);

      this.drawViewOfSun = (() => {
        const scene = new Scene();
        const planeMaterial = new MeshBasicMaterial();
        planeMaterial.map = sunlight.target.texture;
        const plane = new Mesh(new PlaneGeometry(2, 2), planeMaterial);
        plane.scale.set(-1, 1, 1);
        scene.add(plane);
        const camera = new OrthographicCamera(-1, 1, -1, 1, -1, 1);
        camera.lookAt(0, 0, 1);
        return () => {
          if (this.photosynthesis.blocks.length) {
            planeMaterial.map = this.photosynthesis.blocks[0].summaryTargets[0].texture;
            // planeMaterial.map = diffuseLight.target.texture;
            this.renderer.render(scene, camera);
          }
        };
      })();
    }

    setSettings({ latitude, seconds, leafGrowth, camera }: RenderSettings) {
      if (latitude !== undefined) this.sun.setLatitude(latitude);
      if (seconds !== undefined) this.sun.setSeconds(seconds);
      if (leafGrowth !== undefined) this.leaves.setGrowth(leafGrowth);
      if (camera !== undefined) {
        this.camera.matrix.fromArray(camera, 0);
        this.camera.matrixWorldNeedsUpdate = true;
      }
    }

    calculateSunlight(timesteps: number[], settings: RenderSettings = {}) {
      this.setSettings(settings);

      this.sunIndicator.visible = false;
      this.diffuseIndicator.visible = false;

      timesteps.forEach((time, index) => {
        this.sun.setSeconds(time);
        this.photosynthesis.calculate(time, this.scene, [this.sunlight]);
        progress("Calculating sunlight", index / timesteps.length);
      });
      const results = this.photosynthesis.clearTimesteps();
      progressDone();
      return results;
    }

    render(settings: RenderSettings = {}) {
      this.setSettings(settings);

      this.sunIndicator.visible = true;
      this.diffuseIndicator.visible = getSetting(
        settings,
        "display",
        "diffuseLight",
        true
      );
      this.renderer.setScissorTest(false);
      this.renderer.setViewport(0, 0, this.width, this.height);
      this.renderer.render(this.scene, this.camera);

      this.renderer.setScissorTest(true);
      {
        const size = 300;
        this.renderer.setScissor(0, 0, size, size);
        this.renderer.setViewport(0, 0, size, size);
        this.drawViewOfSun();
      }
    }
  }

  let worker: WorkerAction | undefined = undefined;
  function requireWorker(): WorkerAction {
    if (worker === undefined)
      throw new Error(
        "An action was requested without the required WorkerAction object."
      );
    return worker;
  }

  const messages = {
    init({ canvas }) {
      worker = new WorkerAction(canvas);
    },
    resize(message: any) {
      requireWorker().resize(message);
    },
    render(message: any) {
      requireWorker().render(message);

      messageHandler.reply(message, {
        type: "renderDone",
      });
    },
    sunlight(message: any) {
      const data = requireWorker().calculateSunlight(
        message.timesteps,
        message
      );

      messageHandler.reply(message, {
        type: "sunlightDone",
        data: data,
      });
    },
  };

  for await (const messageEvent of messageHandler.messages()) {
    const action = messages[messageEvent.data.type];

    if (action === undefined) {
      console.error(`The action '${action}' is not available`);
    } else {
      action(messageEvent.data);
    }
  }
})();
