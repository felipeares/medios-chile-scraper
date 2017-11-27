'use strict';

var s, cam;

var filters = {
	'low': 95,
	'medium': 85,
	'high': 80,
	'danger': 50
};
var filter_selected = mobilecheck() ? 'low' : 'medium';
var filter = filters[filter_selected];
var originaldata = [];
var boxes = [];
var node_clicked = null;
var word_selected = null;
var weights_stats = [];
var filtered_sites = [];

sigma.classes.graph.addMethod('neighbors', function (nodeId) {
	var k,
	    neighbors = {},
	    index = this.allNeighborsIndex[nodeId] || {};

	for (k in index) {
		neighbors[k] = this.nodesIndex[k];
	}return neighbors;
});

loadGraph();

function mobilecheck() {
  var check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};

function preparingWords(site) {
	// First, clean, create words array and calculate box weight
	return site.data.map(function (box, index) {
		// Remove unwanted characters
		box.text = box.text.replace(/(:|\(|\)|;|\.|,|\]|\[|¿|!|¡|·|\+|-|_|\*|“|'|"|\$|\?)/igm, '').toLowerCase();
		// Repeated words cause duplicate weights
		box.text = box.text.replace('colo colo', 'colo-colo');
		box.text = box.text.replace('cau cau', 'cau-cau');
		// Create array of words filtered by unwanted words
		var unwanted_words = 'a ante antes bajo con contra de desde después despues en es entre hacia hasta para por según sin sobre tras mediante durante el ella la los las ellos ellas él élla nosotros vosotros un una del y al o u este que del es se su | más lo qué está tu le están como cómo emol fue cuál son era todo ver mostrador cooperativa quien quién aun aún the of hay pero sus no si'.split(' ');
		box.words = box.text.split(' ').filter(function (word) {
			return unwanted_words.indexOf(word) === -1 && isNaN(word);
		});
		// Calculate Weights
		// FontSize
		var fweight = box['font-size'] / 24;
		// Location on the screen
		var lweight = getLocationWeight(site.abr, box.y);
		// Tag Tree
		var tweight = getTagsWeight(box['parent-tags']);
		// Final Weight
		box.weight = getPonderationWeight(fweight, lweight, tweight);
		weights_stats.push(box.weight);
		// Return
		return box;
	});
}

function getPonderationWeight(font, loc, tags) {
	var pond_weights = {
		'font': 1,
		'location': 1,
		'tags': 3
	};
	return pond_weights.font * font + pond_weights.location * loc + pond_weights.tags * tags;
}

function getLocationWeight(site, y) {
	var page_height = 740;
	var site_specs = {
		'em': {
			'top_filter': 160
		},
		'lt': {
			'top_filter': 290
		},
		'bb': {
			'top_filter': 300
		},
		'mo': {
			'top_filter': 260
		},
		'co': {
			'top_filter': 300
		},
		'24': {
			'top_filter': 200
		}
	};
	if (y < site_specs[site].top_filter) {
		return 0;
	}
	if (y < page_height) {
		return 1;
	}
	if (y < page_height * 2) {
		return 0.5;
	}
	if (y < page_height * 3) {
		return 0.2;
	}
	if (y < page_height * 4) {
		return 0.1;
	}
	return 0;
}

function getTagsWeight(tags) {
	var tag_score = {
		'a': 0.3,
		'h1': 0.7,
		'h2': 0.5,
		'h3': 0.3,
		'h4': 0.1
	};
	return tags.split(' ').reduce(function (score, tag, index) {
		return score += tag_score[tag] ? tag_score[tag] : 0;
	}, 0);
}

function filterBoxes(boxes, threshold) {
	return boxes.filter(function (box) {
		return box.weight > threshold;
	});
}

function countingWords(boxes) {
	// Sum weights
	var wordCount = {};
	for (var _i = 0; _i < boxes.length; _i++) {
		for (var j = 0; j < boxes[_i].words.length; j++) {
			if (wordCount[boxes[_i].words[j]]) {
				wordCount[boxes[_i].words[j]].weight += boxes[_i].weight;
			} else {
				wordCount[boxes[_i].words[j]] = {
					'weight': boxes[_i].weight
				};
			}
		}
	}

	var sorted_sums = Object.keys(wordCount).sort(function (a, b) {
		return wordCount[b].weight - wordCount[a].weight;
	});
	var return_array = [];
	var weight_threshold = 0;
	for (var _j = 0; _j < sorted_sums.length; _j++) {
		if (wordCount[sorted_sums[_j]].weight >= weight_threshold) {
			return_array.push({ 'word': sorted_sums[_j], 'weight': wordCount[sorted_sums[_j]].weight });
		}
	}
	return return_array;
}

function connectWords(boxes) {
	var connections = {};
	for (var _i2 = 0; _i2 < boxes.length; _i2++) {
		for (var j = 0; j < boxes[_i2].words.length; j++) {
			for (var k = j + 1; k < boxes[_i2].words.length; k++) {
				var wordkey = boxes[_i2].words[j] >= boxes[_i2].words[k] ? boxes[_i2].words[j] + '__' + boxes[_i2].words[k] : boxes[_i2].words[k] + '__' + boxes[_i2].words[j];
				if (connections[wordkey]) {
					connections[wordkey].weight = connections[wordkey].weight + 1;
				} else {
					connections[wordkey] = {
						weight: 1,
						source: boxes[_i2].words[j],
						target: boxes[_i2].words[k]
					};
				}
			}
		}
	}
	return connections;
}

function generateNodes(words_array) {
	var nodes = [];
	for (var i = 0; i < words_array.length; i++) {
		nodes.push({
			id: words_array[i].word,
			label: words_array[i].word,
			x: Math.random() * 0.1,
			y: Math.random() * 0.1,
			size: words_array[i].weight,
			color: 'rgba(100, 100, 100, 0.2)'
		});
	}
	return nodes;
}

function generateEdges(connections) {
	var edges = [];
	Object.keys(connections).forEach(function (key, index) {
		// key: the name of the object key
		// index: the ordinal position of the key within the object 
		if (connections[key].weight > 1) {
			edges.push({
				id: key,
				source: connections[key].source,
				target: connections[key].target,
				size: connections[key].weight,
				color: 'rgba(100, 100, 100, 0.1)',
				type: 'curve',
				hover_color: '#000'
			});
		} else {
			edges.push({
				id: key,
				source: connections[key].source,
				target: connections[key].target,
				size: connections[key].weight,
				color: 'rgba(100, 100, 100, 0.1)',
				type: 'curve',
				hover_color: '#000'
			});
		}
	});
	return edges;
}

function loadVisualization() {
	boxes = filterBoxes(boxes, calculatePercentile(weights_stats, filter));
	var words_array = countingWords(boxes);
	var words_connection = connectWords(boxes);
	var nodes = generateNodes(words_array);
	var edges = generateEdges(words_connection);

	// Hide loader
	$('#prev-loader').hide();

	s = new sigma({
		graph: {
			nodes: nodes,
			edges: edges
		}
	});
	cam = s.addCamera();
	s.addRenderer({
		container: document.getElementById('graph-container'),
		type: 'canvas',
		camera: cam,
		settings: {
			labelThreshold: 1,
			edgeLabelSize: 'proportional',
			maxNodeSize: 10,
			maxEdgeSize: 5,
			defaultLabelSize: '20',
			labelSizeRatio: 4,
			labelSize: 'proportional',
			borderSize: 3,
			mouseWheelEnabled: false,
			defaultLabelColor: '#000'
		}
	});

	// Move camera to left
	cam.goTo({
		x: 15,
		y: 0,
		ratio: 1,
		angle: 0
	});

	// Save the original color
	s.graph.nodes().forEach(function (n) {
		n.originalColor = n.color;
	});
	s.graph.edges().forEach(function (e) {
		e.originalColor = e.color;
	});

	// Add some interactions
	s.bind('clickNode', function (e) {
		// Select node clicked
		node_clicked = e.data.node;
		word_selected = e.data.node.label;

		// Display selection text
		$('#selected-word').text(e.data.node.label);
		$('#graph-col').addClass('word-selected');

		// Color the node and neighbors
		var nodeId = e.data.node.id,
		    toKeep = s.graph.neighbors(nodeId);
		toKeep[nodeId] = e.data.node;

		s.graph.nodes().forEach(function (n) {
			if (toKeep[n.id]) n.color = 'rgba(200, 0, 0, 0.4)';else n.color = 'rgba(100, 100, 100, 0.1)';
		});

		s.graph.edges().forEach(function (e) {
			if (toKeep[e.source] && toKeep[e.target]) e.color = 'rgba(200, 0, 0, 0.2)';else e.color = 'rgba(100, 100, 100, 0.1)';
		});

		s.refresh();

		// Focus the camera
		cam.goTo({
			x: e.data.node['read_cam0:x'],
			y: e.data.node['read_cam0:y'],
			ratio: 0.5,
			angle: 0
		});
	});

	s.bind('clickStage', function (e) {
		// unselect node clicked
		node_clicked = null;
		word_selected = null;
		// Remove selection text
		$('#graph-col').removeClass('word-selected');

		// uncolor the node and neighbors
		s.graph.nodes().forEach(function (n) {
			n.color = n.originalColor;
		});

		s.graph.edges().forEach(function (e) {
			e.color = e.originalColor;
		});

		s.refresh();

		// Camera to origin
		cam.goTo({
			x: 15,
			y: 0,
			ratio: 1,
			angle: 0
		});
	});

	s.bind('overNode', function (e) {
		// If a node has been clicked, do nothing
		if (node_clicked) return;

		// Else, paint nodes
		var nodeId = e.data.node.id,
		    toKeep = s.graph.neighbors(nodeId);
		toKeep[nodeId] = e.data.node;

		s.graph.nodes().forEach(function (n) {
			if (toKeep[n.id]) n.color = 'rgba(200, 0, 0, 0.4)';else n.color = 'rgba(100, 100, 100, 0.1)';
		});

		s.graph.edges().forEach(function (e) {
			if (toKeep[e.source] && toKeep[e.target]) e.color = 'rgba(200, 0, 0, 0.2)';else e.color = 'rgba(100, 100, 100, 0.1)';
		});

		s.refresh();
	});

	s.bind('outNode', function (e) {
		// If a node has been clicked, do nothing
		if (node_clicked) return;

		// Else, unpaint nodes
		s.graph.nodes().forEach(function (n) {
			n.color = n.originalColor;
		});

		s.graph.edges().forEach(function (e) {
			e.color = e.originalColor;
		});

		s.refresh();
	});

	s.startForceAtlas2({
		worker: true,
		barnesHutOptimize: false,
		strongGravityMode: true,
		gravity: 1,
		slowDown: 10,
		iterationsPerRender: 1,
		startingIterations: 1
	});
	setTimeout(function () {
		s.stopForceAtlas2();
	}, 10000);
}

function reloadVisualization() {
	s.graph.clear();
	s.kill();
	s = null;
	boxes = [];
	weights_stats = [];

	var jsonresult = JSON.parse(JSON.stringify(originaldata));
	jsonresult.sites.forEach(function (item, index) {
		if (filtered_sites.indexOf(item.abr) === -1) {
			boxes = boxes.concat(preparingWords(item));
		}
	});

	loadVisualization();
}

function calculatePercentile(array, percentile) {
	array.sort();
	var array_length = array.length;
	for (var index = 0; index < array_length; index++) {
		if (index / array_length * 100 >= percentile) {
			return array[index];
		}
	}
	return array[array_length - 1];
}

function loadGraph() {
	var url = 'https://s3-us-west-2.amazonaws.com/medios-scraper/latest/data.json?v=' + Math.random();
	// const url = "data/data.json";
	$.getJSON(url, function (jsonresult) {
		originaldata = JSON.parse(JSON.stringify(jsonresult));
		jsonresult.sites.forEach(function (item, index) {
			boxes = boxes.concat(preparingWords(item));
		});
		loadSitesButtons();
		loadDensityButtons();
		loadVisualization();
		updateTime();
	});
}

function loadDensityButtons() {
	$('.selector-button').each(function (index) {
		if ($(this).data('filter')===filter_selected) {
			$(this).addClass('selected');
		}
	});
}

function loadSitesButtons() {
	$('#medios-info-footer').html('');

	originaldata.sites.forEach(function (item, index) {
		$('#sites-container').append('<a href="javascript:" class="sites-button selected" data-filter="' + item.abr + '">' + item.name + '</a>');

		$('#medios-info').append('<li>' + item.name + '<strong> <a href="' + item.url + '" target="_blank">' + item.url + '</a></strong></li>');

		$('#medios-info-footer').append(item.name + '<br>');
	});

	$('.sites-button').click(function () {
		var site_selected = $(this).data('filter').toString();

		if (filtered_sites.indexOf(site_selected) === -1) {
			filtered_sites.push(site_selected);
			$(this).removeClass('selected');
		} else {
			filtered_sites.splice(filtered_sites.indexOf(site_selected), 1);
			filtered_sites.filter(function (site) {
				return site !== site_selected;
			});
			$(this).addClass('selected');
		}

		reloadVisualization();
	});
}

function loadModalWithNews() {
	$('#modal-news-container').html('');
	$('#modal-word-selected').text(word_selected);

	originaldata.sites.forEach(function (sites_item, sites_index) {
		sites_item.data.forEach(function (item, index) {
			if (RegExp('\\b'+ word_selected.replace('-',' ') +'\\b').test(item.text.toLowerCase().replace('-',' '))) {
				$('#modal-news-container').append('<div class="modal-news-box">' + item.text + '<div class="site">' + sites_item.name + '</div></div>');
			}
			/*
			if (item.text.toLowerCase().indexOf(word_selected) !== -1) {
				$('#modal-news-container').append('<div class="modal-news-box">' + item.text + '<div class="site">' + sites_item.name + '</div></div>');
			}
			*/
		});
	});
}

function updateTime() {
	var date = new Date(originaldata.date_finished.replace(' ', 'T'));
	var now = new Date();
	$('#act-time').html('<i class="fa fa-clock-o"></i> Actualizado hace ' + Math.round((now - date) / 1000 / 60) + ' minutos');
}

// Standalone JQuerys
$('#moreinfo-container a').click(function () {
	if (node_clicked && word_selected) {
		loadModalWithNews();
	}
});

$('.selector-button').click(function () {
	$('.selector-button').removeClass('selected');
	$(this).addClass('selected');
	filter = filters[$(this).data('filter')];
	reloadVisualization();
});