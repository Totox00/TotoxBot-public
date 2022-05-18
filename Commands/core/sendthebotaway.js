const adminInfo = require("../../Data/admin.json");

module.exports = {
  commands: [
    {
      name: "sendthebotaway",
      category: "core",
      description: "sends the bot away from the channel",
      args: 0,
      usage: "",
      perms: "mod",
      async execute(target, sender, perms, args, msg, raw, platform) {
        if (platform != "twitch") {
          return;
        }
        this.botClient.twitch.part(target);
        return {
          type: "reply",
          content: `Bot is leaving chat. Please note that this does not remove your channel from the list of channels the bot is present in permanently. If you no longer want the bot in your channel at all, please also send a message to ${adminInfo.twitchName} on twitch or ${adminInfo.discordName} on discord.`,
        };
      },
    },
  ],
};
