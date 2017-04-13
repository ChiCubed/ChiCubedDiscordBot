const token = require('./token.json');
const jimp = require('jimp');
const Discord = require('discord.js');
const nodeopus = require('node-opus');
const google = require('googleapis');
const request = require('request');
const child_process = require('child_process');
var customsearch = google.customsearch('v1');

var wolfram = null;
if (token.hasOwnProperty('wolframtoken')) {
  wolfram = require('wolfram-alpha').createClient(token.wolframtoken);
}

const bot = new Discord.Client();


var listening = true;


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




var chessboard;
var board = [];
var currMove = 0; // white

var pieces = ['rnbkqp',
              'tmvlwo'];

function generateChessboard(bot,msg,args) {
  board = [];
  board.push("rnbkqbnr".split(''));
  board.push("pppppppp".split(''));
  for (var i = 2; i < 6; ++i) {
    board.push("        ".split(''));
  }
  board.push("oooooooo".split(''));
  board.push("tmvlwvmt".split(''));
}

function printBoard(bot,msg,args) {
  jimp.read('chessboard.jpg')
  .then(function (image) {
    chessboard = image;
    return jimp.loadFont("test.fnt");
  })
  .then(function (font) {
    for (var i = 0; i < 8; ++i) {
      for (var j = 0; j < 8; ++j) {
        chessboard = chessboard.print(font,30+j*30,30+i*30,board[i][j]);
      }
    }
    // chessboard = chessboard.print(font,30,30, "rnbkqbnr");
    // chessboard = chessboard.print(font,30,60, "pppppppp");
    // chessboard = chessboard.print(font,30,210,"oooooooo");
    // chessboard = chessboard.print(font,30,240,"tmvwlvmt");
    chessboard.getBuffer(jimp.MIME_JPEG, function(err, buffer) {
                msg.channel.sendFile(Buffer.from(buffer),'file.jpg',['White','Black'][currMove]+'\'s turn');
    });
  })
  .catch(function (err) {
    console.log(err);
  });
}


var commands = {
  "admin": {
    info: "adds as administrator any mentioned users. if no arguments given, lists all administrators",
    run: function(bot,msg,args) {
      if (!msg.mentions.users.size) {
        var admins = permissions.admins.map(function (id) { return "<@"+id+">" }).join(", ");
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
                                function (id) { return "<@"+id+">"; }).join(", "));
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
  
  "viewchess": {
    info: "view an ongoing chess game",
    run: function(bot,msg,args) {
      if (board.length == 0) {
        msg.channel.sendMessage("No chess game. Use `!chess new` to start one");
        return;
      }
      printBoard(bot,msg,args);
    }
  },

  "chess": {
    info: "perform a chess move or create a new game",
    run: function(bot,msg,args) {
      if (!args) {
        if (board.length == 0) {
          msg.channel.sendMessage("No chess game. Use `!chess new` to start one");
        } else {
          printBoard(bot,msg,args);
        }
        return;
      }

      if (args == "new") {
        msg.channel.sendMessage("Generating new board...");
        generateChessboard(bot,msg,args);
        printBoard(bot,msg,args);
        return;
      }

      if (args.includes(' ')) {
        if (board.length == 0) {
          msg.channel.sendMessage("No chess game. Use `!chess new` to start one");
          return;
        }
        moves = args.split(' ');
        m1 = moves[0].toLowerCase().substr(0,2); m2 = moves[1].toLowerCase().substr(0,2);
        
        r1 = 8-parseInt(m1[1],10);
        r2 = 8-parseInt(m2[1],10);
        c1 = m1.charCodeAt()-97;
        c2 = m2.charCodeAt()-97;

        if (r1<0||r1>7||r2<0||r2>7||c1<0||c1>7||c2<0||c2>7) {
          msg.channel.sendMessage("Move out of range");
          return;
        }

        if (board[r1][c1] == ' ') {
          msg.channel.sendMessage("No piece at " + m1);
          return;
        }

        if (r1==r2 && c1==c2) {
          msg.channel.sendMessage("Invalid move");
          return;
        }

        if (pieces[currMove].includes(board[r2][c2])) {
          msg.channel.sendMessage("You cannot move onto a " + ['white','black'][currMove] + " piece");
          return;
        }

        if (!pieces[currMove].includes(board[r1][c1])) {
          msg.channel.sendMessage("You can only move " + ['white','black'][currMove] + " pieces");
          return;
        }


        msg.channel.sendMessage("Moving " + m1 + " to " + m2);
        currMove += 1;
        currMove %= 2;

        board[r2][c2] = board[r1][c1];
        board[r1][c1] = ' ';
        printBoard(bot,msg,args);
      }
    }
  },
  
  "ping": {
    info: "responds with pong",
    run: function(bot,msg,args) {
      msg.channel.sendMessage(msg.author.username + ": :ping_pong:");
    }
  },
  
  "pong": {
    info: "sort of like ping",
    run: function(bot,msg,args) {
      msg.channel.sendMessage(msg.author.username + ": :ping_pong: Wait, what?");
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
  },
  
  "google": {
    info: "search Google",
    run: function(bot,msg,args) {
      if (!token.hasOwnProperty('googletoken')) {
        msg.channel.sendMessage(msg.author.username + ": no Google Custom Search token");
        return;
      }
      
      if (!token.hasOwnProperty('googlecx')) {
        msg.channel.sendMessage(msg.author.username + ": no Google Custom Search Engine token");
        return;
      }
      
      if (!args) {
        return;
      }
      
      customsearch.cse.list({ cx: token.googlecx, q: args, auth: token.googletoken },
        function(err, resp) {
          if (err) {
            console.log("Error searching Google: " + err);
            msg.channel.sendMessage(
              msg.author.username + ": An error occured"
            );
            return;
          }
          
          if (!resp.items || resp.items.length == 0) {
            msg.channel.sendMessage(msg.author.username + ": No results");
            return;
          }
          
          var l = 5;
          if (resp.items.length < l) {
            l = resp.items.length;
          }
          
          // Make sure the IP address doesn't show up because that would be baaad
          const ipv4 = child_process.execSync("curl -s 'https://api.ipify.org/?format=html'") + '';
          
          var ipv6 = "";
          for (i = 0; i < 2; ++i) {
            var hex = parseInt(ipv4.split(".")[i], 10).toString(16);
            ipv6 += ('00'+hex).substring(hex.length);
          }
          
          ipv6 += ":"
          
          for (i = 2; i < 4; ++i) {
            var hex = parseInt(ipv4.split(".")[i], 10).toString(16);
            ipv6 += ('00'+hex).substring(hex.length);
          }
          
          results = msg.author.username + ": Results for \"" + args + "\"\n";
          for (i = 0; i < l; ++i) {
            results += "**" + resp.items[i].title.replace(ipv4,"[REDACTED]").replace(ipv6,"[REDACTED]")
                     + "**" + " *" + resp.items[i].link.replace(ipv4,"[REDACTED]").replace(ipv6,"[REDACTED]")
                     + "*\n" + resp.items[i].snippet.replace(ipv4,"[REDACTED]").replace(ipv6,"[REDACTED]") + "\n";
          }
          
          msg.channel.sendMessage(results).catch(function(err){});
        });
    }
  },
  
  "askwolfram": {
    info: "search WolframAlpha",
    run: function(bot,msg,args) {
      if (wolfram == null) {
        msg.channel.sendMessage(
          msg.author.username + ": no WolframAlpha token"
        );
        return;
      }
      
      if (!args) {
        return;
      }
      
      wolfram.query(args, function(err,result) {
        if (err) {
          console.log("Error searching WolframAlpha: " + err);
          msg.channel.sendMessage(
            msg.author.username + ": An error occured"
          );
          return;
        }
        
        if (result.length == 0) {
          msg.channel.sendMessage(msg.author.username + ": No results");
          return;
        }
        
        if (result[0].subpods[0].text == "current geoIP location") {
          msg.channel.sendMessage("[REDACTED]");
          return;
        }
        
        // Make sure the IP address doesn't show up because that would be baaad
        const ipv4 = child_process.execSync("curl -s 'https://api.ipify.org/?format=html'") + '';
        
        var ipv6 = "";
        for (i = 0; i < 2; ++i) {
          var hex = parseInt(ipv4.split(".")[i], 10).toString(16);
          ipv6 += ('00'+hex).substring(hex.length);
        }
        
        ipv6 += ":"
        
        for (i = 2; i < 4; ++i) {
          var hex = parseInt(ipv4.split(".")[i], 10).toString(16);
          ipv6 += ('00'+hex).substring(hex.length);
        }
        
        var message = msg.author.username + ": Results for \"" + args + "\"\n";
        for (i in result) {
          var pod = result[i];
          message += "**" + pod.title + "**\n";
          for (j in pod.subpods) {
            var subpod = pod.subpods[j];
            message += "    " + subpod.text.split("\n").join("\n    ").replace(ipv4,"[REDACTED]").replace(ipv6,"[REDACTED]") + "\n";
          }
        }
        
        msg.channel.sendMessage(message);
      });
    }
  },
  
  "testresponse": {
    info: "dummy function to test responses",
    run: function(bot,msg,args) {
      respond(bot,msg,args);
    }
  },
  
  "listen": {
    info: "turn on or off listening for responses - use 'on' or '1' to turn on and 'off' or '0' to turn off",
    run: function(bot,msg,args) {
      if (args == "on" || args == "1") {
        listening = true;
      } else if (args == "off" || args == "0") {
        listening = false;
      } else if (args == "") {
        if (listening) {
          msg.channel.sendMessage("Yep, I'm listening.");
        } else {
          msg.channel.sendMessage("I'm not listening right now.");
        }
      } else {
        msg.channel.sendMessage(msg.author.username + ": Unknown command. Try `!help listen`.");
      }
    }
  },
  
  "addresponse": {
    info: "add a response, formatted as tomatch::response;;",
    run: function(bot,msg,args) {
      if (!args.includes("::") || !args.endsWith(";;") || args.indexOf(";;") != args.length - 2) {
        msg.channel.sendMessage(msg.author.username + ": Invalid response: " + args);
        return;
      }
      child_process.execFile("./response.py", ["add",args], (error,stdout,stderr) => {
        if (error) {
          console.log(error);
          msg.channel.sendMessage("An error occured");
          return;
        }
      });
    }
  },
  
  "listresponses": {
    info: "list all the responses in the database",
    run: function(bot,msg,args) {
      child_process.execFile("./response.py", ["list"], (error,stdout,stderr) => {
        if (error) {
          console.log(error);
          msg.channel.sendMessage("An error occured");
          return;
        }
        msg.channel.sendMessage(stdout);
      });
    }
  },
  
  "deleteresponse": {
    info: "delete a response by its number",
    run: function(bot,msg,args) {
      if (!args) {
        msg.channel.sendMessage(msg.author.username + ": No argument given");
        return;
      }
      if (!/^\+?(0|[1-9]\d*)$/.test(args)) {
        msg.channel.sendMessage(msg.author.username + ": Invalid number");
        return;
      }
      child_process.execFile("./response.py", ["delete", args], (error,stdout,stderr) => {
        if (error) {
          console.log(error);
          msg.channel.sendMessage("An error occured");
          return;
        }
        if (stdout && stdout != '\n') {
          msg.channel.sendMessage(msg.author.username + ": " + stdout);
        }
      });
    }
  },
  
  "id": {
    info: "get a user's id",
    run: function(bot,msg,args) {
      if (!msg.mentions.users.size) {
        msg.channel.sendMessage(msg.author + " has id `" + msg.author.id + "`");
      } else {
        var result = "";
        for (var i in msg.mentions.users.array()) {
          usr = msg.mentions.users.array()[i];
          if (!(usr instanceof Discord.User)) {
            continue;
          }
          result += usr + " has id `" + usr.id + "`\n";
        }
        msg.channel.sendMessage(result);
      }
    }
  },
  
  "tell": {
    info: "sends a message to a user given their id",
    run: function(bot,msg,args) {
      if (args.includes(' ')) {
        var user = args.substr(0,args.indexOf(' '));
        var contents = args.substr(args.indexOf(' ')+1);
        
        bot.fetchUser(user).then(usr => {
          usr.sendMessage(msg.author + " told me to tell you: " + contents);
        });
      }
    }
  },
  
  "time": {
    info: "gets the current time",
    run: function(bot,msg,args) {
      var date = new Date();
      msg.channel.sendMessage("The time is currently " + date.getHours() + ":" + 
                              (date.getMinutes() < 10 ? '0' : '') + date.getMinutes()
                               + " on " + date.getDate() + " " +
                              [ "January", "February", "March", "April", "May",
                                "June", "July", "August", "September", "October",
                                "November", "December" ][date.getMonth()] + " " +
                              date.getFullYear() + ", at least where I am.");
    }
  },
  
  "xkcd": {
    info: "gets a comic from XKCD",
    run: function(bot,msg,args) {
      if (args && !/^\+?(0|[1-9]\d*)$/.test(args)) {
        // non-integral
        msg.channel.sendMessage(msg.author.username + ": Invalid number: " + args);
        return;
      }
      args = args + '/'
      request('https://xkcd.com/'+args+'info.0.json', function(error,response,body) {
        if (error) {
          console.log(error);
          return;
        }
        if (response.statusCode == 404) {
          msg.channel.sendMessage(msg.author.username + ": Out of range: " + args.slice(0,-1));
          return;
        }
        var comic = JSON.parse(body);
        var embed = new Discord.RichEmbed();
        embed.setTitle(comic.num + ": " + comic.safe_title);
        embed.setImage(comic.img);
        embed.setFooter(comic.alt);
        embed.setURL(body.link);
        msg.channel.sendEmbed(embed);
      })
    }
  }
}



function escape(string) { // https://github.com/joliss/js-string-escape
  return ('' + string).replace(/["'\\\n\r\u2028\u2029]/g, function (character) {
    // Escape all characters not included in SingleStringCharacters and
    // DoubleStringCharacters on
    // http://www.ecma-international.org/ecma-262/5.1/#sec-7.8.4
    switch (character) {
      case '"':
      case "'":
      case '\\':
        return '\\' + character
      // Four possible LineTerminator characters need to be escaped:
      case '\n':
        return '\\n'
      case '\r':
        return '\\r'
      case '\u2028':
        return '\\u2028'
      case '\u2029':
        return '\\u2029'
    }
  })
}


class DummyChannel extends Discord.Channel {
  startTyping() {}
  stopTyping() {}
  sendMessage(args, options={}) {
    this.message += args;
  }
}


function consume(args) {
  // consumes the first {{expr}} from args.
  // returns that expr and the remainder of args.
  // assumes args starts with {{
  
  var depth = 0;
  var i = 0;
  while (i < args.length-1) {
    if (args[i]+args[i+1] == '{{') {
      ++depth;
      ++i;
    } else if (args[i]+args[i+1] == '}}') {
      --depth;
      ++i;
    }
    ++i;
    if (depth < 0) {
      throw 'mismatched brackets';
    }
    if (depth == 0) {
      break;
    }
  }
  
  return [args.substr(0,i),args.substr(i)];
}


function parse(bot,msg,args) {
  // args is the actual thing to parse
  
  // example: The time is {{command time}}.
  // example: {{command say a}} {{command say b}}
  // example: {{if {{eval {{repr time}} == 'time'}} {{command time}} else {{command id}}}}
  // example: {{if {{eval {{repr example}} == 'time'}} {{command time}} else {{command id}}}}
  
  
  // console.log('called with: ' + args);
  
  if (!args.includes('{{')) {
    // bottom level
    if (args.includes('}}')) {
      throw 'mismatched brackets';
    }
    return args;
  }
  
  if (!args.includes('}}')) {
    throw 'mismatched brackets';
  }
  
  
  var firstargs = args;
  
  // while 1:
  // consume up to a {{
  // then consume that expression
  // evaluate
  // continue
  
  var value = ''
  
  while (args) {
    if (!args.includes('{{')) {
      if (args.includes('}}')) {
        throw 'mismatched brackets';
      }
      value += args;
      break;
    }
    
    value += args.substr(0,args.indexOf('{{'));
    args = args.substr(args.indexOf('{{'));
    
    // evaluate expression
    // get cmd, args from within
    
    var cons = consume(args);
    var cmda = cons[0];
    args = cons[1];
    
    var cmd = cons[0].slice(2,cons[0].indexOf(' '));
    var cargs = cons[0].slice(cons[0].indexOf(' ')+1,-2);
    
    switch (cmd) {
      case 'command':
        // the return value is what would be printed
        // to the channel.
        var fakemsg = Object.assign({},msg);
        fakemsg.channel = new DummyChannel();
        fakemsg.channel.message = "";
        cargs = parse(bot,msg,cargs);
        if (cargs.includes(' ')) {
          console.log(cargs.slice(0,cargs.indexOf(' ')));
          commands[cargs.slice(0,cargs.indexOf(' '))].run(bot,fakemsg,cargs.substr(cargs.indexOf(' ')+1));
        } else {
          commands[cargs].run(bot,fakemsg,'');
        }
        
        value += fakemsg.channel.message;
        break;
      case 'eval':
        value += eval(parse(bot,msg,cargs));
        break;
      case 'repr':
        value += '"' + escape(parse(bot,msg,cargs)) + '"';
        break;
      case 'if':
        // of form {{if {{condition}} {{run_if_true}} else {{run_if_false}}}}
        // args = {{condition}} {{run_if_true}} else {{run_if_false}}
        
        var con = consume(cargs);
        var cond = eval(parse(bot,msg,con[0]));
        
        rem = consume(con[1].trim());
        
        rem[1] = rem[1].trim()
        
        if (!rem[1].startsWith('else')) {
          throw 'malformed if statement';
        }
        
        rem[1] = rem[1].substr(4).trim();
        
        value += parse(bot,msg,rem[!cond|0]);
        
        break;
      default:
        throw 'command ' + cmd + ' not found';
    }
  }
  
  // console.log('returned: ' + value);
  
  return value;
}




function respond(bot,msg,args) {
  if (!args) {
    return;
  }
  
  child_process.execFile("./response.py", ["query",msg.author.username,msg.author.id,args], (error,stdout,stderr) => {
    if (error) {
      console.log(error);
      msg.channel.sendMessage("An error occured");
      return;
    }
    var stdout = stdout.trim();
    if (!stdout) {
      return;
    }
    msg.channel.startTyping();
    try {
      msg.channel.sendMessage(parse(bot,msg,stdout)
                              ).catch(function(err){});
    } catch (e) {
      console.log(e);
      msg.channel.sendMessage("An error occured");
    }
    msg.channel.stopTyping();
  });
}



function parseCommand(msg) {
  var cmd = "";
  var args = "";
  if (!msg.content.includes(" ")) {
    cmd = msg.content.substr(1);
  } else {
    cmd = msg.content.substr(1,msg.content.indexOf(' ')-1);
    args = msg.content.substr(msg.content.indexOf(' ')+1).trim();
  }
  
  return [cmd,args];
}



function processCommand(bot,msg) {
  if (msg.author.id == bot.user.id) {
    return;
  }
  
  if (isBlacklisted(msg.author.id)) {
    console.log("received message attempt from blacklisted user: " + msg.author.username);
    return;
  }
  
  parsed = parseCommand(msg);
  cmd = parsed[0];
  args = parsed[1];
  
  if (cmd == "help") {
    console.log("received help request from " + msg.author.username + ": " + args);
    msg.channel.startTyping();
    if (args) {
      if (commands.hasOwnProperty(args)) {
        msg.channel.sendMessage(args + ": " + commands[args].info);
      } else {
        msg.channel.sendMessage(msg.author.username + ": " + args + " not found");
      }
    } else {
      var x = ""
      for (var hcmd in commands) {
        if (commands.hasOwnProperty(hcmd)) {
          x += "**" + hcmd + "**: " + commands[hcmd].info + "\n";
        }
      }
      msg.channel.sendMessage(x);
    }
    msg.channel.stopTyping();
    return;
  }
  
  if (!commands.hasOwnProperty(cmd)) {
    return;
  }
  
  console.log("received command from " + msg.author.username + ": " + cmd + " " + args);
  msg.channel.startTyping();
  commands[cmd].run(bot,msg,args);
  msg.channel.stopTyping();
}


bot.on('ready', () => {
  console.log('I am ready!');
});

bot.on('message', message => {
  if (message.content.startsWith('!')) {
    processCommand(bot,message);
  }
  
  if (message.author.id != bot.user.id && listening) {
    respond(bot,message,message.content);
  }
});

// Login
bot.login(token.bottoken);
