const Discord = require('discord.js');
const nodeopus = require('node-opus');
const client = new Discord.Client();

client.on('ready', () => {
  console.log('I am ready!');
});

client.on('message', message => {
  if (message.content === 'ping') {
    message.reply('pong');
  }
});

const fs = require('fs');
const path = process.cwd();
const token = fs.readFileSync(path + "/token").toString().replace(/\n$/,'');
client.login(token);
