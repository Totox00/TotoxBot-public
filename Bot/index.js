const { botClient } = require("./client.js");

async function main() {
  await botClient.addCommandDir();
  await botClient.connect();

  botClient.discord.guilds
    .fetch("693622493176660028")
    .then((guild) => guild.channels.fetch("694671651429679234"))
    .then((channel) => channel.messages.fetch());

  // Reaction autoremove
  botClient.discord.on("messageReactionAdd", (messageReaction, user) => {
    if (
      !reactionAutoremoveMessages.hasOwnProperty(
        messageReaction.message.guildId
      )
    ) {
      return;
    }
    if (
      !reactionAutoremoveMessages[
        messageReaction.message.guildId
      ].hasOwnProperty(messageReaction.message.channelId)
    ) {
      return;
    }
    if (
      !reactionAutoremoveMessages[messageReaction.message.guildId][
        messageReaction.message.channelId
      ].includes(messageReaction.message.id)
    ) {
      return;
    }
    if (immuneReactions.includes(messageReaction._emoji.id)) {
      return;
    }
    messageReaction.users.remove(user);
    botClient.log(`Removed reaction from ${messageReaction.message.id}`);
  });
}

const reactionAutoremoveMessages = {
  "693622493176660028": {
    "694671651429679234": ["896618867315605614"],
  },
};

const immuneReactions = ["694630654129733632"];

main();
