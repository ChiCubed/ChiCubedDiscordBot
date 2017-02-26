const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
  console.log('I am ready!');
});

client.on('message', message => {
  if (message.content === 'ping') {
    message.reply('pong');
  }
});

var fs = require('fs');
var path = process.cwd();
var token = fs.readFileSync(path + "/token").toString().replace(/\n$/,'');
client.login(token);
