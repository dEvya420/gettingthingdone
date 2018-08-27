const Telegraf = require('telegraf'),
      fs = require("fs");
// note to you: don't remove above if you're hosting yourself
// note to me:  only copy everything below this line to glitch
const channelbot = new Telegraf(process.env.SECRET),
      channels = JSON.parse(fs.readFileSync("./channels.json", "utf8"));

channelbot.telegram.setWebhook("https://gogoshaggz.herokuapp.com"+process.env.PATH);
channelbot.startWebhook(process.env.PATH, null, process.env.PORT);

channelbot.command("perms", ctx => {
  if (ctx.message.from.id !== 601129114 && ctx.message.from.id !== 502689293) return ctx.reply("You're not authorized to run this command!");
  channels.managing = ctx.message.from.id;
  fs.writeFile("./channels.json", JSON.stringify(channels), "utf8");
  ctx.reply("Forward a message that's authored by the person you wish to manage permission of.", {reply_markup: {inline_keyboard: [[{text: "Quit", callback_data: "mquit"}]]}});
});

channelbot.on("message", ctx => {
  if (ctx.message.forward_from && channels.managing === ctx.message.from.id) {
    if (!channels.users[ctx.message.forward_from.id]) {
      channels.users[ctx.message.forward_from.id] = channels.channels.map(c => false);
      fs.writeFile("./channels.json", JSON.stringify(channels), "utf8");
    }
    else if (channels.users[ctx.message.forward_from.id].length !== channels.channels.length) {
      ctx.deleteMessage();
      channels.users[ctx.message.forward_from.id] = channels.channels.map(c => {
        if (channels.users[ctx.message.forward_from.id][channels.channels.indexOf(c)]) return channels.users[ctx.message.forward_from.id][channels.channels.indexOf(c)];
        else return false;
      });
      fs.writeFile("./channels.json", JSON.stringify(channels), "utf8");
    }
    let a = channels.channels.map(c => [{text: c[0] + (channels.users[ctx.message.forward_from.id][channels.channels.indexOf(c)] ? " ⚪" : " ⚫"), callback_data: "perms:"+ctx.message.forward_from.id+":"+channels.channels.indexOf(c)}]);
    a.push([{text: "Quit", callback_data: "mquit"}]);
    ctx.reply("Here are the permissions for ID "+ctx.message.forward_from.id+":\n(White is on, black is off)", {reply_markup: {inline_keyboard: a}});
  }
  else if (channels.managing === ctx.message.from.id) ctx.reply("Not a forwarded message! Try again!", {reply_markup: {inline_keyboard: [[{text: "Quit", callback_data: "mquit"}]]}});
  else if (channels.time[ctx.message.from.id.toString()] > Date.now()) ctx.reply("You can only send 1 message per hour. Please wait till: "+new Date(channels.time[ctx.message.from.id.toString()]).toString());
  else if (channels.users[ctx.message.from.id.toString()].filter(p => p === true).length > 0) {
    let a = channels.channels.filter(c => channels.users[ctx.message.from.id][channels.channels.indexOf(c)] === true).map(c => [{text: c[0], callback_data: "send:"+c[1]}]);
    a.push([{text: "Cancel", callback_data: "quit"}]);
    ctx.reply("Please select your destination.", {reply_to_message_id: ctx.message.message_id, reply_markup: {inline_keyboard: a}});
  }
});

channelbot.on("callback_query", ctx => {
  if (ctx.callbackQuery.data.startsWith("perms:")) {
    channels.users[ctx.callbackQuery.data.split(":")[1].toString()][parseInt(ctx.callbackQuery.data.split(":")[2])] = channels.users[ctx.callbackQuery.data.split(":")[1].toString()][parseInt(ctx.callbackQuery.data.split(":")[2])] ? false : true;
    ctx.answerCbQuery("Setting changed!");
    fs.writeFile("./channels.json", JSON.stringify(channels), "utf8");
    let a = channels.channels.map(c => [{text: c[0] + (channels.users[ctx.callbackQuery.data.split(":")[1].toString()][channels.channels.indexOf(c)] ? " ⚪" : " ⚫"), callback_data: "perms:"+ctx.callbackQuery.data.split(":")[1].toString()+":"+channels.channels.indexOf(c)}]);
    a.push([{text: "Quit", callback_data: "mquit"}]);
    ctx.editMessageReplyMarkup({inline_keyboard: a});
  }
  else if (ctx.callbackQuery.data.startsWith("send:")) {
    channels.time[ctx.callbackQuery.from.id.toString()] = Date.now() + 3600000;
    fs.writeFile("./channels.json", JSON.stringify(channels), "utf8");
    ctx.answerCbQuery("Message sent!");
    ctx.telegram.forwardMessage(ctx.callbackQuery.data.split(":")[1], ctx.callbackQuery.message.chat.id, ctx.callbackQuery.message.reply_to_message.message_id);
    ctx.telegram.deleteMessage(ctx.callbackQuery.message.chat.id, ctx.callbackQuery.message.message_id);
  }
  else if (ctx.callbackQuery.data.endsWith("quit")) {
    ctx.answerCbQuery("Command teminated!");
    ctx.telegram.deleteMessage(ctx.callbackQuery.message.chat.id, ctx.callbackQuery.message.message_id);
    if (ctx.callbackQuery.data === "mquit") {
      channels.managing = false;
      fs.writeFile("./channels.json", JSON.stringify(channels), "utf8");
    }
  }
});

channelbot.startPolling();
