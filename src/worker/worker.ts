import MessageHandler from "./MessageHandler";
import FieldManager from "./FieldManager";

const messageHandler = new MessageHandler((self as any) as Worker);

function progress(message: string, value: number) {
  messageHandler.postMessage({
    type: "progress",
    message: message,
    value: value,
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

const messages = {
  init({ canvas }) {
    manager = new FieldManager(canvas, progress);
  },
  loadField({ field }) {
    manager.loadField(field);
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
    const [sunlight, diffuseLight] = requireManager().calculateYear(
      message.stepSize,
      message.leafGrowth
    );

    messageHandler.reply(message, {
      type: "yearDone",
      sunlight,
      diffuseLight,
    });
  },
  moment(message: any) {
    const data = requireManager().calculateMoment(
      message.time,
      message.day,
      message.leafGrowth
    );

    messageHandler.reply(message, {
      type: "momentDone",
      data,
    });
  },
  async leafDensity(message: any) {
    messageHandler.reply(message, {
      type: "leafDensityDone",
      density: await requireManager().calculateLeafDensity(
        message.tree
      ),
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
