function inWorker() {
  return (
    // @ts-ignore
    typeof WorkerGlobalScope !== "undefined" &&
    // @ts-ignores
    self instanceof WorkerGlobalScope
  );
}

export type Message = {
  messageID: number;
  isReply: boolean;
  type: string;
};

export default class MessageHandler {
  private __messageQueue: Promise<MessageEvent<Message>>[] = [];
  private __lastResolve: (message: MessageEvent<Message>) => void = undefined;
  private __self: Worker;
  private __nextMesageID: () => number;

  constructor(self: Worker) {
    let messageID = inWorker() ? 1 : 0;
    this.__nextMesageID = () => {
      return (messageID += 2);
    };

    this.__self = self;
    this.pushMessage();
    this.__self.addEventListener("message", (message) => {
      if (!message.data.isReply) this.pushMessage(message);
    });
  }

  private pushMessage(message?: MessageEvent<Message>) {
    const lastResolve = this.__lastResolve;
    this.__messageQueue.push(
      new Promise((resolve, reject) => {
        this.__lastResolve = resolve;
      })
    );

    if (lastResolve !== undefined) lastResolve(message);
  }

  async onReply(message: Message): Promise<MessageEvent<Message>> {
    let resolve: (message: MessageEvent<Message>) => void;
    const promise: Promise<MessageEvent<Message>> = new Promise(
      (_resolve) => (resolve = _resolve)
    );
    const messageListener = (messageEvent: MessageEvent<Message>) => {
      if (messageEvent.data.messageID == message.messageID) {
        resolve(messageEvent);
        this.__self.removeEventListener("message", messageListener);
      }
    };
    this.__self.addEventListener("message", messageListener);
    return promise;
  }

  async *messages(): AsyncGenerator<MessageEvent<Message>> {
    while (true) {
      yield await this.__messageQueue.splice(0, 1)[0];
    }
  }

  reply(
    originalMessage: Message,
    newMessage: any,
    transfer?: Transferable[]
  ): Message {
    newMessage.messageID = originalMessage.messageID;
    newMessage.type = originalMessage.type;
    newMessage.isReply = true;
    this.__self.postMessage(newMessage, transfer);
    return newMessage;
  }

  postMessage(
    message: any & { type: string },
    transfer?: Transferable[]
  ): Message {
    (message as Message).messageID = this.__nextMesageID();
    (message as Message).isReply = false;
    this.__self.postMessage(message, transfer);
    return message as Message;
  }
}
