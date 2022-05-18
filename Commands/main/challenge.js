const discord = require("discord.js");
const { onlyUppercase, onlyDigits } = require("../../Modules/misc.js");
const { fetchChallengeInfo } = require("../../Modules/nkapi.js");
const modes = require("../../Data/btd6Data.json").difficultyModes;
const types = ["maxRounds", "maxStartingCash", "forbiddenMode"];

const closedQueues = [];

module.exports = {
  commands: [
    {
      name: "challenge",
      category: "main",
      args: 1,
      perms: false,

      async addChallenge(code, author, group) {
        const [rows, fields] = await this.botClient.sql.connection.query(
          "INSERT INTO totoxbot.c_challenge_queue (groupid, code, author) VALUES (?, ?, ?);",
          [group, code, author]
        );
        return rows;
      },

      async removeChallenge(code, group) {
        const [rows, fields] = await this.botClient.sql.connection.query(
          "DELETE FROM totoxbot.c_challenge_queue WHERE groupid = ? AND code = ?;",
          [group, code]
        );
        return rows;
      },

      async complete(code, group) {
        const [rows, fields] = await this.botClient.sql.connection.query(
          "INSERT INTO totoxbot.c_challenge_completed (groupid, code) VALUES (?, ?)",
          [group, code]
        );
        return rows;
      },

      async uncomplete(code, group) {
        const [rows, fields] = await this.botClient.sql.connection.query(
          "DELETE FROM totoxbot.c_challenge_completed WHERE groupid = ? AND code = ?",
          [group, code]
        );
        return rows;
      },

      async checkCompleted(group, code) {
        const [rows, fields] = await this.botClient.sql.connection.query(
          "SELECT * FROM totoxbot.c_challenge_completed WHERE groupid = ? AND code = ?",
          [group, code]
        );
        return rows.length > 0;
      },

      async getQueue(group) {
        const [rows, fields] = await this.botClient.sql.connection.query(
          "SELECT code, author FROM totoxbot.c_challenge_queue WHERE groupid = ? ORDER BY position ASC",
          [group]
        );
        return rows.slice(1);
      },

      async getCurrent(group) {
        const [rows, fields] = await this.botClient.sql.connection.query(
          "SELECT code, author FROM totoxbot.c_challenge_queue WHERE groupid = ? ORDER BY position ASC",
          [group]
        );
        return rows[0];
      },

      async clearQueue(group, amount) {
        if (!amount) {
          const [rows, fields] = await this.botClient.sql.connection.query(
            "DELETE FROM totoxbot.c_challenge_queue WHERE groupid = ?",
            [group]
          );
          return rows;
        } else {
          const [rows, fields] = await this.botClient.sql.connection.query(
            "DELETE FROM totoxbot.c_challenge_queue WHERE groupid = ? ORDER BY position ASC LIMIT ?",
            [group, amount]
          );
          return rows;
        }
      },

      // Returns false if challenge is within limits for channel, and an error message otherwise
      async checkLimits(group, code) {
        // Get challenge limits
        const [rows, fields] = await this.botClient.sql.connection.query(
          "SELECT value, type FROM totoxbot.c_challenge_limits WHERE groupid = ?",
          [group]
        );

        // Check for completed challenges
        if (await this.checkCompleted(group, code)) {
          return "Challenge has already been completed";
        }

        // Get challenge info
        let data;
        try {
          data = await fetchChallengeInfo(code);
        } catch (error) {
          this.log(error);
          return "Challenge could not be found";
        }

        // Handle challenge limits
        for (let i = 0; i < rows.length; i++) {
          switch (types[rows[i].type]) {
            case "maxRounds":
              if (
                data.startRules.endRound - data.startRules.round >=
                rows[i].value
              ) {
                return "Challenge has too many rounds";
              }
              break;
            case "maxStartingCash":
              if (data.startRules.cash > rows[i].value) {
                return "Challenge has too high starting cash";
              }
              break;
            case "forbiddenMode":
              if (data.mode == modes[rows[i].value]) {
                return "Challenge uses a forbidden mode";
              }
              break;
          }
        }
        return false;
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
          let codes = "";
          let authors = "";
          for (let i = 0; i < length; i++) {
            const author = await this.botClient.getUsername(queue[i].author);
            codes += "\n" + queue[i].code;
            authors += "\n" + author;
          }

          // Set embed info
          embed.setTitle("Challenge queue");
          embed.setColor("#FF00E1");
          embed.addField("Games", codes, true);
          embed.addField("Senders", authors, true);

          return {
            type: "reply",
            content: { embeds: [embed], ephemeral: true },
          };
        }

        let send = "";

        // Format queue
        for (let i = 0; i < length; i++) {
          send += queue[i].code;
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

        // challenge queue
        if (args[0].toLowerCase() == "queue") {
          if (queue.length < 1) {
            return {
              type: "reply",
              content: "The queue is currently empty",
            };
          }
          return await this.formatQueue(queue, platform);
        }

        // challenge complete
        else if (args[0].toLowerCase() == "complete") {
          // require mod perms
          if (!perms.mod) {
            return false;
          }

          // challenge complete next
          const current = await this.getCurrent(group);
          if (
            args.length == 1 ||
            args[1].toLowerCase() == "next" ||
            args[1].toUpperCase() == current.code
          ) {
            this.complete(current.code, group);
            this.clearQueue(group, amount);

            return {
              type: "reply",
              content: `The next challenge is ${
                queue[0].code
              } by ${await this.botClient.getUsername(
                queue[0].author
              )}, updated current challenge and marked as complete`,
            };
          } else {
            const code = args[1].toUpperCase();

            // Remove from queue if present
            let isInQueue = false;
            for (let i = 0; i < queue.length; i++) {
              if (queue[i].code == code) {
                isInQueue = true;
              }
            }
            if (isInQueue) {
              this.removeChallenge(code, group);
            }

            this.complete(code, group);
            return {
              type: "reply",
              content: `Challenge ${code} marked as completed`,
            };
          }
        }

        // challenge uncomplete
        else if (args.length >= 2 && args[0].toLowerCase() == "uncomplete") {
          const code = args[1].toUpperCase();

          this.uncomplete(code, group);
          return {
            type: "reply",
            content: `Challenge ${code} marked as not completed`,
          };
        }

        // challenge next
        if (args[0].toLowerCase() == "next") {
          // require mod perms
          if (!perms.mod) {
            return false;
          }

          this.clearQueue(group, 1);

          return {
            type: "reply",
            content: `The next challenge is ${
              queue[0].code
            } by ${await this.botClient.getUsername(
              queue[0].author
            )}, updated current challenge`,
          };
        }

        // challenge current
        if (args[0].toLowerCase() == "current") {
          const current = await this.getCurrent(group);
          // Output to chat
          return {
            type: "reply",
            content: `The curent challenge is ${current.code}`,
            ephemeral: true,
          };
        }

        // challenge close
        if (args[0].toLowerCase() == "close") {
          if (!closedQueues.includes(group)) {
            closedQueues.push(group);
          }
          return {
            type: "reply",
            content: "Closed queue",
          };
        }

        // challenge open
        if (args[0].toLowerCase() == "open") {
          for (let i = 0; i < closedQueues.length; i++) {
            if (closedQueues[i] == group) {
              closedQueues.splice(i, 1);
            }
          }
          return {
            type: "reply",
            content: "Opened queue",
          };
        }

        // challenge remove
        else if (args.length >= 2 && args[0].toLowerCase() == "remove") {
          // Requires at least mod permissions
          if (!perms.mod) {
            return false;
          }

          const code = args[1].toUpperCase();

          // Confirm challenge is in queue
          let isInQueue = false;
          for (let i = 0; i < queue.length; i++) {
            if (queue[i].code == code) {
              isInQueue = true;
            }
          }
          if (!isInQueue) {
            return {
              type: "reply",
              content: `Challenge ${code} not in queue`,
              ephemeral: true,
            };
          }

          // remove from queue
          this.removeChallenge(code, group);

          return {
            type: "reply",
            content: `Challenge ${code} has been removed from the queue`,
          };
        }

        // challenge clear
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
              `Cleared first ${amount} challenges from challenge queue of ${group}`
            );
            return {
              type: "reply",
              content: `Cleared first ${amount} challenges from queue`,
            };
          } else {
            this.clearQueue(group);
            this.log(`Cleared challenge queue of ${group}`);
            return {
              type: "reply",
              content: "Cleared queue",
            };
          }
        }

        // challenge add

        // Reject if queue is closed
        if (closedQueues.includes(group)) {
          return {
            type: "reply",
            content: "Queue is closed",
            ephemeral: true,
          };
        }

        // Get code
        let code = args[0].toUpperCase();
        if (args[0].toLowerCase() == "add") {
          code = args[1].toUpperCase();
        }

        // Reject challenge if the code is not 7 characters or contains non-letter characters
        if (!(code.length == 7 && onlyUppercase(code))) {
          return {
            type: "reply",
            content: `Invalid code`,
            ephemeral: true,
          };
        }

        // Reject challenge if already in queue
        for (let i = 0; i < queue.length; i++) {
          if (queue[i].code == code) {
            return {
              type: "reply",
              content: `Challenge ${code} is already in queue`,
              ephemeral: true,
            };
          }
        }

        // Check for disallowed challenges
        const limitCheck = await this.checkLimits(group, code);
        if (!perms.vip && limitCheck) {
          return {
            type: "reply",
            content: limitCheck,
            ephemeral: true,
          };
        }

        // Add challenge to queue
        this.addChallenge(code, sender, group);
        this.log(
          `Added ${code} by <USERNAME:${sender}> to challenge queue for ${group}`
        );

        return {
          type: "reply",
          content: `Your challenge ${code} has been added to the queue`,
        };
      },
    },
  ],
  applicationCommands: [
    {
      name: "challenge",
      description: "Manages a challenge queue for btd6",
      type: 1,
      dm_permission: false,
      options: [
        {
          name: "add",
          description: "Adds a challenge to the queue",
          type: 1,
          options: [
            {
              name: "challenge",
              description: "The code for your challenge",
              type: 3,
              required: true,
            },
          ],
        },
        {
          name: "remove",
          description: "Removes a challenge from the queue",
          type: 1,
          options: [
            {
              name: "challenge",
              description: "The code for the challenge to remove",
              type: 3,
              required: true,
            },
          ],
        },
        {
          name: "queue",
          description: "Shows the current queue of challenges",
          type: 1,
        },
        {
          name: "next",
          description:
            "Shows the next challenge in the queue, removes it, and sets it as the current challenge",
          type: 1,
        },
        {
          name: "current",
          description: "Shows the current challenge",
          type: 1,
        },
        {
          name: "complete",
          description: "Marks a challenge as completed",
          type: 1,
          options: [
            {
              name: "code",
              description:
                "The code for the challenge to be marked as completed, omit to complete the current challenge",
              type: 3,
              required: false,
            },
          ],
        },
        {
          name: "uncomplete",
          description: "Marks a challenge as not completed",
          type: 1,
          options: [
            {
              name: "code",
              description:
                "The code for the challenge to be marked as not completed",
              type: 3,
              required: true,
            },
          ],
        },
        {
          name: "clear",
          description: "Clears the queue",
          type: 1,
          options: [
            {
              name: "amount",
              description:
                "The amount of challenges to clear, omit to clear the entire queue",
              type: 3,
              required: false,
            },
          ],
        },
        {
          name: "close",
          description: "Prevents future challenges from being added",
          type: 1,
        },
        {
          name: "open",
          description: "Allows future challenges to be added",
          type: 1,
        },
      ],
    },
  ],
};
