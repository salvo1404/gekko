var method = {};

var log = require('../core/log.js');

method.init = function() {
  this.name = 'Triple Moving Average';
  this.requiredHistory = this.settings.long;

  this.addIndicator('short', 'SMA', this.settings.short)
  this.addIndicator('medium', 'SMA', this.settings.medium)
  this.addIndicator('long', 'SMA', this.settings.long)
}

method.log = function(candle) {
  var digits = 8;
  var uo = this.indicators.uo;

  log.debug('calculated Ultimate Oscillator properties for candle:');
}

method.update = function(candle) {
  this.indicators.short.update(candle.close)
  this.indicators.medium.update(candle.close)
  this.indicators.long.update(candle.close)
}

method.check = function(candle) {

  console.log(candle);
  // const short = this.indicators.short.result;
  // const medium = this.indicators.medium.result;
  // const long = this.indicators.long.result;

  // // TralingStop works with minute candle
  // // this.advice({
  // //   direction: 'long', // or short
  // //   trigger: { // ignored when direction is not "long"
  // //     type: 'trailingStop',
  // //     trailPercentage: 5
  // //     // or:
  // //     // trailValue: 100
  // //   }
  // // });

  // if((short > medium) && (medium > long)) {
  //   this.advice('long')
  // } else if((short < medium) && (medium > long)) {
  //   this.advice('short')
  // } else if(((short > medium) && (medium < long))) {
  //   this.advice('short')
  // } else {
  //   this.advice();
  // }
}

module.exports = method;
