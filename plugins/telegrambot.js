const log = require('../core/log');
const moment = require('moment');
const _ = require('lodash');
const config = require('../core/util').getConfig();
const telegrambot = config.telegrambot;
const emitTrades = telegrambot.emitTrades;
const utc = moment.utc;
const telegram = require("node-telegram-bot-api");

const Actor = function() {
  _.bindAll(this);

  this.advice = null;
  this.adviceTime = utc();

  this.price = 'Dont know yet :(';
  this.priceTime = utc();

  this.commands = {
    '/start': 'emitStart',
    '/advice': 'emitAdvice',
    '/subscribe': 'emitSubscribe',
    '/unsubscribe': 'emitUnSubscribe',
    '/balance': 'emitBalance',
    '/price': 'emitPrice',
    '/help': 'emitHelp'
  };

  if (telegrambot.donate) {
    this.commands['/donate'] = 'emitDonate';
  }
  this.rawCommands = _.keys(this.commands);
  this.chatId = null;
  this.subscribers = [];
  this.bot = new telegram(telegrambot.token, { polling: true });
  this.bot.onText(/(.+)/, this.verifyQuestion);
};

Actor.prototype.processCandle = function(candle, done) {
  this.price = candle.close;
  this.priceTime = candle.start;

  done();
};

Actor.prototype.processRoundtrip = function(roundtrip) {
  
  // var roundtrip = {
  //   id: this.roundTrip.id,

  //   entryAt: this.roundTrip.entry.date,
  //   entryPrice: this.roundTrip.entry.price,
  //   entryBalance: this.roundTrip.entry.total,

  //   exitAt: this.roundTrip.exit.date,
  //   exitPrice: this.roundTrip.exit.price,
  //   exitBalance: this.roundTrip.exit.total,

  //   duration: this.roundTrip.exit.date.diff(this.roundTrip.entry.date)
  // }

  // roundtrip.pnl = roundtrip.exitBalance - roundtrip.entryBalance;
  // roundtrip.profit = (100 * roundtrip.exitBalance / roundtrip.entryBalance) - 100;

  var message = 'RoundTrip.\nEntry date (UTC): ' + roundtrip.entryAt +
    '\nEntry Price: ' + roundtrip.entryPrice +
    '\nEntry Balance: ' + roundtrip.entryBalance +
    '\n\nExit date (UTC): ' + roundtrip.exitAt +
    '\nExit Price: ' + roundtrip.exitPrice +
    '\nexit Balance: ' + roundtrip.exitBalance +
    '\n\nDuration: ' + roundtrip.duration +
    '\nPNL: ' + roundtrip.pnl +
    '\nProfit: ' + roundtrip.profit;

  this.bot.sendMessage(this.chatId, message);
}

Actor.prototype.processPerformanceReport = function(report) {
  // const report = {
  //   startTime: this.dates.start.utc().format('YYYY-MM-DD HH:mm:ss'),
  //   endTime: this.dates.end.utc().format('YYYY-MM-DD HH:mm:ss'),
  //   timespan: timespan.humanize(),
  //   market: this.endPrice * 100 / this.startPrice - 100,

  //   balance: this.balance,
  //   profit,
  //   relativeProfit: relativeProfit,

  //   yearlyProfit: profit / timespan.asYears(),
  //   relativeYearlyProfit,

  //   startPrice: this.startPrice,
  //   endPrice: this.endPrice,
  //   trades: this.trades,
  //   startBalance: this.start.balance,
  //   exposure: percentExposure,
  //   sharpe,
  //   downside
  // }

  var message = 'Profit Report.' + 
  '\nTrades: ' + report.trades + 
  '\nOriginal Balance: ' + report.startBalance.toFixed(8) +
  '\nCurrent Balance: ' + report.balance.toFixed(8) +
  '\nProfit: ' + report.profit.toFixed(8) + ' ' + config.watch.currency + ' (' + report.relativeProfit.toFixed(8) + '\%)';

  this.bot.sendMessage(this.chatId, message);
}

Actor.prototype.processAdvice = function(advice) {
  if (advice.recommendation === 'soft') return;
  this.advice = advice.recommendation;
  this.adviceTime = utc();
  this.advicePrice = this.price;
  this.subscribers.forEach(this.emitAdvice, this);
};

if(emitTrades) {
  Actor.prototype.processTradeInitiated = function (tradeInitiated) {
    var message = 'Trade initiated. ID: ' + tradeInitiated.id +
    '\nAction: ' + tradeInitiated.action + '\nPortfolio: ' +
    tradeInitiated.portfolio + '\nBalance: ' + tradeInitiated.balance;
    this.bot.sendMessage(this.chatId, message);
  }
  
  Actor.prototype.processTradeCancelled = function (tradeCancelled) {
    var message = 'Trade cancelled. ID: ' + tradeCancelled.id;
    this.bot.sendMessage(this.chatId, message);
  }
  
  Actor.prototype.processTradeAborted = function (tradeAborted) {
    var message = 'Trade aborted. ID: ' + tradeAborted.id +
    '\nNot creating order! Reason: ' + tradeAborted.reason;
    this.bot.sendMessage(this.chatId, message);
  }
  
  Actor.prototype.processTradeErrored = function (tradeErrored) {
    var message = 'Trade errored. ID: ' + tradeErrored.id +
    '\nReason: ' + tradeErrored.reason;
    this.bot.sendMessage(this.chatId, message);
  }
  
  Actor.prototype.processTradeCompleted = function (tradeCompleted) {
    var message = 'Trade completed. ID: ' + tradeCompleted.id + 
    '\nAction: ' + tradeCompleted.action +
    '\nPrice: ' + tradeCompleted.price +
    '\nAmount: ' + tradeCompleted.amount +
    '\nCost: ' + tradeCompleted.cost +
    '\nPortfolio: ' + tradeCompleted.portfolio +
    '\nBalance: ' + tradeCompleted.balance +
    '\nFee percent: ' + tradeCompleted.feePercent +
    '\nEffective price: ' + tradeCompleted.effectivePrice;
    this.bot.sendMessage(this.chatId, message); 
  }
}

Actor.prototype.verifyQuestion = function(msg, text) {
  this.chatId = msg.chat.id;
  if (text[1].toLowerCase() in this.commands) {
    this[this.commands[text[1].toLowerCase()]]();
  } else {
    this.emitHelp();
  }
};

Actor.prototype.emitStart = function() {
  this.bot.sendMessage(this.chatId, 'Hello! How can I help you?');
};

Actor.prototype.emitBalance = function() {
  this.bot.sendMessage(this.chatId, 'Hello! You suck');
};

Actor.prototype.emitSubscribe = function() {
  if (this.subscribers.indexOf(this.chatId) === -1) {
    this.subscribers.push(this.chatId);
    this.bot.sendMessage(this.chatId, `Success! Got ${this.subscribers.length} subscribers.`);
  } else {
    this.bot.sendMessage(this.chatId, "You are already subscribed.");
  }
};

Actor.prototype.emitUnSubscribe = function() {
  if (this.subscribers.indexOf(this.chatId) > -1) {
    this.subscribers.splice(this.subscribers.indexOf(this.chatId), 1);
    this.bot.sendMessage(this.chatId, "Success!");
  } else {
    this.bot.sendMessage(this.chatId, "You are not subscribed.");
  }
};

Actor.prototype.emitAdvice = function(chatId) {
  let message = [
    'Advice for ',
    config.watch.exchange,
    ' ',
    config.watch.currency,
    '/',
    config.watch.asset,
    ' using ',
    config.tradingAdvisor.method,
    ' at ',
    config.tradingAdvisor.candleSize,
    ' minute candles, is:\n',
  ].join('');
  if (this.advice) {
    message += this.advice +
      ' ' +
      config.watch.asset +
      ' ' +
      this.advicePrice +
      ' (' +
      this.adviceTime.fromNow() +
      ')';
  } else {
    message += 'None'
  }

  if (chatId) {
    this.bot.sendMessage(chatId, message);
  } else {
    this.bot.sendMessage(this.chatId, message);
  }
};

// sent price over to the last chat
Actor.prototype.emitPrice = function() {
  const message = [
    'Current price at ',
    config.watch.exchange,
    ' ',
    config.watch.currency,
    '/',
    config.watch.asset,
    ' is ',
    this.price,
    ' ',
    config.watch.currency,
    ' (from ',
    this.priceTime.fromNow(),
    ')'
  ].join('');

  this.bot.sendMessage(this.chatId, message);
};

Actor.prototype.emitDonate = function() {
  this.bot.sendMessage(this.chatId, telegrambot.donate);
};

Actor.prototype.emitHelp = function() {
  let message = _.reduce(
    this.rawCommands,
    function(message, command) {
      return message + ' ' + command + ',';
    },
    'Possible commands are:'
  );
  message = message.substr(0, _.size(message) - 1) + '.';
  this.bot.sendMessage(this.chatId, message);
};

Actor.prototype.logError = function(message) {
  log.error('Telegram ERROR:', message);
};

module.exports = Actor;
