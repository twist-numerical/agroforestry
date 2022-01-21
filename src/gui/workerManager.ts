import MessageHandler, { Message } from "../worker/MessageHandler";

function newWorker() {
  return new Worker("../worker/worker.ts");
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
