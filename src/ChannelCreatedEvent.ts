import Channel = require("./Channel");

class ChannelCreatedEvent {
  public type: string;
  public channel: Channel;
}

export = ChannelCreatedEvent;
