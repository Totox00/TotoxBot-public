const bingo = require("../../Modules/btd6bingoBoardGenerator.js");

module.exports = {
  commands: [
    {
      name: "bingoboard",
      category: "main",
      description: "Generates a board for btd6 bingo",
      args: 0,
      usage: "",
      perms: false,
      async execute(target, sender, perms, args, msg, raw, platform) {
        if (platform != "discord") {
          return;
        }
        board = bingo.boardGen();
        return {
          type: "reply",
          content: board,
        };
      },
    },
  ],
  applicationCommands: [
    {
      name: "bingoboard",
      description: "Generates a board for btd6 bingo",
      type: 1,
    },
  ],
};
