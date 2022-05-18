const { onlyDigits } = require("../../Modules/misc.js");
const discord = require("discord.js");
const jackboxInfo = require("../../Data/jackboxInfo.json");
const ids = jackboxInfo.ids;
const jackboxInputKeywords = jackboxInfo.keywords;

// Returns the name of the game with the given ID
function decodeGameID(id) {
  return jackboxInfo.gameids[id];
}

// Returns the ID of the first game found in the input string, or false if no game was found
function findGameID(arg, input) {
  // Test if ID is inputed
  if (ids.includes(arg)) {
    return arg;
  }

  // Determine ID from input
  let foundGameID = false;
  for (let index = 0; index < ids.length; index++) {
    const currentGame = ids[index];
    jackboxInputKeywords[currentGame].main.forEach(function (
      currentMainKeyword
    ) {
      if (input.includes(currentMainKeyword)) {
        if (jackboxInputKeywords[currentGame].sub.length > 0) {
          jackboxInputKeywords[currentGame].sub.forEach(function (
            currentSubKeyword
          ) {
            if (input.includes(currentSubKeyword)) {
              foundGameID = currentGame;
            }
          });
        } else if (!foundGameID) {
          foundGameID = currentGame;
        }
      }
    });
  }

  return foundGameID;
}

module.exports = {
  commands: [
    {
      name: "jackbox",
      category: "main",
      args: 1,
      perms: false,

      async addGame(game, author, group) {
        const [rows, fields2] = await this.botClient.sql.connection.query(
          "INSERT INTO totoxbot.c_jackbox (groupid, author, game) VALUES (?, ?, ?)",
          [group, author, game, position]
        );
        return rows;
      },

      async removeGame(game, group) {
        const [rows, fields] = await this.botClient.sql.connection.query(
          "DELETE FROM totoxbot.c_jackbox WHERE groupid = ? AND game = ?",
          [group, game]
        );
        return rows;
      },

      async getQueue(group) {
        const [rows, fields] = await this.botClient.sql.connection.query(
          "SELECT game, author FROM totoxbot.c_jackbox WHERE groupid = ? ORDER BY position ASC",
          [group]
        );
        return rows;
      },

      async clearQueue(group, amount) {
        if (!amount) {
          const [rows, fields] = await this.botClient.sql.connection.query(
            "DELETE FROM totoxbot.c_jackbox WHERE groupid = ?",
            [group]
          );
          return rows;
        } else {
          const [rows, fields] = await this.botClient.sql.connection.query(
            "DELETE FROM totoxbot.c_jackbox WHERE groupid = ? ORDER BY position ASC LIMIT ?",
            [group, amount]
          );
          return rows;
        }
      },

      async formatQueue(queue, platform, length = queue.length) {
        let isCut = false;

        if (length > 10) {
          queue = queue.slice(0, 10);
          isCut = true;
        }

        if (platform == "discord" || platform == "slashCommand") {
          embed = new discord.MessageEmbed();

          // Format queue
          let games = "";
          let authors = "";
          for (let i = 0; i < length; i++) {
            const game = decodeGameID(queue[i].game);
            const author = await this.botClient.getUsername(queue[i].author);
            games += "\n" + game;
            authors += "\n" + author;
          }

          // Set embed info
          embed.setTitle("Jackbox queue");
          embed.setColor("#FF00E1");
          embed.addField("Games", games, true);
          embed.addField("Senders", authors, true);

          return {
            type: "reply",
            content: { embeds: [embed], ephemeral: true },
          };
        }

        let send = "";
        // Decode queue
        for (let i = 0; i < length; i++) {
          send += decodeGameID(queue[i].game);
          send += "by ";
          send += await this.botClient.getUsername(queue[i].author);
          send += ", ";
        }

        if (isCut) {
          send += "...";
        } else {
          send = send.slice(0, -3);
        }

        return { type: "reply", content: `The current queue is: ${send}` };
      },

      async execute(group, sender, perms, args, msg, raw, platform) {
        // get queue
        const queue = await this.getQueue(group);

        // jackbox queue
        if (args[0].toLowerCase() == "queue") {
          if (queue.length < 1) {
            return {
              type: "reply",
              content: "The queue is currently empty",
            };
          }
          return await this.formatQueue(queue, platform);
        }

        // jackbox next
        if (args[0].toLowerCase() == "next") {
          // require mod perms
          if (!perms.mod) {
            return false;
          }

          // get amount if specified, default to 1
          let amount = 1;
          if (args.length >= 2 && onlyDigits(args[1])) {
            amount = Number(args[1]);
          }

          const send = await this.formatQueue(queue, platform, amount);

          this.clearQueue(group, amount);

          return send;
        }

        // jackbox remove
        else if (args.length >= 2 && args[0].toLowerCase() == "remove") {
          // Requires at least mod permissions
          if (!perms.mod) {
            return false;
          }

          // Get game code from name
          gameID = findGameID(args[1], content.substring(15).toLowerCase());

          // Reject if game could not be identified
          if (!gameID) {
            return {
              type: "reply",
              content: "Could not identify game",
              ephemeral: true,
            };
          }

          // Confirm suggestion is in queue
          let isInQueue = false;
          for (let i = 0; i < queue.length; i++) {
            if (queue[i].game == gameID) {
              isInQueue = true;
            }
          }
          if (!isInQueue) {
            return {
              type: "reply",
              content: `Game ${decodeGameID(gameID)} not in queue`,
              ephemeral: true,
            };
          }

          // remove from queue
          this.removeGame(gameID, group);

          return {
            type: "reply",
            content: `suggestion ${decodeGameID[gameID]} has been removed from the queue`,
          };
        }

        // jackbox clear
        else if (args[0].toLowerCase() == "clear") {
          // Requires at least mod permissions
          if (!perms.mod) {
            return false;
          }

          // clear amount if specified, default to all
          if (args.length >= 2 && onlyDigits(args[1])) {
            const amount = Number(args[1]);
            this.clearQueue(group, amount);
            this.log(
              `Cleared first ${amount} games from jackbox queue of ${group}`
            );
            return {
              type: "reply",
              content: `Cleared first ${amount} games from queue`,
            };
          } else {
            this.clearQueue(group);
            this.log(`Cleared jackbox queue of ${group}`);
            return {
              type: "reply",
              content: "Cleared queue",
            };
          }
        }

        // jackbox add

        // get gameID
        let gameID;
        if (args[0].toLowerCase() == "add") {
          gameID = findGameID(args[0], content.substring(12).toLowerCase());
        } else {
          gameID = findGameID(args[0], content.substring(8).toLowerCase());
        }

        // Reject if game could not be identified
        if (!gameID) {
          return {
            type: "reply",
            content: "Could not identify game",
            ephemeral: true,
          };
        }

        // Reject if game already in queue
        for (let i = 0; i < queue.length; i++) {
          if (queue[i].game == gameID) {
            return {
              type: "reply",
              content: "Game already in queue",
              ephemeral: true,
            };
          }
        }

        // Get game name from code
        const name = decodeGameID(gameID);

        // Reject if game is blocked
        if (!perms.vip && jackboxInfo.blocked.includes(gameID)) {
          return {
            type: "reply",
            content: `${name} is not good on stream`,
            ephemeral: true,
          };
        }

        // Add suggestion to queue
        this.addGame(gameID, sender, group);
        this.log(`Added ${gameID} by ${sender} to jackbox queue for ${group}`);
        return {
          type: "reply",
          content: `${name} added to queue`,
        };
      },
    },
  ],
  applicationCommands: [
    {
      name: "jackbox",
      description: "Manage voting for jackbox games",
      type: 1,
      options: [
        {
          name: "add",
          description: "Add a game to the queue",
          type: 1,
          options: [
            {
              name: "game",
              description: "What game to add",
              type: 3,
              required: true,
            },
          ],
        },
        {
          name: "next",
          description:
            "Get the next game or games in the queue, and remove them",
          type: 1,
          options: [
            {
              name: "amount",
              description:
                "The amount of games to get from the queue, omit to get 1",
              type: 4,
              required: false,
            },
          ],
        },
        {
          name: "queue",
          description: "Get the current queue of games",
          type: 1,
        },
        {
          name: "remove",
          description: "Remove games from the queue",
          type: 1,
          options: [
            {
              name: "game",
              description: "What game to add",
              type: 3,
              required: true,
            },
          ],
        },
        {
          name: "clear",
          description: "Clear the queue",
          type: 1,
          options: [
            {
              name: "amount",
              description:
                "The amount of games to clear, omit to clear the entire queue",
              type: 3,
              required: false,
            },
          ],
        },
      ],
    },
  ],
};
