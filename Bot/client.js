const fs = require("fs");
const tmi = require("tmi.js");
const discord = require("discord.js");
const clientInfo = require("../Data/client.json");
const permIds = require("../Data/permIds.json").permIds;
const { log, timestamp, cooldown } = require("./misc.js");
const { messageHandler } = require("./messageHandler.js");
const { SqlClient } = require("./sql.js");
const knownBots = [
  "totoxbot",
  "nightbot",
  "streamelements",
  "streamlabs",
  "mikuia",
  "moobot",
];

const identity = clientInfo.twitch;
const intents = [
  discord.Intents.FLAGS.GUILDS,
  discord.Intents.FLAGS.GUILD_INVITES,
  discord.Intents.FLAGS.GUILD_MESSAGES,
  discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  discord.Intents.FLAGS.DIRECT_MESSAGES,
  discord.Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
];

class BotClient {
  constructor() {
    this.timezone = clientInfo.timezone;
    this.timestamp = timestamp;
    this.log = log;
    this.sql = new SqlClient();
    this.discord = new discord.Client({ intents: intents });
  }

  async connect() {
    this.connection = this.sql.connection;
    this.getCommandList = this.sql.getCommandList;
    this.getCommandInfo = this.sql.getCommandInfo;
    this.getChannelList = this.sql.getChannelList;
    this.getUsername = this.sql.getUsername;
    this.getUserID = this.sql.getUserID;
    this.resolveMessage = this.sql.resolveMessage;

    this.commands = new discord.Collection();
    this.cooldowns = new discord.Collection();
    this.applicationCommands = [];

    this.messageHandler = messageHandler;
    this.cooldown = cooldown;

    const channelList = await this.sql.getTwitchChannelList();
    this.twitch = new tmi.client({ identity: identity, channels: channelList });
    this.twitch.botClient = this;
    this.twitch.on("message", this.onTwitchMessageHandler);
    this.twitch.on("connected", this.onTwitchConnectedHandler);
    this.twitch.connect();

    this.discord.botClient = this;
    this.discord.on("messageCreate", this.onDiscordMessageHandler);
    this.discord.on("interactionCreate", this.onDiscordInteractionHandler);
    this.discord.once("ready", this.onDiscordConnectedHandler);
    this.discord.login(clientInfo.discordToken);

    return true;
  }

  async onTwitchMessageHandler(target, context, msg, self) {
    // ignore if self or other bot
    if (self) {
      return;
    }
    if (knownBots.includes(context.username)) {
      return;
    }

    // get userID
    const userID = await this.botClient.getUserID(
      "twitch",
      context["user-id"],
      context.username
    );

    // log
    this.botClient.log(
      `Recieved input target: ${target}, sender: ${userID}, msg: ${msg}`
    );

    // perms
    const botPerms = await this.botClient.sql.getPerms(userID);
    const perms = {
      bot: botPerms,
      admin: botPerms.admin,
      mod: botPerms.manager,
      vip: botPerms.vip,
    };
    if (context.mod) {
      perms.mod = true;
    } else if (context.badges != null && "broadcaster" in context.badges) {
      perms.mod = true;
    }
    if (perms.mod) {
      perms.vip = true;
    }

    context.target = target;
    context.msg = msg;

    // convert mentions to uuids
    const mentions = msg.match(/\s@[^\s]+/g);

    if (mentions) {
      const replacements = [];
      for (let i = 0; i < mentions.length; i++) {
        const name = mentions[i].substring(2);
        const userID = await this.botClient.sql.convertTwitchMention(name);
        if (userID) {
          replacements.push(` <USERNAME:${userID}>`);
        } else {
          replacements.push(mentions[i]);
        }
      }

      mentions.forEach((current, index) => {
        msg = msg.replace(current, `${replacements[index]}`);
      });
    }

    // pass to shared handler
    const response = await this.botClient.messageHandler(
      target,
      userID,
      perms,
      msg,
      context,
      "twitch"
    );

    // pass to twitch
    if (response && response.hasOwnProperty("type")) {
      if (response.type == "reply") {
        this.say(
          target,
          `${await this.botClient.getUsername(userID)} -> ${response.content}`
        );
      } else if (response.type == "send") {
        this.say(target, `> ${response.content}`);
      } else if (response.type == "message") {
        this.whisper(context.username, response.content);
      }
    }
  }

  async onTwitchConnectedHandler(addr, port) {
    this.botClient.log(`Connected to ${addr}:${port}`);
  }

  async onDiscordMessageHandler(message) {
    // ignore if bot
    if (message.author.bot) {
      return;
    }

    // get userID
    const userID = await this.botClient.getUserID(
      "discord",
      message.author.id,
      message.author.username
    );

    // log
    this.botClient.log(
      `Recieved input guild: ${message.channel.guild.name}, channel: ${message.channel.name}, author: ${message.author.username}, message: ${message.content}`
    );
    if (message.attachments.size > 0) {
      this.botClient.log(message.attachments);
    }

    // perms
    const botPerms = await this.botClient.sql.getPerms(userID);
    const perms = {
      bot: botPerms,
      admin: botPerms.admin,
      mod: botPerms.manager,
      vip: botPerms.vip,
    };
    if (
      permIds[message.guildId] &&
      permIds[message.guildId].includes(message.author.id)
    ) {
      perms.mod = true;
    }
    if (perms.mod) {
      perms.vip = true;
    }

    // convert mentions to uuids
    const mentions = message.content.match(/<@!?[0-9]+>/g);

    if (mentions) {
      const uuids = [];
      for (let i = 0; i < mentions.length; i++) {
        const id = /[0-9]+/.exec(mentions[i])[0];
        const user = await this.botClient.discord.users.fetch(id);
        const name = user.username;
        const userID = await this.botClient.getUserID("discord", id, name);
        uuids.push(userID);
      }

      mentions.forEach((current, index) => {
        message.content = message.content.replace(
          current,
          `<USERNAME:${uuids[index]}>`
        );
      });
    }

    // pass to shared handler
    const response = await this.botClient.messageHandler(
      message.channelId,
      userID,
      perms,
      message.content,
      message,
      "discord"
    );

    // send to discord
    if (response && response.hasOwnProperty("type")) {
      // don't ping @everyone
      response.content = response.content.replaceAll("@everyone", "@​everyone");

      if (response.type == "reply") {
        message.reply(response.content);
      } else if (response.type == "send") {
        message.channel.send(response.content);
      } else if (response.type == "message") {
        message.author.dmChannel.send(response.content);
      }
    }
  }

  async onDiscordInteractionHandler(interaction) {
    // get userID
    const userID = await this.botClient.getUserID(
      "discord",
      interaction.user.id,
      interaction.user.username
    );

    // log
    this.botClient.log(
      `Recieved interaction guild: ${interaction.guild.name}, channel: ${interaction.channel.name}, author: ${interaction.user.username}`
    );
    console.log(interaction.options.data);

    // perms
    const botPerms = await this.botClient.sql.getPerms(userID);
    const perms = {
      bot: botPerms,
      admin: botPerms.admin,
      mod: botPerms.manager,
      vip: botPerms.vip,
    };
    if (
      permIds[interaction.guildId] &&
      permIds[interaction.guildId].includes(interaction.user.id)
    ) {
      perms.mod = true;
    }
    if (perms.mod) {
      perms.vip = true;
    }

    if (!interaction.isCommand()) {
      if (this.botClient.interactionHandlers.has(interaction.data.custom_id)) {
        try {
          this.botClient.interactionHandlers
            .get(interaction.data.custom_id)
            .execute(interaction);
          return true;
        } catch (error) {
          if (error) {
            console.error(error);
          }
        }
        return false;
      }
      return false;
    } else {
      // check if command is valid
      if (
        !(await this.botClient.sql.isAvailable(
          interaction.channelId,
          interaction.commandName
        ))
      ) {
        interaction.reply({
          content: "Command is not available in this channel",
          ephemeral: true,
        });
        return false;
      }

      // get group
      const group = await this.botClient.sql.getGroup(
        interaction.channelId,
        interaction.commandName
      );

      // fetch command
      const command = this.botClient.commands.get(interaction.commandName);

      // check for perms
      if (command.perms && !perms[command.perms]) {
        interaction.reply({
          content: "You do not have the permissions to use this command",
          ephemeral: true,
        });
        return false;
      }

      // temporary fix to parse args
      const args = [];
      if (interaction.hasOwnProperty("options")) {
        for (let i = 0; i < interaction.options.data.length; i++) {
          const option = interaction.options.data[i];
          console.log(option);
          if (
            option.type == "SUB_COMMAND_GROUP" ||
            option.type == "SUB_COMMAND"
          ) {
            args.push(option.name);
            if (option.hasOwnProperty("options")) {
              for (let i = 0; i < option.options.length; i++) {
                const option2 = option.options[i];
                console.log(option2);
                if (option2.type == "SUB_COMMAND") {
                  args.push(option2.name);
                  if (option2.hasOwnProperty("options")) {
                    for (let i = 0; i < option2.options.length; i++) {
                      const option3 = option2.options[i];
                      console.log(option3);
                      if (option3.type == "USER") {
                        // convert mention
                        const user = await this.botClient.discord.users.fetch(
                          option3.value
                        );
                        const name = user.username;
                        const userID = await this.botClient.getUserID(
                          "discord",
                          option3.value,
                          name
                        );
                        args.push(`<USERNAME:${userID}>`);
                      } else {
                        args.push(option3.value);
                      }
                    }
                  }
                } else if (option2.type == "USER") {
                  // convert mention
                  const user = await this.botClient.discord.users.fetch(
                    option2.value
                  );
                  const name = user.username;
                  const userID = await this.botClient.getUserID(
                    "discord",
                    option2.value,
                    name
                  );
                  args.push(`<USERNAME:${userID}>`);
                } else {
                  args.push(option2.value);
                }
              }
            }
          } else if (option.type == "USER") {
            // convert mention
            const user = await this.botClient.discord.users.fetch(option.value);
            const name = user.username;
            const userID = await this.botClient.getUserID(
              "discord",
              option.value,
              name
            );
            args.push(`<USERNAME:${userID}>`);
          } else {
            args.push(option.value);
          }
        }
      }

      const content = args.join(" ");

      this.botClient.log(args);
      console.log(content);

      // execute command
      try {
        const response = await command.execute(
          group,
          userID,
          perms,
          args,
          content,
          interaction,
          "slashCommand"
        );
        this.botClient.log(`Executed command ${interaction.commandName}`);

        // if no response
        if (!response) {
          interaction.reply({
            content: "There was an error trying to execute the command",
            ephemeral: true,
          });
          return false;
        }

        // default ephemeral to false
        if (!response.hasOwnProperty("ephemeral")) {
          response.ephemeral = false;
        }

        // log response
        this.botClient.log(response);

        // if string
        if (typeof response.content == "string") {
          response.content = await this.botClient.resolveMessage(
            response.content
          );
          interaction.reply({
            content: response.content,
            ephemeral: response.ephemeral,
          });
        }

        // if object
        else {
          interaction.reply(response.content);
        }
      } catch (error) {
        interaction.reply({
          content: "There was an error trying to execute the command",
          ephemeral: true,
        });
        console.error(error);
        this.botClient.log(
          `There was an error trying to execute command ${interaction.commandName}`
        );
        return false;
      }
    }
  }

  async onDiscordConnectedHandler() {
    this.botClient.log("Connected to Discord");

    // Send application command data
    this.botClient.applicationCommands.forEach(async (command) => {
      this.application.commands.create(command);
    });
  }

  async addCommand(command, collection = this.commands, depth = 0) {
    if (command.sub.length > depth) {
      if (!collection.has(command.sub[depth])) {
        collection.set(command.sub[depth], new discord.Collection());
        this.addCommand(command, collection.get(command.sub[depth]), depth + 1);
      }
    } else {
      this.log(
        `Loaded command ${command.name} ${command.sub.join(" ")} from ${path}`
      );
      collection.set(command.name[depth], command);
    }
  }

  async addCommandFile(path) {
    const file = require(`../Commands/${path}`);
    if (file.hasOwnProperty("commands")) {
      file.commands.forEach(async (command) => {
        command.botClient = this;
        command.log = this.log;

        // old system
        if (!command.hasOwnProperty("sub")) {
          this.log(`Loaded command ${command.name} from ${path}`);
          this.commands.set(command.name, command);
          this.cooldowns.set(command.name, new discord.Collection());
        }

        // new system
        else {
          if (!this.cooldowns.has(command.name)) {
            this.cooldowns.set(command.name, new discord.Collection());
          }
          this.addCommand(command);
        }
      });
    }
    if (file.hasOwnProperty("applicationCommands")) {
      file.applicationCommands.forEach(async (command) => {
        this.applicationCommands.push(command);
      });
    }
    if (file.hasOwnProperty("interactionHandlers")) {
      file.interactionHandlers.forEach(async (interaction) => {
        this.interactionHandlers.set(
          interaction.custom_id,
          interaction.handler
        );
      });
    }
  }

  async addCommandDir(path = "") {
    const items = await fs.promises.readdir(`../Commands/${path}`);
    items.forEach(async (item) => {
      if (item.endsWith(".js")) {
        this.addCommandFile(path + item);
      } else {
        this.addCommandDir(path + item + "/");
      }
    });
    return true;
  }
}

const botClient = new BotClient();

module.exports = { botClient };
