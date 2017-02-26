const Discord = require('discord.js');
const nodeopus = require('node-opus');
const bot = new Discord.Client();



var permissions = {};
try {
  permissions = require('permissions.json');
} catch (e) {
  permissions = { "admins" : [ ], "blacklist" : [ ] };
}


function isAdmin(user) {
  return permissions.admins.includes(user);
}

function isBlacklisted(user) {
  return permissions.blacklist.includes(user);
}


var commands = {
  "admin": {
    info: "adds an administrator. if no arguments given, lists all administrators",
    run: function(bot,msg,args) {
      if (!args) {
        msg.channel.sendMessage("Administrators: " + permissions.admins.join(", "));
      } else if (!isAdmin(msg.author)) {
        msg.channel.sendMessage(msg.author + ": You need admin permissions to do that.");
      } else if (isBlacklisted(args)) {
        msg.channel.sendMessage(msg.author + ": " + args + " is blacklisted.");
      } else if (isAdmin(args)) {
        msg.channel.sendMessage(msg.author + ": " + args + " is already an admin.");
      } else {
        permissions.admins.push(args);
        msg.channel.sendMessage(args + " added to administrators.");
      }
    }
  },
  
  "rmadmin": {
    info: "removes an administrator.",
    run: function(bot,msg,args) {
      if (!args) {
        msg.channel.sendMessage("No user provided.");
      } else if (!isAdmin(msg.author)) {
        msg.channel.sendMessage(msg.author + ": You need admin permissions to do that.");
      } else if (!isAdmin(args)) {
        msg.channel.sendMessage(msg.author + ": " + args + " is not an admin.");
      } else if (permissions.admins.length == 1) {
        msg.channel.sendMessage(msg.author + ": there must be at least one admin.");
      } else {
        permissions.admins.splice(permissions.admins.indexOf(args),1);
        msg.channel.sendMessage(args + " removed from administrators.");
      }
    }
  },
  
  "blacklist": {
    info: "blacklists a user from using the bot. if no arguments given, lists blacklisted users.",
    run: function(bot,msg,args) {
      if (!args) {
        msg.channel.sendMessage("Blacklisted users: " + permissions.blacklist.join(", "));
      } else if (!isAdmin(msg.author)) {
        msg.channel.sendMessage(msg.author + ": You need admin permissions to do that.");
      } else if (isAdmin(args)) {
        msg.channel.sendMessage(msg.author + ": cannot blacklist " + args + ": is admin");
      } else if (isBlacklisted(args)) {
        msg.channel.sendMessage(msg.author + ": " + args + " is already blacklisted.");
      } else {
        permissions.blacklist.push(args);
        msg.channel.sendMessage(args + " added to blacklist.");
      }
    }
  },
  
  "whitelist": {
    info: "remove a user from the blacklist.",
    run: function(bot,msg,args) {
      if (!args) {
        msg.channel.sendMessage("No user provided.");
      } else if (!isAdmin(msg.author)) {
        msg.channel.sendMessage(msg.author + ": You need admin permissions to do that.");
      } else if (!isBlacklisted(args)) {
        msg.channel.sendMessage(msg.author + ": " + args + " is not blacklisted.");
      } else {
        permissions.blacklist.splice(permissions.blacklist.indexOf(args),1);
        msg.channel.sendMessage(args + "removed from blacklist.");
      }
    }
  },
  
  "ping": {
    info: "responds with pong",
    run: function(bot,msg,args) {
      msg.channel.sendMessage(msg.author + ": pong");
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
  
  if (isBlacklisted(msg.author)) {
    console.log("received message attempt from blacklisted user: " + msg.author);
    return;
  }
  
  var cmd = ""
  var args = ""
  if (!msg.content.includes(" ")) {
    cmd = msg.content.substr(1);
  } else {
    cmd = msg.content.substr(1,msg.content.indexOf(' '));
    args = msg.content.substr(msg.content.indexOf(' ') + 1).trim();
  }
  
  if (cmd == "help") {
    console.log("received help request from " + msg.author + ": " + args);
    if (args) {
      if (commands.hasOwnProperty(args)) {
        msg.channel.sendMessage(args + ": " + commands[args].info);
      } else {
        msg.channel.sendMessage(msg.author + ": " + args + " not found");
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
  
  console.log("received command from " + msg.author + ": " + cmd + " " + args);
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
