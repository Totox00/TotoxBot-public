const prefixes = require("../Data/client.json").prefixes;

async function messageHandler(target, sender, perms, msg, raw, platform) {
  // Prefix
  let content;
  prefixes.forEach((current) => {
    if (msg.substring(0, current.length) == current) {
      content = msg.substring(current.length);
    }
  });
  if (!content) {
    return false;
  }

  // Args
  const args = content.trim().split(/ +/);

  // command name
  let commandName = args.shift().toLowerCase();
  commandName = await this.sql.convertAlias(commandName);

  // check if command is valid
  if (!this.commands.has(commandName)) {
    return false;
  }
  if (!(await this.sql.isAvailable(target, commandName))) {
    return false;
  }

  // get group
  const group = await this.sql.getGroup(target, commandName);

  // fetch command
  const command = this.commands.get(commandName);

  // check for arguments and permissions
  if (command.args > args) {
    return false;
  }
  if (command.perms && !perms[command.perms]) {
    return false;
  }

  // cooldown
  if (!perms.vip && (await this.cooldown(target, commandName, platform))) {
    return false;
  }

  // Execute command
  try {
    const response = await command.execute(
      group,
      sender,
      perms,
      args,
      content,
      raw,
      platform
    );
    this.log(`Executed command ${commandName}`);
    if (response && response.hasOwnProperty("type")) {
      response.content = await this.resolveMessage(response.content);
    }
    this.log(response);
    return response;
  } catch (error) {
    console.error(error);
    this.log(`There was an error trying to execute command ${commandName}`);
    return false;
  }
}

module.exports = { messageHandler };
