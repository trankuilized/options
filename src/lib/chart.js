import { get } from 'svelte/store'

import { product } from '../stores/order'
import { positions } from '../stores/positions'

let resolution = 900; // 15 min
let candles = []; // current candle set

let chart;
let candlestickSeries;

export function initChart() {

	let script = document.createElement("script");
	script.setAttribute("src", "https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js");
	document.body.appendChild(script);

	script.addEventListener("load", scriptLoaded, false);

	function scriptLoaded() {

		chart = LightweightCharts.createChart(document.getElementById('chart'), { width: 600, height: 400 });
		chart.resize(600, 400);

		candlestickSeries = chart.addCandlestickSeries();

		function onVisibleLogicalRangeChanged(newVisibleLogicalRange) {
			//console.log('lvc', newVisibleLogicalRange);
		    // returns bars info in current visible range
		    const barsInfo = candlestickSeries.barsInLogicalRange(newVisibleLogicalRange);
		    //console.log(barsInfo);
		    if (barsInfo !== null && barsInfo.barsBefore < 2) {
	            // try to load additional historical data and prepend it to the series data
	            console.log('load additional data to the left');
	            // use setData with additional data prepended
	        }
		}

		function onVisibleTimeRangeChanged(newVisibleTimeRange) {
			//console.log('vc', newVisibleTimeRange);
		}

		chart.timeScale().subscribeVisibleTimeRangeChange(onVisibleTimeRangeChanged);

		chart.timeScale().subscribeVisibleLogicalRangeChange(onVisibleLogicalRangeChanged);

		console.log('chart loaded');

	}

}

export async function loadCandles(_resolution, start, end) {

	const _product = get(product).symbol;

	if (!candlestickSeries || !_product) {
		// try again
		console.log('nope');
		setTimeout(() => {
			loadCandles(_resolution, start, end);
		}, 1000);
		return;
	}

	if (_resolution) _resolution = resolution;

	console.log('_product', _product);

	start = new Date(Date.now() - 48 * 60 * 60 * 1000).toString();
	end = new Date().toString();

	const response = await fetch(`https://api.exchange.coinbase.com/products/${_product}/candles?granularity=${resolution}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
	const json = await response.json();

	console.log('json', json);

	candles = [];
	for (const item of json) {
		candles.push({
			time: item[0],
			low: item[1],
			high: item[2],
			open: item[3],
			close: item[4]
		});
	}

	candles.reverse();

	//console.log('data', data);

	// set data
	candlestickSeries.setData(candles);

	//chart.timeScale().fitContent();

}

export function onNewPrice(price, timestamp, _product) {
	// add data point to current candle set
	// use update with time = last time for this resolution
	// get last data point to update ohlc values based on given data point

	//candlestickSeries.update({ time: '2019-01-01', open: 60.71, high: 60.71, low: 53.39, close: 59.29 });

	const symbol = get(product).symbol;

	if (_product != symbol) return;

	let lastCandle = candles[candles.length - 1];

	timestamp = timestamp/1000;

	if (timestamp >= lastCandle.time + resolution) {
		// new candle
		let candle = {
			time: parseInt(resolution * parseInt(timestamp/resolution)),
			low: price,
			high: price,
			open: price,
			close: price
		}
		candles.push(candle);
		candlestickSeries.update(candle);
	} else {
		// update existing candle
		if (lastCandle.low > price) lastCandle.low = price;
		if (lastCandle.high < price) lastCandle.high = price;
		lastCandle.close = price;

		candles[candles.length - 1] = lastCandle;
		candlestickSeries.update(lastCandle);
	}

}

export function loadPositionLines() {

	const priceLine = candlestickSeries.createPriceLine({
	    price: 80.0,
	    color: 'green',
	    lineWidth: 2,
	    lineStyle: LightweightCharts.LineStyle.Dotted,
	    axisLabelVisible: true,
	    title: 'Position',
	});

}