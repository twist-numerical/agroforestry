export default class MessageHandler {
  __messageQueue: Promise<any>[] = [];
  __lastResolve: (message: MessageEvent<any>) => void = undefined;
  __self: Worker;

  constructor(self: Worker) {
    this.__self = self;
    this.pushMessage();
    self.addEventListener("message", (message) => {
      this.pushMessage(message);
    });
  }

  private pushMessage(message?: MessageEvent<any>) {
    const lastResolve = this.__lastResolve;
    this.__messageQueue.push(
      new Promise((resolve, reject) => {
        this.__lastResolve = resolve;
      })
    );

    if (lastResolve !== undefined) lastResolve(message);
  }

  async *messages(): AsyncGenerator<MessageEvent<any>> {
    while (true) {
      yield await this.__messageQueue.splice(0, 1)[0];
    }
  }

  postMessage(message: any, transfer?: Transferable[]) {
    this.__self.postMessage(message, transfer);
  }
}
