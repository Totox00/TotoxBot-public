const tmi = require("tmi.js");
const clientInfo = require("../Twitch/Data/client.json");

const client = new tmi.client(clientInfo.opts);
const timezone = clientInfo.timezone;

function timestamp() {
  const hours = `0${Math.floor(Date.now() / 3600000 + timezone) % 24}`.slice(
    -2
  );
  const minutes = `0${Math.floor(Date.now() / 60000) % 60}`.slice(-2);
  const seconds = `0${Math.floor(Date.now() / 1000) % 60}`.slice(-2);
  const millis = `00${Date.now() % 1000}`.slice(-3);
  return `[${hours}:${minutes}:${seconds}:${millis}]`;
}

module.exports = { client, timezone, timestamp };
