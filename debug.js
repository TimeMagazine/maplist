import {select, event, mouse} from "d3-selection";

var d3 = require('d3'),  // need to reduce to d3-geo
	topojson = require('topojson'),
	elasticSvg = require('elastic-svg');

require("./src/styles.less");

var mapList = async function(container, opts) {
	
	if (!container) {
		console.log("You must supply mapList a container as the first argument");
		return null;
	}
	
	//MARKUP
	var templates = {
		base: require('./src/base.html'),
		tooltip: require('./src/tooltip.html'),
		state: require('./src/smallstate.html')
	};
	
	opts = opts || {};	
	
	if (!opts.headline) {
		console.log("You must supply mapList with a headline");
		return null;
	}
	var element = select(container).html(templates.base(opts));
	element.attr('class','maplist') // this applies the CSS

	// SCALE
	var color = opts.scale == 'linear' ? d3.scaleLinear() : d3.scaleOrdinal()
		.domain(opts.domain ? opts.domain : ['0.2','0.4','0.6','0.8','1'])
		.range(opts.range ? opts.range : ["#82d0a4","#cee2cc","#f7d197","#ffa34a","#fd695a"])

	// DATA
	if (!opts.data) {
		console.log("You must supply data for the ranking tool");
		return null;
	};

	function fetchData(url){
		return new Promise((resolve, reject) => {
			if(url.endsWith('json')) {
				d3.json(url), (d) => {
					resolve(d)
				};
			}
			else if(url.endsWith('csv')) {
				d3.csv(url, (d) => {
					resolve(d) 
				});
			}
			else {
				throw(`Invalid data file provided ${opts.data}`)
				reject()
			}
		})
	}

	if (typeof(opts.data) == 'string') {
		opts.data = await fetchData(opts.data)
	}
	
	let data_field = opts.data_field || 'number';
	let value_sort_func = opts.sortValues == 'descending' ? d3.descending : d3.ascending
	let state_sort_func = opts.sortStates == 'descending' ? d3.descending : d3.ascending

	opts.data = opts.data.map(d => {
		if (opts.data_parse_dangerously){				
			let val = d[data_field]
			d[data_field] = Number(val.replace(/[^0-9\.-]+/g,""));
		}
		if (opts.strFormat){
			d['number_fmt'] = opts.strFormat(d[data_field])
		}
		else d['number_fmt'] = str(d[data_field])
		return d
	})
	
	var data = opts.data.sort(function(a,b){
		return value_sort_func(parseFloat(a[data_field]),parseFloat(b[data_field]))
		//return parseFloat(a[data_field]) - parseFloat(b[data_field]);
	});

		
	var dataObject = {};
	data.forEach(function(d, i){
		dataObject[d.state] = d;
		dataObject[d.state].rank = i+1;
		dataObject[d.state].color = getColor(i); // Find state's percentile based on rank;
		dataObject[d.state].tooltip_title = opts.tooltip_title ? opts.tooltip_title : 'Number of cases'
	});

	function getColor(i){
		var result = '';
		color.domain().reverse().forEach(function(d){
			if ((i/51) < parseFloat(d)){ result = color(d) } 
		});
		return result;
	};

	// TOOLTIP AND ITS BEHAVIOR
	var tooltip = select("body")
		.append("div").classed("d3tooltip", true)
		.on('click',function(d){ tooltip.style("visibility", "hidden");});

    d3.selection.prototype.tooltip = function(over, out, click) {       
		this //.on("click", function(d) { tooltip.html(typeof f === "function" ? f(d) : f); tooltip.classed("clicked", "true"); tooltip.style("visibility", "visible"); })          
			.on("mousemove.d3tooltip", function(e,i,j) { 
				// check to see if mouse is halfway accross page to determine direction of tooltip
				if (d3.mouse(element.node())[0] > width/2){
				    return tooltip.style("top", (d3.event.pageY-35)+"px").style("left",(d3.event.pageX - 190)+"px");
				} else {
				    return tooltip.style("top", (d3.event.pageY-35)+"px").style("left",(d3.event.pageX + 10)+"px");
				}
			})
			.on("mouseover.d3tooltip", function(d, i, j) { 
				var html = typeof over === "function" ? over(d, i, this, j) : over;
				tooltip.html(html); 
				if (html && html !== "") {
				    tooltip.style("visibility", "visible");
				} else {
				    tooltip.style("visibility", "hidden");
				}
			})
			.on("mouseout.d3tooltip", function(d, i) {          
				if (!is_touch_device()){
				    if (out) {
				        out(d, i, this);
				    }
				    return tooltip.style("visibility", "hidden");
				}
			});
		return this;
    };

	var chPadding =  {top: 20, right: 15, bottom: 20, left: 15},
		width = opts.width,
		height = width * 0.72,
		scale = width/.75;

	// LEGENDS
	var legendDomain = opts.legend_domain ? opts.legend_domain : ['Bottom 20%','20%+','40%+', '60%+', 'Top 20%'];

	var div = select(container + ' .legend');
	div.selectAll(".item")
		.data(legendDomain)
		.enter()
		.append("div")
		.html(function(d,i){
			// Need to add heatmap style legend for linear rankings, this only supports ordinal 
			return '<span class="block" style="background-color:'+color.range()[4-i]+';"></span><span class="text">'+d+'</span>'
		});

	// GEOGRAPHY
	var geo = require(opts.dc ? './data/json/states.json' : './data/json/states_nodc.json'),
		labelPositions = require('./data/json/statelabels.json');
	var states = topojson.feature(geo, geo.objects.us_states);
	
	var projection = d3.geoAlbersUsa()
		.translate([width / 2, height / 2.75])
		.scale(scale);
	var path = d3.geoPath().projection(projection);

	var smallStates = opts.smallstates ? opts.smallstates :['MA','CT','RI','DE','MD','DC'];

	if (opts.dc && !dataObject.hasOwnProperty('DC')) throw 'Washington, D.C. is included but data is missing.';
	
	smallStates = smallStates.filter(d => {
		return dataObject.hasOwnProperty(d)
	});

	states.features = states.features.filter(d => {
		return dataObject.hasOwnProperty(d.properties.name)		
	});

	states = states.features.sort(function(a,b){
		return state_sort_func(dataObject[b.properties.name].rank, dataObject[a.properties.name].rank);
	});

	// ************ Svg and its contents ************** //
	var b = elasticSvg(container +  " .map", {
		onResize: function(w, h, s) {
			render(w,h);
		}
	});

	// Create parent group to translate
	var parentGroup = select(b.svg).append("g")
		.attr('class','parentgroup')


	// States
	var group = parentGroup.selectAll("g")
		.data(states)
		.enter()
		.append("g")
		.attr('class','group')

	var statesSVG = group.append("svg:path")
		.attr('d', path)
		.style('fill', function(d) {
			return dataObject[d.properties.name].color;
		})
		.attr('class', function(d) {
			d.bounds = this.getBBox();
			return 'state'
		})
		.tooltip(
			function(d, i, obj){
				return templates.tooltip(dataObject[d.properties.name]);
			},
			function() {
			}
		)

	var smallStatesDiv = select(container+' .smallstates');
	smallStatesDiv.selectAll('.item')
		.data(smallStates)
		.enter()
		.append('div')
		.html(function(d,i){
			dataObject[d].postal = d;
			return templates.state(dataObject[d]);
		})
		.tooltip(
			function(d, i, obj){
				return templates.tooltip(dataObject[d]);
			},
			function() {
			}
		);
	
	// State labels	
	var stateLabels = group.append("text")
		// .text(function(d){ return smallStates.indexOf(d.properties.name) > -1 ? '' : d.properties.name })
		.text(function(d){
			if (d.properties) {return d.properties.name} })
		.attr('transform',function(d){
			d.box = this.getBBox();
			d.path = path.centroid(d);
			return "translate("+ path.centroid(d)[0] + ","+ path.centroid(d)[1]+")";
		})
		.attr('class', 'label')
		.tooltip(
			function(d, i, obj){
				return templates.tooltip(dataObject[d.properties.name]);
			},
			function() {
			}
		)

	// Create parent group to contain labels
	var categoryGroup = parentGroup.append("g")
		.attr('class','categorygroup')    	

	// Categories over states for individual map view
	var categories = categoryGroup.selectAll('category')
		.data(states)
		.enter()
		.append("text")
		.attr('class','category')
		.style('opacity', 0)
		.text(function(d, i){
			return dataObject[d.properties.name].number_fmt;
		});

	// ************ Render both views **************** //

	// Original map width
	var oldMapWidth = select(b.svg).node().getBBox().width;
	var scales = {}

	parentGroup.attr("transform", function(d) { 
		return "translate("+chPadding.left/2+","+chPadding.top+")scale(1)"
	})

	function render(width, ht) {			
		// Map
		var secondClass = select(container + ' .button-group .second').attr('class');
		
		if (secondClass.indexOf('active') > -1){
			// Hide categories
			categories
				.transition().duration(200)
				.style('opacity', 0)
		
			// Reset positoin of state groups
			group
				.transition().duration(1800)
				.style("stroke-width", 1.5)  
				.attr("transform", function(d) { 
					return "translate(0,0)";
				})

			// Restore state borders
			statesSVG
				.attr('opacity', 1)
				.style('stroke-width',1.5)
			
			// Resize state stateLabels
			let translateT = 0;
			stateLabels
				.transition().duration(1800)
				.attr("y",0)
				.attr("opacity",function(d){
					return is_touch_device() ||  smallStates.indexOf(d.properties.name) > -1 ? 0 : 1;
				})
			 	.attr("transform", function(d, i) {
			 		var state = d.properties.name;
			 		if (labelPositions[state]){
						return "translate(" + (d.path[0] +  labelPositions[state].x) + "," + (d.path[1] + labelPositions[state].y) + ")rotate(" + labelPositions[state].r  + ")";
					} else {
						return "translate("+ d.path[0] + ","+ d.path[1]+")scale(" + 1 + ")"; 
					};                
			 	});

			// Bring up position of summary section
			select(container+ ' .map svg').transition().duration(1000).attr('height', width * 0.65);
			
			var mapScale = width/(oldMapWidth)// +  chPadding.right + chPadding.left);
		
			parentGroup.attr("transform", function(d) { 
				return "translate("+chPadding.left/2+","+chPadding.top+")scale("+ mapScale +")"
			})
			select(container+' .smallstates')
				.transition().duration(200)
				.style('opacity', 1)
	
		} else { // Individual states views

			// parentGroup.attr("transform", function(d) { 
			// 	return "translate("+chPadding.left+","+chPadding.top+")scale(1)"
			// })
			select(container+' .smallstates')
				.transition().duration(200)
				.style('opacity', 0)

			var IDEAL_WIDTH = 38,
				padding = width < 500 ? 20 : 10,
				block = width < 500?  65 : 65;
		
			// State paths
			var step = 0,
				w = 0,
				count = 0;
		
			// Reposition and scale groups
			group
			 	.transition().duration(1800)
			 	.attr("transform", function(d, i) { 
			 		var scaling = d.bounds.width > d.bounds.height ? IDEAL_WIDTH / d.bounds.width : IDEAL_WIDTH / d.bounds.height;
					scales[d.properties.name] = scaling;
					if (i > 0) { 
						w = w + block *1.1 + padding;
						count += 1
					}
					if (w >= width){
						step += 1;
						w = 0;
						count = 0;
					}
					return "translate(" + (- d.bounds.x * scaling + block * 1.1 * count+ padding)  + "," + (-d.bounds.y * scaling + step * block ) +")scale(" + scaling + ")"; 
			 	})

			// Scale state labels
			stateLabels
				.transition().duration(1800)
				.attr('y', function(d){
					return 5;
				})
				.attr("transform", function(d, i) { 
					var scale = 2.2/scales[d.properties.name];
					return "translate("+ (d.path[0]) + ","+ (d.path[1]) +")scale(" + scale + ")"; 
				})
				.attr('opacity',1)
		
			// Category labels
			var step = 0,
				w = 0,
				count = 0;

			// Remove state borders
			statesSVG
				.attr('opacity', 1)
				.style('stroke-width',0)
			
			categories 	
			 	.attr('transform', function(d, i){
					if (i > 0) { 
						w = w + block *1.1 + padding;
						count += 1
					}
					if (w >= width){
						step += 1;
						w = 0;
						count = 0;
					}
					return "translate(" + (block * 1.1 * count+ padding)  + "," + ((step * block)-5)  +")"; 
				})
				.transition().duration(500).delay(800)
				.style('opacity', 1)

			select(container+ ' .map svg').transition().attr('height', ((step+ 1) * block ));
		}
	}

	// ************ Timeline and its functions **************** //
	// var range = [];
	// var bymonthFormat = d3.nest().key(function(d) {
	// 	if (range.indexOf(d.date) <= -1){
	// 		range.push({
	// 			date: d.date
	// 		})
	// 	}
	// 	return yearFormat(d.date);
	// }).entries(timelineData);

	// var minmonthFormat = d3.min(bymonthFormat, function(d) { return d.key; }),
	// 	maxmonthFormat = d3.max(bymonthFormat, function(d) { return d.key; });

	// // Put range in order
	// range = range.sort(function(a,b){
	// 	return a.date - b.date;
	// });

	var buttons = d3.selectAll(container + ' li.button');

	buttons.on('click',function(d){
		buttons.classed('button', true)
		buttons.classed('active', false)

		d3.select(this).classed("active", !d3.select(this).classed("active"))
		render(width);
	});

	// First click 
	setTimeout(function(){
		select(container +' .button-group .first').dispatch("click");
	},200);

	// return {
		// return things here?
	// }
}


function is_touch_device() {
    return 'ontouchstart' in window // works on most browsers 
        || navigator.maxTouchPoints; // works on IE10/11 and Surface
};

export default mapList