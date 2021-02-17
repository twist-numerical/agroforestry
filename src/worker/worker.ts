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
        rotation: d2r(0.0),
        inclination: d2r(0),
        inclinationRotation: d2r(45),
      },
      trees: [
        {
          position: [-5, 0],
          leafLength: 0.2,
          leafWidth: 0.2,
          leavesPerTwig: 5,
        },
        {
          position: [0, 1],
          leafLength: 0.05,
          leafWidth: 0.4,
          leavesPerTwig: 10,
        },
      ],
      sensors: {
        size: [32, 32],
        count: [64, 64],
        renderSize: 1024,
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
    const data = requireManager().calculateSunlight(message);

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
