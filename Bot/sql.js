const discord = require("discord.js");
const mysql = require("mysql2/promise");
const mysqlUser = require("../Data/client.json").mysqlUser;

class SqlClient {
  constructor() {
    this.connection = mysql.createPool(mysqlUser);
  }

  async getGroup(channel, command) {
    const [rows, fields] = await this.connection.query(
      "SELECT groupid FROM totoxbot.groups WHERE channel = ? AND command = ?",
      [channel, command]
    );
    if (rows.length > 0) {
      return rows[0].groupid;
    } else {
      return -1;
    }
  }

  async isAvailable(channel, command) {
    if (command == "sudo") {
      return true;
    }
    const [rows, fields] = await this.connection.query(
      "SELECT active FROM totoxbot.groups WHERE channel = ? AND command = ?",
      [channel, command]
    );
    if (rows.length > 0) {
      return rows[0].active;
    }
    return false;
  }

  async getCommandList() {
    const [rows, fields] = await this.connection.query(
      "SELECT name FROM totoxbot.commands"
    );
    const out = [];
    rows.forEach((current) => {
      out.push(current.name);
    });
    return out;
  }

  async getCommandInfo() {
    const [rows, fields] = await this.connection.query(
      "SELECT name, active_default FROM totoxbot.commands"
    );
    const out = new discord.Collection();
    rows.forEach((current) => {
      out.set(current.name, current.active_default);
    });
    return out;
  }

  async getChannelList() {
    const [rows, fields] = await this.connection.query(
      "SELECT DISTINCT channel FROM totoxbot.groups"
    );
    const out = [];
    rows.forEach((current) => {
      out.push(current.channel);
    });
    return out;
  }

  async getTwitchChannelList() {
    const [rows, fields] = await this.connection.query(
      "SELECT DISTINCT channel FROM totoxbot.groups"
    );
    const out = [];
    rows.forEach((current) => {
      if (current.channel[0] == "#") {
        out.push(current.channel.substring(1));
      }
    });
    return out;
  }

  async getCooldown(commandName) {
    const [rows, fields] = await this.connection.query(
      "SELECT cooldown FROM totoxbot.commands WHERE name = ?",
      [commandName]
    );
    return rows[0].cooldown;
  }

  async convertAlias(alias) {
    const [rows, fields] = await this.connection.query(
      "SELECT command FROM totoxbot.aliases WHERE alias = ?",
      [alias]
    );
    if (rows.length > 0) {
      return [rows[0].command];
    } else {
      return alias;
    }
  }

  async getUsername(userID) {
    const [rows, fields] = await this.connection.query(
      "SELECT name FROM totoxbot.users WHERE id = ?",
      [userID]
    );
    return rows[0].name;
  }

  async getPerms(userID) {
    const [rows, fields] = await this.connection.query(
      "SELECT perms FROM totoxbot.users WHERE id = ?",
      [userID]
    );
    const perms = {
      admin: false,
      manager: false,
      vip: false,
    };
    if (rows[0].perms) {
      if (rows[0].perms.includes("admin")) {
        perms.admin = true;
      }
      if (rows[0].perms.includes("manager")) {
        perms.manager = true;
      }
      if (rows[0].perms.includes("vip")) {
        perms.vip = true;
      }
    }

    if (perms.admin) {
      perms.manager = true;
    }
    if (perms.manager) {
      perms.vip = true;
    }
    return perms;
  }

  async getUserID(platform, id, name = null) {
    if (platform == "twitch") {
      const [rows, fields] = await this.connection.query(
        "SELECT id FROM totoxbot.users WHERE twitchid = ?",
        [id]
      );
      if (rows.length == 0) {
        if (!name) {
          return false;
        }
        await this.connection.query(
          "INSERT INTO totoxbot.users (name, twitchid, twitchname) VALUES (?, ?, ?)",
          [name, id, name]
        );
        const [rows, fields] = await this.connection.query(
          "SELECT id FROM totoxbot.users WHERE twitchid = ?",
          [id]
        );
        return rows[0].id;
      } else {
        return rows[0].id;
      }
    } else if (platform == "discord") {
      const [rows, fields] = await this.connection.query(
        "SELECT id FROM totoxbot.users WHERE discordid = ?",
        [id]
      );
      if (rows.length == 0) {
        if (!name) {
          return false;
        }
        await this.connection.query(
          "INSERT INTO totoxbot.users (name, discordid) VALUES (?, ?)",
          [name, id]
        );
        const [rows, fields] = await this.connection.query(
          "SELECT id FROM totoxbot.users WHERE discordid = ?",
          [id]
        );
        return rows[0].id;
      } else {
        return rows[0].id;
      }
    }
  }

  async convertTwitchMention(name) {
    const [rows, fields] = await this.connection.query(
      "SELECT id FROM totoxbot.users WHERE twitchname = ?",
      [name.toLowerCase()]
    );
    if (rows.length > 0) {
      return rows[0].id;
    } else {
      return false;
    }
  }

  async linkUser(discordid, twitchid) {
    const [rows, fields] = await this.connection.query(
      "SELECT twitchname FROM totoxbot.users WHERE twitchid = ?",
      [twitchid]
    );
    if (rows.length > 0) {
      await this.connection.query(
        "UPDATE totoxbot.users SET twitchname = ? where discordid = ?",
        [rows[0].twitchname, discordid]
      );
    }
    await this.connection.query(
      "DELETE FROM totoxbot.users WHERE twitchid = ?",
      [twitchid]
    );
    await this.connection.query(
      "UPDATE totoxbot.users SET twitchid = ? where discordid = ?",
      [twitchid, discordid]
    );
    return true;
  }

  async isLinked(userID) {
    const [rows, fields] = await this.connection.query(
      "SELECT twitchid, discordid FROM totoxbot.users WHERE id = ?",
      [userID]
    );
    if (rows.length > 0) {
      return rows[0].twitchid && rows[0].discordid;
    } else {
      return false;
    }
  }

  /*
  async addPronoun(userID, pronoun) {
    pronoun = pronoun.toLowerCase();
    if (pronoun == 'any/all') {
      const [rows, fields] = await this.connection.query('UPDATE totoxbot.users SET pronouns = ? WHERE id = ?', ['any/all', id]);
      return 'any/all';
    }
    const [pronounList, fields] = await this.connection.query('SELECT pronoun FROM totoxbot.pronouns', [userID]);
    if (!pronounList.includes(pronoun)) {
      return false;
    }
    else {
      const [currentPronouns, fields] = await this.connection.query('SELECT pronouns FROM totoxbot.users WHERE id = ?', [userID]);
      const newPronouns = currentPronouns+','+pronoun;
      const [rows, fields2] = await this.connection.query('UPDATE totoxbot.users SET pronouns = ? WHERE id = ?', [newPronouns, id]);
      return newPronouns;
    }
  }

  async removePronoun(userID, pronoun) {
    const [rows, fields] = await this.connection.query();

  }
  */

  async resolveMessage(message) {
    let out = message;

    const uuids = out.match(/<USERNAME:[0-9a-f\-]+>/g);
    if (uuids) {
      const names = [];
      for (let i = 0; i < uuids.length; i++) {
        const userID = /[0-9a-f\-]+/.exec(uuids[i])[0];
        const name = await this.getUsername(userID);
        names.push(name);
      }

      uuids.forEach((current, index) => {
        out = out.replace(current, names[index]);
      });
    }

    return out;
  }
}

module.exports = { SqlClient };
