import MessageHandler, { Message } from "../worker/MessageHandler";

function newWorker() {
  return new Worker(
    new URL("../worker/worker.ts", import.meta.url),
    {type: 'module'}
  );
}

class WorkerManager extends MessageHandler {
  constructor() {
    super(newWorker());
  }

  restart() {
    this.changeWorker(newWorker());
  }
}

export default new WorkerManager();
