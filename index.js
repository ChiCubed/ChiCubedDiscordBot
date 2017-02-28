const Discord = require('discord.js');
const nodeopus = require('node-opus');
const bot = new Discord.Client();



var permissions = {};
try {
  permissions = require('./permissions.json');
} catch (e) {
  permissions = { "admins" : [ ], "blacklist" : [ ] };
}


function isAdmin(id) {
  return permissions.admins.includes(id);
}

function isBlacklisted(id) {
  return permissions.blacklist.includes(id);
}


var commands = {
  "admin": {
    info: "adds as administrator any mentioned users. if no arguments given, lists all administrators",
    run: function(bot,msg,args) {
      if (!msg.mentions.users.size) {
        var admins = permissions.admins.map(function (id) { return msg.channel.members.get(id).user.username; }).join(", ");
        msg.channel.sendMessage("Administrators: " + admins);
      } else if (!isAdmin(msg.author.id)) {
        msg.channel.sendMessage(msg.author.username + ": You need admin permissions to do that.");
      } else {        
        var usr = null;
        for (var i in msg.mentions.users.array()) {
          usr = msg.mentions.users.array()[i];
          if (!(usr instanceof Discord.User)) {
            continue;
          }
          if (isBlacklisted(usr.id)) {
            msg.channel.sendMessage(msg.author.username + ": " + usr.username + " is blacklisted.");
          } else if (isAdmin(usr.id)) {
            msg.channel.sendMessage(msg.author.username + ": " + usr.username + " is already an admin.");
          } else {
            permissions.admins.push(usr.id);
            msg.channel.sendMessage(usr.username + " added to administrators.");
          }
        }
      }
    }
  },
  
  "rmadmin": {
    info: "removes all mentioned administrators.",
    run: function(bot,msg,args) {
      if (!msg.mentions.users.size) {
        msg.channel.sendMessage("No user provided.");
      } else if (!isAdmin(msg.author.id)) {
        msg.channel.sendMessage(msg.author.username + ": You need admin permissions to do that.");
      } else if (permissions.admins.length == 1) {
        msg.channel.sendMessage(msg.author.username + ": there must be at least one admin.");
      } else {        
        var usr = null;
        for (var i in msg.mentions.users.array()) {
          usr = msg.mentions.users.array()[i];
          if (!(usr instanceof Discord.User)) {
            continue;
          }
          if (!isAdmin(usr.id)) {
            msg.channel.sendMessage(msg.author.username + ": " + usr.username + " is not an admin.");
          } else {
            permissions.admins.splice(permissions.admins.indexOf(usr.id),1);
            msg.channel.sendMessage(usr.username + " removed from administrators.");
          }
        }
      }
    }
  },
  
  "blacklist": {
    info: "blacklists all mentioned users from using the bot. if no arguments given, lists blacklisted users.",
    run: function(bot,msg,args) {
      if (!msg.mentions.users.size) {
        msg.channel.sendMessage("Blacklisted users: " + permissions.blacklist.map(
                                function (id) { return msg.channel.members.get(id).user.username; }).join(", "));
      } else if (!isAdmin(msg.author.id)) {
        msg.channel.sendMessage(msg.author.username + ": You need admin permissions to do that.");
      } else {        
        var usr = null;
        for (var i in msg.mentions.users.array()) {
          usr = msg.mentions.users.array()[i];
          if (!(usr instanceof Discord.User)) {
            continue;
          }
          if (isAdmin(usr.id)) {
            msg.channel.sendMessage(msg.author.username + ": cannot blacklist " + usr.username + ": is admin");
          } else if (isBlacklisted(usr.id)) {
            msg.channel.sendMessage(msg.author.username + ": " + usr.username + " is already blacklisted.");
          } else {
            permissions.blacklist.push(usr.id);
            msg.channel.sendMessage(usr.username + " added to blacklist.");
          }
        }
      }
    }
  },
  
  "whitelist": {
    info: "removes all mentioned users from the blacklist.",
    run: function(bot,msg,args) {
      if (!msg.mentions.users.size) {
        msg.channel.sendMessage("No user provided.");
      } else if (!isAdmin(msg.author.id)) {
        msg.channel.sendMessage(msg.author.username + ": You need admin permissions to do that.");
      } else {        
        var usr = null;
        for (var i in msg.mentions.users.array()) {
          usr = msg.mentions.users.array()[i];
          if (!(usr instanceof Discord.User)) {
            continue;
          }
          if (!isBlacklisted(usr.id)) {
            msg.channel.sendMessage(msg.author.username + ": " + usr.username + " is not blacklisted.");
          } else {
            permissions.blacklist.splice(permissions.blacklist.indexOf(usr.id),1);
            msg.channel.sendMessage(usr.username + " removed from blacklist.");
          }
        }
      }
    }
  },
  
  "ping": {
    info: "responds with pong",
    run: function(bot,msg,args) {
      msg.channel.sendMessage(msg.author.username + ": pong");
    }
  },
  
  "say": {
    info: "bot says a message",
    run: function(bot,msg,args) {
      msg.channel.sendMessage(args);
    }
  },
  
  "saytts": {
    info: "same as say but with text to speech",
    run: function(bot,msg,args) {
      msg.channel.sendMessage(args,{tts:true});
    }
  }
}


function processCommand(bot,msg) {
  if (msg.author.id == bot.user.id) {
    return;
  }
  
  if (isBlacklisted(msg.author.id)) {
    console.log("received message attempt from blacklisted user: " + msg.author.username);
    return;
  }
  
  var cmd = "";
  var args = "";
  var mentions = msg.mentions;
  if (!msg.content.includes(" ")) {
    cmd = msg.content.substr(1);
  } else {
    cmd = msg.content.substr(1,msg.content.indexOf(' ')-1);
    args = msg.content.substr(msg.content.indexOf(' ') + 1).trim();
  }
  
  if (cmd == "help") {
    console.log("received help request from " + msg.author.username + ": " + args);
    if (args) {
      if (commands.hasOwnProperty(args)) {
        msg.channel.sendMessage(args + ": " + commands[args].info);
      } else {
        msg.channel.sendMessage(msg.author.username + ": " + args + " not found");
      }
    } else {
      for (var hcmd in commands) {
        if (commands.hasOwnProperty(hcmd)) {
          msg.channel.sendMessage(hcmd + ": " + commands[hcmd].info);
        }
      }
    }
    return;
  }
  
  if (!commands.hasOwnProperty(cmd)) {
    return;
  }
  
  console.log("received command from " + msg.author.username + ": " + cmd + " " + args);
  commands[cmd].run(bot,msg,args);
}


bot.on('ready', () => {
  console.log('I am ready!');
});

bot.on('message', message => {
  if (message.content.startsWith('!')) {
    processCommand(bot,message);
  }
});

// Read from the token file.
const fs = require('fs');
const path = process.cwd();
const token = fs.readFileSync(path + "/token").toString().replace(/\n$/,'');
bot.login(token);
