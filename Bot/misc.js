const timezone = require("../Data/client.json").timezone;

// Log file
const fs = require("fs");
const util = require("util");
const dateObject = new Date();
const year = dateObject.getFullYear();
const month = `0${dateObject.getMonth() + 1}`.slice(-2);
const date = `0${dateObject.getDate()}`.slice(-2);
const logFile = fs.createWriteStream(`../Logs/${year}-${month}-${date}.log`, {
  flags: "a",
});
const logStdout = process.stdout;

const log = function (data) {
  logFile.write(timestamp() + " " + util.format(data) + "\n");
  logStdout.write(timestamp() + " " + util.format(data) + "\n");
};

const timestamp = function () {
  const hours = `0${Math.floor(Date.now() / 3600000 + timezone) % 24}`.slice(
    -2
  );
  const minutes = `0${Math.floor(Date.now() / 60000) % 60}`.slice(-2);
  const seconds = `0${Math.floor(Date.now() / 1000) % 60}`.slice(-2);
  const millis = `00${Date.now() % 1000}`.slice(-3);
  return `[${hours}:${minutes}:${seconds}:${millis}]`;
};

// Returns false if command is on cooldown, and true otherwise
async function cooldown(target, commandName) {
  const cooldown = await this.sql.getCooldown(commandName);

  // Get timestamps
  const now = Date.now();
  const timestamps = this.cooldowns.get(commandName);

  // Handle cooldown
  if (timestamps.has(target)) {
    const expirationTime = timestamps.get(target) + cooldown * 1000;
    if (now < expirationTime) {
      this.log(`Command ${commandName} is still on cooldown`);
      return true;
    }
  }

  // Set timeout
  timestamps.set(target, now);
  setTimeout(() => timestamps.delete(target), cooldown * 1000);
  return false;
}

module.exports = { log, timestamp, cooldown };
