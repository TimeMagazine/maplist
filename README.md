# mapList

Display your data in a d3 map/list ranking

## Data

The file `measle_cases.csv` shows the fields required to generate the map list. 

The code will look for the following fields in your CSV:
 1. state 
 2. state_full
 3. number (this is the number that the tool will sort states by, and will appear in tooltip)

## Initializing the map tool

Here's an example of how to use the module.  (Need to add explainers for options)

``` 
	var mapList = mapList = require('./lib/maplist').mapList;

	var data = require('./data/measle_cases.csv');

	var map = mapList('#container',{
		data: data,
		scale: 'ordinal',
		width: interactive.width(),
		headline: 'Map ranking example (Measles Cases)',
		intro: 'Introductory text',
		source: 'Google',
		sourcelink: 'http://google.com',
		dc: true
	});

````