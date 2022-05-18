async function updateCommand(client, command, channel, set) {
  client.sql.connection.query(
    "UPDATE totoxbot.groups SET active = ? WHERE channel = ? AND command = ?",
    [set, channel, command]
  );
  return true;
}

async function getNewGroupID(client) {
  const [rows, fields] = await client.connection.query(
    "SELECT groupid FROM totoxbot.groups ORDER BY groupid DESC"
  );
  return rows[0].groupid + 1;
}

async function addChannel(client, channel, group) {
  const commandInfo = await client.getCommandInfo();
  for (const [name, active] of commandInfo) {
    client.sql.connection.query(
      "INSERT INTO totoxbot.groups (channel, command, groupid, active) VALUES (?, ?, ?, ?);",
      [channel, name, group, active]
    );
  }
  return true;
}

async function addCommand(client, name) {
  const channelList = await client.getChannelList();
  client.sql.connection.query(
    "INSERT INTO totoxbot.commands (name, hidden, active_default) VALUES (?, ?, false);",
    [name, true]
  );
  channelList.forEach(async (currentChannel) => {
    const defaultChannelGroup = await client.sql.getGroup(
      currentChannel,
      "sudo"
    );
    client.sql.connection.query(
      "INSERT INTO totoxbot.groups (channel, command, groupid) VALUES (?, ?, ?);",
      [currentChannel, name, defaultChannelGroup]
    );
  });
  return true;
}

module.exports = {
  commands: [
    {
      name: "sudo",
      category: "admin",
      description: "sudo commands",
      args: 1,
      usage: "<sudo>",
      perms: "admin",
      async execute(target, sender, perms, args, msg, raw, platform) {
        // sudo command <subcommand> <...>
        if (args.length >= 3 && args[0].toLowerCase() == "command") {
          const commandList = await this.botClient.getCommandList();
          let channel;
          if (platform == "discord" || platform == "slashCommand") {
            channel = raw.channelId;
          } else if (platform == "twitch") {
            channel = raw.target;
          }

          // sudo command copy <group>
          if (args[1].toLowerCase() == "copy") {
            commandList.forEach(async (currentCommand) => {
              const [rows, fields] = await this.botClient.sql.connection.query(
                "SELECT active FROM totoxbot.groups WHERE channel = ? AND command = ?",
                [args[2], currentCommand]
              );
              updateCommand(
                this.botClient,
                currentCommand,
                channel,
                rows[0].active
              );
            });
            return {
              type: "reply",
              content: `Command settings copied from ${args[2]}`,
            };
          }

          let command = args[2];

          // sudo command init <name>
          if (args.length >= 3 && args[1].toLowerCase() == "init") {
            const response = await addCommand(
              this.botClient,
              args[2].toLowerCase()
            );
            if (response) {
              return { type: "reply", content: `Command ${command} initiated` };
            }
          }

          // handle aliases
          command = await this.botClient.sql.convertAlias(command);

          // ignore if not command
          if (!commandList.includes(command)) {
            return false;
          }

          // sudo command enable <name>
          if (args[1].toLowerCase() == "enable") {
            const response = await updateCommand(
              this.botClient,
              command,
              channel,
              true
            );
            if (response) {
              return { type: "reply", content: `Command ${command} enabled` };
            }
          }

          // sudo command disable <name>
          else if (args[1].toLowerCase() == "disable") {
            const response = await updateCommand(
              this.botClient,
              command,
              channel,
              false
            );
            if (response) {
              return { type: "reply", content: `Command ${command} disabled` };
            }
          }
        }

        // sudo channel <subcommands> <...>
        else if (args.length >= 2 && args[0].toLowerCase() == "channel") {
          if (platform != "discord") {
            return false;
          }
          const channel = raw.channelId;

          // sudo channel add <group>
          if (args[1].toLowerCase() == "add") {
            let groupIDToAdd;
            // new group
            if (args.length == 2 || args[2].toLowerCase() == "new") {
              groupIDToAdd = await getNewGroupID(this.botClient);
            } else {
              groupIDToAdd = Number(args[2]);
            }
            const response = await addChannel(
              this.botClient,
              channel,
              groupIDToAdd
            );
            if (response) {
              return {
                type: "reply",
                content: `Channel ${channel} added to group ${groupIDToAdd}`,
              };
            }
          }
        }

        // sudo join <twitchchannel>
        else if (args.length >= 2 && args[0].toLowerCase() == "join") {
          const channel = "#" + args[1];
          let groupIDToAdd;
          // new group
          if (args.length == 2 || args[2].toLowerCase() == "new") {
            groupIDToAdd = await getNewGroupID(this.botClient);
          } else {
            groupIDToAdd = Number(args[2]);
          }
          const response = await addChannel(
            this.botClient,
            channel,
            groupIDToAdd
          );
          if (response) {
            this.botClient.twitch.join(channel);
            return {
              type: "reply",
              content: `Channel ${channel} added to group ${groupIDToAdd}`,
            };
          }
        }

        // sudo link <userid?>
        else if (args.length >= 3 && args[0].toLowerCase() == "link") {
          if (this.botClient.sql.linkUser(args[1], args[2])) {
            return {
              type: "reply",
              content: `Successfully linked accounts ${args[1]} and ${args[2]}`,
            };
          } else {
            return false;
          }
        }

        return false;
      },
    },
  ],
  applicationCommands: [
    {
      name: "sudo",
      type: 1,
      description: "Handles bot admin configuration",
      default_member_permissions: 0,
      options: [
        {
          name: "command",
          description: "Handles command configuration",
          type: 2,
          options: [
            {
              name: "enable",
              description: "Enables a command in the current channel",
              type: 1,
              options: [
                {
                  name: "command",
                  description: "The command to enable",
                  type: 3,
                  required: true,
                },
              ],
            },
            {
              name: "disable",
              description: "Disables a command in the current channel",
              type: 1,
              options: [
                {
                  name: "command",
                  description: "The command to disable",
                  type: 3,
                  required: true,
                },
              ],
            },
            {
              name: "copy",
              description: "Copies command configuration from another channel",
              type: 1,
              options: [
                {
                  name: "channel",
                  description: "The channel to copy from",
                  type: 3,
                  required: true,
                },
              ],
            },
            {
              name: "init",
              description: "Initiates a command",
              type: 1,
              options: [
                {
                  name: "command",
                  description: "The name of the command to initiate",
                  type: 3,
                  required: true,
                },
              ],
            },
          ],
        },
        {
          name: "channel",
          description: "Handles channel configuration",
          type: 2,
          options: [
            {
              name: "add",
              description: "Add a Discord channel to the bot",
              type: 1,
              options: [
                {
                  name: "channelid",
                  description:
                    "The ID of the channel to be added, omit to add current channel",
                  type: 7,
                  required: false,
                  channel_types: [0, 11],
                },
                {
                  name: "group",
                  description:
                    "The ID of the group the channel should be added to, omit to add to a new group",
                  type: 4,
                  required: false,
                },
              ],
            },
            {
              name: "join",
              description: "Add a Twitch channel to the bot",
              type: 1,
              options: [
                {
                  name: "channelname",
                  description: "The name of the channel to be added",
                  type: 3,
                  required: true,
                },
                {
                  name: "group",
                  description:
                    "The ID of the group the channel should be added to, omit to add to a new group",
                  type: 4,
                  required: false,
                },
              ],
            },
          ],
        },
        {
          name: "user",
          description: "Handles user configuration",
          type: 2,
          options: [
            {
              name: "link",
              description: "Forcefully link two accounts",
              type: 1,
              options: [
                {
                  name: "discordid",
                  description: "The ID of the linked Discord account",
                  type: 3,
                  required: true,
                },
                {
                  name: "twitchid",
                  description: "The ID of the linked Twitch account",
                  type: 3,
                  required: true,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
