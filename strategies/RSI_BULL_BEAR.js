/*
	RSI Bull and Bear
	Use different RSI-strategies depending on a longer trend
	3 feb 2017
	
	(CC-BY-SA 4.0) Tommie Hansen
	https://creativecommons.org/licenses/by-sa/4.0/
	
*/

// req's
var log = require ('../core/log.js');
var config = require ('../core/util.js').getConfig();

// strategy
var strat = {
	
// 	// RSI_BULL_BEAR settings:
// config.RSI_BULL_BEAR = {
// 	SMA_long: 1000,
// 	SMA_short: 50,
  
// 	// BULL
// 	BULL_RSI: 10,
// 	BULL_RSI_high: 80,
// 	BULL_RSI_low: 60,
  
// 	// BEAR
// 	BEAR_RSI: 15,
// 	BEAR_RSI_high: 50,
// 	BEAR_RSI_low: 20,
//   };

	/* INIT */
	init: function()
	{
		this.name = 'RSI Bull and Bear';
		this.requiredHistory = config.tradingAdvisor.historySize;
		this.resetTrend();		
		
		// debug? set to flase to disable all logging/messages (improves performance)
		this.debug = false;
		
		// performance
		config.backtest.batchSize = 1000; // increase performance
		config.silent = true;
		config.debug = false;
		
		// add indicators
		this.addIndicator('maSlow', 'SMA', this.settings.SMA_long );
		this.addIndicator('maFast', 'SMA', this.settings.SMA_short );
		this.addIndicator('BULL_RSI', 'RSI', { interval: this.settings.BULL_RSI });
		this.addIndicator('BEAR_RSI', 'RSI', { interval: this.settings.BEAR_RSI });
		
		// debug stuff
		this.startTime = new Date();
		this.stat = {
			bear: { min: 100, max: 0 },
			bull: { min: 100, max: 0 }
		};
		
	}, // init()
	
	// /* LOG */
	// log: function (candle) {
	// 	log.debug('Log function - Candle propertiess:');
	// 	log.debug('\t', 'start:', candle.start);
	// 	log.debug('\t', 'open:', candle.open);
	// 	log.debug('\t', 'high:', candle.high);
	// 	log.debug('\t', 'low:', candle.low);
	// 	log.debug('\t', 'close:', candle.close);
	// 	log.debug('\t', 'vwp:', candle.vwp);
	// 	log.debug('\t', 'volume:', candle.volume);
	// 	log.debug('\t', 'trades:', candle.trades);
	// },

	/* RESET TREND */
	resetTrend: function()
	{
		var trend = {
			duration: 0,
			direction: 'none',
			longPos: false,
		};
	
		this.trend = trend;
	},
	
	/* get lowest/highest for backtest-period */
	lowHigh: function( rsi, type )
	{
		let cur;
		if( type == 'bear' ) {
			cur = this.stat.bear;
			if( rsi < cur.min ) this.stat.bear.min = rsi; // set new
			if( rsi > cur.max ) this.stat.bear.max = rsi;
		}
		else {
			cur = this.stat.bull;
			if( rsi < cur.min ) this.stat.bull.min = rsi; // set new
			if( rsi > cur.max ) this.stat.bull.max = rsi;
		}
	},
	
	
	/* CHECK */
	check: function(candle)
	{
		log.debug('Check function');
		log.debug('-----------------------------------');

		log.debug('Candle propertiess:');

		log.debug('\t', 'start:', candle.start);
		log.debug('\t', 'open:', candle.open);
		log.debug('\t', 'high:', candle.high);
		log.debug('\t', 'low:', candle.low);
		log.debug('\t', 'close:', candle.close);
		log.debug('\t', 'vwp:', candle.vwp);
		log.debug('\t', 'volume:', candle.volume);
		log.debug('\t', 'trades:', candle.trades);

		// get all indicators
		let ind = this.indicators,
			maSlow = ind.maSlow.result,
			maFast = ind.maFast.result,
			rsi;
			
		// BEAR TREND
		if( maFast < maSlow )
		{
			// log.debug('maFast < maSlow');

			rsi = ind.BEAR_RSI.result;
			if( rsi > this.settings.BEAR_RSI_high ) this.short();
			else if( rsi < this.settings.BEAR_RSI_low ) this.long();
			
			if(this.debug) this.lowHigh( rsi, 'bear' );
			log.debug('BEAR-trend');
		}

		// BULL TREND
		else
		{
			// log.debug('maFast > maSlow');

			rsi = ind.BULL_RSI.result;
			if( rsi > this.settings.BULL_RSI_high ) this.short();
			else if( rsi < this.settings.BULL_RSI_low )  this.long();
			if(this.debug) this.lowHigh( rsi, 'bull' );
			log.debug('BULL-trend');
		}

		log.debug('\n');
	
	}, // check()
	
	
	/* LONG */
	long: function()
	{
		if( this.trend.direction !== 'up' ) // new trend? (only act on new trends)
		{
			this.resetTrend();
			this.trend.direction = 'up';
			this.advice('long');
			log.debug('go long');
		}
		
		if(this.debug)
		{
			this.trend.duration++;
			log.debug ('Long since', this.trend.duration, 'candle(s)');
		}
	},
	
	
	/* SHORT */
	short: function()
	{
		// new trend? (else do things)
		if( this.trend.direction !== 'down' )
		{
			this.resetTrend();
			this.trend.direction = 'down';
			this.advice('short');
		}
		
		if(this.debug)
		{
			this.trend.duration++;
			log.debug ('Short since', this.trend.duration, 'candle(s)');
		}
	},
	
	
	/* END backtest */
	end: function(){
		
		let seconds = ((new Date()- this.startTime)/1000),
			minutes = seconds/60,
			str;
			
		minutes < 1 ? str = seconds + ' seconds' : str = minutes + ' minutes';
		
		log.debug('====================================');
		log.debug('Finished in ' + str);
		log.debug('====================================');
		
		if(this.debug)
		{
			let stat = this.stat;
			log.debug('RSI low/high for period');
			log.debug('BEAR low/high: ' + stat.bear.min + ' / ' + stat.bear.max);
			log.debug('BULL low/high: ' + stat.bull.min + ' / ' + stat.bull.max);
		}

	}
	
};

module.exports = strat;