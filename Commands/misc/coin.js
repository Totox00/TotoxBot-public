const { getRndInteger } = require("../../Modules/misc.js");
const coinFaces = ["heads", "tails"];

module.exports = {
  commands: [
    {
      name: "coin",
      category: "util",
      description: "Flips a coin",
      args: 0,
      usage: "",
      perms: false,
      async execute(target, sender, perms, args, msg, raw, platform) {
        // Get random face
        const resultingFace = coinFaces[getRndInteger(0, 2)];

        // Output to chat
        return { type: "reply", content: `You got a ${resultingFace}` };
      },
    },
  ],
  applicationCommands: [
    {
      name: "coin",
      description: "Flips a coin",
      type: 1,
    },
  ],
};
