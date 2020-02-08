const properties = PropertiesService.getScriptProperties();
const VERIFICATION_TOKEN: string = properties.getProperty("VERIFICATION_TOKEN");

function doPost(e): GoogleAppsScript.Content.TextOutput {
  const postData = JSON.parse(e.postData.getDataAsString());
  if (postData.token !== VERIFICATION_TOKEN) {
    console.warn("Invalid verification token: %s", postData.token);
    throw new Error("Invalid verification token.");
  }

  let res = {};
  switch (postData.type) {
    case "url_verification":
      console.log({
        message: "url_verification called.",
        data: postData.challenge
      });
      res = { challenge: postData.challenge };
      break;
    case "event_callback":
      console.log({ message: "event_callback called.", data: postData });
      if (!isEventIdProceeded(postData.event_id)) {
        res = eventHandler(postData.event);
      } else {
        console.warn({
          message: "event_callback duplicate called.",
          data: postData.event_id
        });
        res = { duplicated: postData.event_id };
      }
      break;
    default:
      console.error({ message: "unknown event called.", data: postData.type });
      res = { "unknown event": postData.type };
      break;
  }

  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function eventHandler(event: string[]) {
  if (event.type === "channel_created") {
    return channelCreated(event);
  }

  console.error(`unsupported data ${event}`);
  return { unsupported: event };
}

const NOTIFICATION_MESSAGE: string =
  properties.getProperty("NOTIFICATION_MESSAGE") ||
  "A public channel created :point_right: ";

function channelCreated(event: string[]) {
  const channel = event.channel;
  const message = `${NOTIFICATION_MESSAGE} ${channelLink(channel)}`;

  postSlack(message);

  return { posted: message };
}

function channelLink(channel: string[]): string {
  return `<##${channel.id}|#${channel.name}>`;
}

function isEventIdProceeded(eventId: string): boolean {
  const cash = CacheService.getScriptCache();
  const prevEventId = cash.get(eventId);
  if (prevEventId) {
    return true;
  } else {
    cash.put(eventId, "proceeded", 60);
    return false;
  }
}

const POST_URL: string = properties.getProperty("INCOMING_WEBHOOKS_URL");
const USER_NAME: string = "new_channel_bot";
const ICON: string = ":new:";

function postSlack(message: string): void {
  const jsonData = {
    username: USER_NAME,
    icon_emoji: ICON,
    text: message
  };

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(jsonData)
  };

  UrlFetchApp.fetch(POST_URL, options);
}
