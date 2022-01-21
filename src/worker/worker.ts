import MessageHandler, { Message, MessageListener } from "./MessageHandler";
import FieldManager, { RenderSettings } from "./FieldManager";
import { TreeParameters } from "../tree/LidarTree";
import { Field } from "../data/Field";

const messageHandler = new MessageHandler((self as any) as Worker);

function progress(message: string, value: number) {
  messageHandler.postMessage("progress", {
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

const messages: { [type: string]: MessageListener } = {
  init(canvas: HTMLCanvasElement) {
    manager = new FieldManager(canvas, progress);
  },
  loadField(field: Field) {
    manager.loadField(field);
  },
  resize(data) {
    requireManager().resize(data.width, data.height, data.pixelRatio);
  },
  render(data: RenderSettings, message) {
    requireManager().render(data);

    messageHandler.reply(message, {});
  },
  year(data, message) {
    const [sunlight, diffuseLight] = requireManager().calculateYear(
      data.stepSize,
      data.leafGrowth
    );

    messageHandler.reply(message, {
      sunlight,
      diffuseLight,
    });
  },
  moment(data, message) {
    const moment = requireManager().calculateMoment(
      data.time,
      data.day,
      data.leafGrowth
    );

    messageHandler.reply(message, moment);
  },
  async leafDensity(data: TreeParameters, message) {
    messageHandler.reply(
      message,
      await requireManager().calculateLeafDensity(data)
    );
  },
  async leafAreaIndex(data: TreeParameters, message) {
    messageHandler.reply(
      message,
      await requireManager().calculateLeafAreaIndex(data)
    );
  },
};

Object.entries(messages).forEach(([type, listener]) =>
  messageHandler.addMessageListener(type, listener)
);
