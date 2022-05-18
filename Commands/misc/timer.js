// Variables
currentActiveTimerStart = [];
currentActiveTimerLength = [];
currentTimerID = [];
activeCountdowns = [];

for (let i = 0; i < 100; i++) {
  currentActiveTimerStart.push(0);
  currentActiveTimerLength.push(-1);
  currentTimerID.push(null);
  activeCountdowns.push([null, null, null, null, null]);
}

// Stops timer and countdown
function stopTimer(client, target, raw, platform, message) {
  // Stop countdowns
  for (let i = 0; i < 3; i++) {
    if (activeCountdowns[target][i] != null) {
      clearTimeout(activeCountdowns[target][i]);
      activeCountdowns[target][i] = null;
    }
  }

  // Output to chat
  if (platform == "twitch") {
    client.twitch.say(raw.target, message);
  } else if (platform == "discord" || platform == "slashCommand") {
    raw.reply(message);
  }
  client.log(`Stopped timer`);
}

// Outputs current countdown to chat
function sayCountdown(client, target, raw, platform, time, countdownNumber) {
  // Deactivate countdown
  activeCountdowns[target][countdownNumber] = null;

  // Output to chat
  if (platform == "twitch") {
    client.twitch.say(raw.target, `[TIMER] There's ${time} left on the timer`);
  } else if (platform == "discord" || platform == "slashCommand") {
    raw.reply(`[TIMER] There's ${time} left on the timer`);
  }
  client.log(`Countdown sent to chat`);
}

// Starts the timer
function startTimer(client, target, raw, platform, timerLength, message) {
  currentActiveTimerLength[target] = timerLength;
  currentActiveTimerStart[target] = Date.now();
  currentTimerID[target] = setTimeout(
    stopTimer,
    timerLength,
    client,
    target,
    raw,
    platform,
    message
  );
  if (timerLength > 3600000) {
    activeCountdowns[target][4] = setTimeout(
      sayCountdown,
      timerLength - 3600000,
      client,
      target,
      raw,
      platform,
      "1 hour",
      4
    );
  }
  if (timerLength > 900000) {
    activeCountdowns[target][3] = setTimeout(
      sayCountdown,
      timerLength - 900000,
      client,
      target,
      raw,
      platform,
      "15 minutes",
      3
    );
  }
  if (timerLength > 300000) {
    activeCountdowns[target][2] = setTimeout(
      sayCountdown,
      timerLength - 300000,
      client,
      target,
      raw,
      platform,
      "5 minutes",
      2
    );
  }
  if (timerLength > 60000 && timerLength < 3600000) {
    activeCountdowns[target][1] = setTimeout(
      sayCountdown,
      timerLength - 60000,
      client,
      target,
      raw,
      platform,
      "1 minute",
      1
    );
  }
  if (timerLength > 15000 && timerLength < 900000) {
    activeCountdowns[target][0] = setTimeout(
      sayCountdown,
      timerLength - 15000,
      client,
      target,
      raw,
      platform,
      "15 seconds",
      0
    );
  }
}

module.exports = {
  commands: [
    {
      name: "timer",
      category: "util",
      description: "Gives the current time on the timer or starts a new one",
      args: 0,
      usage: "<?option (set/stop)> <;time (in minutes);>",
      perms: false,
      async execute(target, sender, perms, args, msg, raw, platform) {
        // timer stop
        if (args.length >= 1 && args[0] == "stop") {
          // Requires at least mod permissions
          if (!perms) {
            return false;
          }

          // Cancel old timer
          clearTimeout(currentTimerID[target]);
          for (let i = 0; i < 3; i++) {
            if (activeCountdowns[target][i] != null) {
              clearTimeout(activeCountdowns[target][i]);
              activeCountdowns[target][i] = null;
            }
          }

          // Output to chat
          return { type: "reply", content: `Timer stopped` };
        }

        // timer set
        if (args.length >= 2 && (args[0] == "set" || args[0] == "start")) {
          // Requires at least mod permissions
          if (!perms) {
            return false;
          }

          // Only if time is positive
          if (args[1] <= 0) {
            return;
          }

          // Cancel old timer
          clearTimeout(currentTimerID[target]);
          for (let i = 0; i < 3; i++) {
            if (activeCountdowns[target][i] != null) {
              clearTimeout(activeCountdowns[target][i]);
              activeCountdowns[target][i] = null;
            }
          }

          // Start new timer
          // Custom message
          if (msg.length > msg.indexOf("timer set") + 10 + args[1].length) {
            startTimer(
              this.botClient,
              target,
              raw,
              platform,
              args[1] * 60000,
              `[TIMER] ${msg.substring(
                msg.indexOf("timer set") + 11 + args[1].length
              )}`
            );
            return {
              type: "reply",
              content: `Timer set for ${args[1]} minutes`,
            };
          }
          // Default message
          else {
            startTimer(
              this.botClient,
              target,
              raw,
              platform,
              args[1] * 60000,
              `[TIMER] Timer has ended`
            );
            return {
              type: "reply",
              content: `Timer set for ${args[1]} minutes`,
            };
          }
        }

        // Get current timer
        TimeSinceCurrentActiveTimerStart =
          Date.now() - currentActiveTimerStart[target];
        currentTimer =
          currentActiveTimerLength[target] - TimeSinceCurrentActiveTimerStart;
        currentTimerSecondsLeftTotal = Math.floor(currentTimer / 1000);
        currentTimerMinutesLeft = Math.floor(currentTimerSecondsLeftTotal / 60);
        currentTimerSecondsLeft = currentTimerSecondsLeftTotal % 60;

        // Output to chat
        if (currentTimerMinutesLeft > 0) {
          return {
            type: "reply",
            content: `There's ${currentTimerMinutesLeft} minutes and ${currentTimerSecondsLeft} seconds left on the timer`,
          };
        } else {
          return {
            type: "reply",
            content: `There's ${currentTimerSecondsLeft} seconds left on the timer`,
          };
        }
      },
    },
  ],
  applicationCommands: [
    {
      name: "timer",
      description: "Manage a timer",
      type: 1,
      options: [
        {
          name: "start",
          description: "Starts the timer",
          type: 1,
          options: [
            {
              name: "length",
              description: "The length of the timer, in minutes",
              type: 4,
              required: true,
            },
            {
              name: "message",
              description:
                "The message to send when the timer is up, omit to use default",
              type: 3,
              required: false,
            },
          ],
        },
        {
          name: "stop",
          description: "Stops the current timer",
          type: 1,
        },
        {
          name: "current",
          description: "Gets the current timer",
          type: 1,
        },
      ],
    },
  ],
};
