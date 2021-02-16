import MessageHandler from "./MessageHandler";
import FieldManager from "./FieldManager";

function sleep(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

const messageHandler = new MessageHandler((self as any) as Worker);

function progress(message: string, value: number) {
  messageHandler.postMessage({
    type: "progress",
    message: message,
    value: value,
  });
}

function progressDone() {
  messageHandler.postMessage({
    type: "progressDone",
  });
}

/*
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
    if (this.photosynthesis.summaryTarget) {
      planeMaterial.map = this.photosynthesis.summaryTarget.texture;
      this.renderer.render(scene, camera);
    }
  };
})();
*/

let manager: FieldManager | undefined = undefined;
function requireManager(): FieldManager {
  if (manager === undefined)
    throw new Error(
      "An action was requested without the required WorkerAction object."
    );
  return manager;
}

function d2r(d: number): number {
  return (d * Math.PI) / 180;
}

const messages = {
  init({ canvas }) {
    manager = new FieldManager(canvas, progress, progressDone);
    manager.loadField({
      field: {
        size: 32.0,
        latitude: 50.5,
        rotation: d2r(180.0),
        inclination: d2r(2),
        inclinationRotation: d2r(45),
      },
      trees: [
        {
          position: [-5, 0],
          height: 12.5,
          leafLength: 0.1,
          leafWidth: 0.2,
          leavesPerTwig: 10,
        },
        {
          position: [0, 1],
          height: 12.5,
          leafLength: 0.1,
          leafWidth: 0.2,
          leavesPerTwig: 10,
        },
      ],
      sensors: {
        size: [4, 4],
        count: [20, 20],
      },
    });
  },
  resize(message: any) {
    requireManager().resize(message.width, message.height, message.pixelRatio);
  },
  render(message: any) {
    requireManager().render(message);

    messageHandler.reply(message, {
      type: "renderDone",
    });
  },
  year(message: any) {
    const data = requireManager().calculateYear(message.stepSize, message);
    console.log(data);

    messageHandler.reply(message, {
      type: "yearDone",
      data: data,
    });
  },
  sunlight(message: any) {
    const data = requireManager().calculateSunlight(message.timesteps, message);

    messageHandler.reply(message, {
      type: "sunlightDone",
      data: data,
    });
  },
};

(async () => {
  for await (const messageEvent of messageHandler.messages()) {
    const action = messages[messageEvent.data.type];

    if (action === undefined) {
      console.error(`The action '${action}' is not available`);
    } else {
      action(messageEvent.data);
    }
  }
})();
