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
  replyTo?: number;
  type: string;
  data?: any;
};

export type MessageListener = (data: any, message: Message) => void;

export default class MessageHandler {
  private __self: Worker;
  private listeners: { [key: string]: MessageListener[] } = {};
  private __nextMesageID = (() => {
    let messageID = inWorker() ? 1 : 0;
    return () => (messageID += 2);
  })();

  constructor(self: Worker) {
    this.__self = self;
    this.initSelf();
  }

  changeWorker(self: Worker) {
    this.terminate();
    this.__self = self;
    this.initSelf();
  }

  private initSelf() {
    this.__self.addEventListener("message", (event: MessageEvent<Message>) => {
      const message = event.data;

      const listeners = this.listeners[message.type];
      if (listeners && listeners.length > 0)
        listeners.forEach((l) => l(message.data, message));
      else console.error("Unhandled message", message);
    });
  }

  terminate() {
    this.__self.terminate();
  }

  addMessageListener(type: string, listener: MessageListener): void {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  removeMessageListener(type: string, listener: MessageListener): void {
    if (this.listeners[type])
      this.listeners[type] = this.listeners[type].filter((v) => v !== listener);
  }

  async onReply(message: Message): Promise<Message> {
    return new Promise((resolve) => {
      const messageListener: MessageListener = (_, incomming) => {
        if (incomming.replyTo === message.messageID) {
          this.removeMessageListener("reply", messageListener);
          resolve(incomming);
        }
      };
      this.addMessageListener("reply", messageListener);
    });
  }

  reply(
    originalMessage: Message,
    data: any,
    transfer: Transferable[] = []
  ): Message {
    const message: Message = {
      type: "reply",
      replyTo: originalMessage.messageID,
      messageID: this.__nextMesageID(),
      data: data,
    };
    this.__self.postMessage(message, transfer);
    return message;
  }

  postMessage(type: string, data?: any, transfer: Transferable[] = []): Message {
    const message: Message = {
      type: type,
      messageID: this.__nextMesageID(),
      data: data,
    };
    this.__self.postMessage(message, transfer);
    return message;
  }
}
