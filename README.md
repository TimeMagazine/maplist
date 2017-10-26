# mapList

Display your data in a d3 map/list ranking

## Data

The file [childbirth_allowed_vaginal.csv](https://github.com/TimeMagazine/maplist/blob/master/data/example/childbirth_allowed_vaginal.csv) shows the fields required to generate the map list. At the least, you need a `state` field and a field denoting numerical value.

## Initializing the map tool

Here's an example of how to use the module.  (Need to add explainers for options)

In node:
``` 
	import mapList from './lib/maplist';
```

In browser:

1. Build:
```	
	npm run build
```

2. Import
```
	<script src="script.js" charset="utf-8"></script>
	var map = TIMEMapList.default("#container", options)
```

Available Options:
```			
	options = {
		data: './data/example/childbirth_allowed_vaginal.csv', // You can pass in URL or Array
		data_field: 'Average', // Field in each object to use for ranking.
		data_parse_dangerously: true, // This will clean up numbers by removing all non-numerical values.
		tooltip_title: 'Average Price for Vaginal Delivery', // Title for Tooltip
		scale: 'ordinal', // Default Scale to Use.
		width: 600, //Width of graphic, in prod using `interactive.width()`
		headline: 'Average Price for Vaginal Delivery', //Main Headline to Use
		intro: '', //Description (if reqd.)
		source: 'FAIR Health', //Small source text at the botton
		sourcelink: 'https://www.fairhealth.org/', //Link for Source Text
		strFormat: (d) => {return `$${Number(d.toFixed(0)).toLocaleString()}`}, //Use this to format raw numbers to values for tooltip (Here - value is convereted to currency)
		legend_domain: ['Top 20%','20%+','40%+', '60%+', 'Bottom 20%'], // Provide custom domain for legend.
		sortValues: 'ascending', //Sort Raw Values - Rank most expensive as 1
		sortStates: 'ascending', //Sort Ranks - Show most expensive to least expensive
		dc: true //If DC is expected - will throw error if DC is not found in data.
	}
````