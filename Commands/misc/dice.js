const { onlyDigits, getRndInteger } = require("../../Modules/misc.js");

module.exports = {
  commands: [
    {
      name: "dice",
      category: "util",
      description: "Rolls a dice, optionally with a custom number of sides",
      args: 0,
      usage: "<?sides>",
      perms: false,
      async execute(target, sender, perms, args, msg, raw, platform) {
        let num;
        if (args.length >= 1 && onlyDigits(args[0])) {
          num = getRndInteger(1, Number(args[0]) + 1);
        } else {
          num = getRndInteger(1, 7);
        }

        return { type: "reply", content: `You rolled a ${num}` };
      },
    },
  ],
  applicationCommands: [
    {
      name: "dice",
      description: "Rolls a dice",
      type: 1,
      options: [
        {
          name: "sides",
          description: "How many sides the dice has, omit for a 6-sided dice",
          type: 4,
          required: false,
        },
      ],
    },
  ],
};
