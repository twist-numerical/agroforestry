import MessageHandler, { Message, MessageListener } from "./MessageHandler";
import FieldManager, { RenderSettings } from "./FieldManager";
import { FieldConfiguration, TreeConfiguration } from "../data/Field";
import { WebGLRenderer } from "three";
import LeafDensity from "../tree/LeafDensity";
import LeafAreaIndex from "../tree/LeafAreaIndex";
import TreeStore from "../tree/TreeStore";

const messageHandler = new MessageHandler((self as any) as Worker);

function lazy<T>(f: () => T) {
  let v: T | undefined = undefined;
  return (): T => {
    if (v === undefined) v = f();
    return v;
  };
}

function progress(message: string, value: number) {
  messageHandler.postMessage("progress", {
    message: message,
    value: value,
  });
}

const treeStore = new TreeStore();
treeStore.onUpdate((trees) =>
  messageHandler.postMessage("availableTrees", trees)
);

let renderer: WebGLRenderer | undefined = undefined;

const fieldManager = lazy(
  () => new FieldManager(renderer, treeStore, progress)
);
const leafDensity = lazy(() => new LeafDensity(renderer));
const leafAreaIndex = lazy(() => new LeafAreaIndex(renderer));

const messages: { [type: string]: MessageListener } = {
  init(canvas: HTMLCanvasElement) {
    renderer = new WebGLRenderer({ canvas });
  },
  loadField(field: FieldConfiguration) {
    fieldManager().loadField(field);
  },
  resize(data) {
    fieldManager().resize(data.width, data.height, data.pixelRatio);
  },
  availableTrees(_, message) {
    messageHandler.reply(message, treeStore.availableTrees);
  },
  renameTree({ id, newName }: { id: string; newName: string }) {
    treeStore.rename(id, newName);
  },
  deleteTree(id: string) {
    treeStore.deleteTree(id);
  },
  render(data: RenderSettings, message) {
    fieldManager().render(data);
    // fieldManager().drawTexture(leafAreaIndex().target.texture);

    messageHandler.reply(message);
  },
  async uploadTree(data: { name: string; data: ArrayBuffer }, message) {
    await treeStore.addTree(data.name, data.data);

    messageHandler.reply(message);
  },
  year(data, message) {
    const [sunlight, diffuseLight] = fieldManager().calculateYear(
      data.stepSize,
      data.leafGrowth
    );

    messageHandler.reply(message, {
      sunlight,
      diffuseLight,
    });
  },
  moment(data, message) {
    const moment = fieldManager().calculateMoment(
      data.time,
      data.day,
      data.leafGrowth
    );

    messageHandler.reply(message, moment);
  },
  async leafDensity(data: TreeConfiguration, message) {
    messageHandler.reply(
      message,
      await leafDensity().calculate(await treeStore.loadTree(data))
    );
  },
  async leafAreaIndex(data: TreeConfiguration, message) {
    messageHandler.reply(
      message,
      await leafAreaIndex().calculate(await treeStore.loadTree(data))
    );
  },
};

Object.entries(messages).forEach(([type, listener]) =>
  messageHandler.addMessageListener(type, listener)
);
