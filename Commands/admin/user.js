const discord = require("discord.js");
const adminInfo = require("../../Data/admin.json");

const currentlyLinking = new discord.Collection();

module.exports = {
  commands: [
    {
      name: "user",
      category: "admin",
      description: "Handles user configuration",
      args: 1,
      usage: '<"link"><id>',
      perms: false,
      async execute(target, sender, perms, args, msg, raw, platform) {
        // user link
        if (args[0] == "link") {
          const isLinked = await this.botClient.sql.isLinked(sender);
          if (isLinked) {
            return {
              type: "reply",
              content: `Your accounts are already linked. If this is a mistake, please message ${adminInfo.discordName} on Discord.`,
            };
          }

          if (args.length == 1) {
            if (platform == "twitch") {
              return {
                type: "reply",
                content: `To initiate the linking, please use "!user link ${raw["user-id"]}" in a Discord channel the bot is present in.`,
              };
            } else if (platform == "discord") {
              return {
                type: "reply",
                content: `To initiate the linking, please use "!user link ${raw.author.id}" in a Twitch channel the bot is present in.`,
              };
            } else if (platform == "slashCommand") {
              return {
                type: "reply",
                content: `To initiate the linking, please use "!user link ${raw.user.id}" in a Twitch channel the bot is present in.`,
              };
            }
          }

          let discordid;
          let twitchid;
          if (platform == "twitch") {
            discordid = args[1];
            twitchid = raw["user-id"];
          } else if (platform == "discord") {
            discordid = raw.author.id;
            twitchid = args[1];
          } else if (platform == "slashCommand") {
            discordid = raw.user.id;
            twitchid = args[1];
          }
          if (
            currentlyLinking.has(discordid) &&
            currentlyLinking.get(discordid)[0] == twitchid &&
            currentlyLinking.get(discordid)[1] != platform
          ) {
            if (this.botClient.sql.linkUser(discordid, twitchid)) {
              return {
                type: "reply",
                content: `Successfully linked accounts ${discordid} and ${twitchid}`,
              };
            } else {
              return false;
            }
          } else {
            currentlyLinking.set(discordid, [twitchid, platform]);
            if (platform == "twitch") {
              return {
                type: "reply",
                content: `To complete the linking, please use "!user link ${twitchid}" in a Discord channel the bot is present in.`,
              };
            } else if (platform == "discord" || platform == "slashCommand") {
              return {
                type: "reply",
                content: `To complete the linking, please use "!user link ${discordid}" in a Twitch channel the bot is present in.`,
              };
            }
          }
        }
        return false;
      },
    },
  ],
  applicationCommands: [
    {
      name: "user",
      type: 1,
      description: "Handles user configuration",
      options: [
        {
          name: "link",
          description: "Link your Twitch and Discord accounts",
          type: 1,
          options: [
            {
              name: "twitchid",
              description: "The ID of your Twitch account",
              type: 3,
              required: false,
            },
          ],
        },
        {
          name: "config",
          description: "Commands to configure your account settings",
          type: 2,
          options: [
            {
              name: "pronouns",
              description: "Configure what pronouns you use",
              type: 1,
            },
          ],
        },
      ],
    },
  ],
};
