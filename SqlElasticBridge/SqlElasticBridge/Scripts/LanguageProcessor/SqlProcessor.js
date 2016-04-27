// Sql Processor
var sqlEditor = ace.edit("sqlEditor");
sqlEditor.setTheme("ace/theme/sqlserver");
sqlEditor.getSession().setMode("ace/mode/sql");
sqlEditor.getSession().setUseWrapMode(true);

var elasticEditor = ace.edit("elasticEditor");
elasticEditor.setTheme("ace/theme/solarized_dark");
elasticEditor.getSession().setMode("ace/mode/json");
elasticEditor.setReadOnly(true);

function clearInput() {
	sqlEditor.setValue('');
	elasticEditor.setValue('');
}

// Method to read the sql queries and return converted Elasticsearch queries
function sqlProcessor() {
	var sqlReader = $('#sqlEditor > div.ace_scroller').text();

	if (sqlReader === "" || sqlReader.indexOf(' join ')>0) {
		$("#AlertBox").fadeIn();

		window.setTimeout(function () {
			$("#AlertBox").fadeOut(3000);
		}, 3000);

// ReSharper disable once UnusedLocals
		var error = sqlReader === "" ? $('#AlertBox').text('Please provide valid sql queries.')
			: $('#AlertBox').text('This relational query is not supportted.');

		console.log($('#AlertBox').val());

		return true;
	}

	var elasticData = sqlParser(sqlReader);
	elasticEditor.insert(elasticData);

	return true;
}

// Parser to parse the sql queries
function sqlParser(sqlReader) {

	var select = '', table = '', whereFilter = '', groupBy = '', orderBy = '';

	var inputText = sqlReader.replace(/(\r\n|\n|\r)/gm, "").replace(/\s+/g, ' ').trim().toLowerCase();

	var columnRegex = /.*select\s+(.*)\s+from.*/;
	select = inputText.replace(columnRegex, "$1").split(',');

	var tableRegex = /(.*from\s+)(.*)/;
	table = inputText.replace(tableRegex, "$2").split(' ')[0];

	var sqlQuery = inputText.toLowerCase().split(/select|from|where|group by|order by/);

	if (inputText.indexOf('where') > 0 && inputText.indexOf('group by') > 0 && inputText.indexOf('order by') > 0) {
		whereFilter = sqlQuery[3] ? sqlQuery[3].replace(/\n/g, '').split('and ') : "";
		groupBy = sqlQuery[4] ? sqlQuery[4].replace(/\n| /g, '').split(',') : "";
		orderBy = sqlQuery[5] ? sqlQuery[5].replace(/\n| /g, '').split(',') : "";
	}

	else if (inputText.indexOf('group by') > 0 && inputText.indexOf('order by')>0) {
		groupBy = sqlQuery[3] ? sqlQuery[3].replace(/\n| /g, '').split(',') : "";
		orderBy = sqlQuery[4] ? sqlQuery[4].replace(/\n| /g, '').split(',') : "";
	}

	else if (inputText.indexOf('where') > 0 && inputText.indexOf('group by') > 0) {
		whereFilter = sqlQuery[3] ? sqlQuery[3].replace(/\n/g, '').split('and ') : "";
		groupBy = sqlQuery[4] ? sqlQuery[4].replace(/\n| /g, '').split(',') : "";
	}

	else {
		whereFilter = sqlQuery[3] ? sqlQuery[3].replace(/\n/g, '').split('and ') : "";
		groupBy = sqlQuery[4] ? sqlQuery[4].replace(/\n| /g, '').split(',') : "";
		orderBy = sqlQuery[5] ? sqlQuery[5].replace(/\n| /g, '').split(',') : "";
	}

	// aggregating the sql function

	var functionSelect = [];
	var i;
	for (i = 0; i < select.length; i++) {
		var matcher = select[i].match(/sum\(|avg\(|min\(|max\(/g);
		if (matcher) {
			functionSelect.push(matcher[0].replace(/\(/, ''));
			functionSelect.push(select[i].replace(matcher[0], '').replace(')', ''));
		}
	}

	// where filters are formatted in filter search
	var filters = [];
	for (i = 0; i < whereFilter.length; i++) {
		filters.push(whereFilter[i].replace(/\(|\)/g, '').split(/= |in|,/));
	}

	// creating elasticsearch query object

	var elasticSearchQuery = aggregationFormation(whereOject(filters, groupbyObject(groupBy, sqlFunctionObject(functionSelect))));

	return JSON.stringify(elasticSearchQuery, null, '\t');

}

// formation of outer most object

var aggregationFormation = function (object) {
	var aggregationObject = {};
	aggregationObject['aggs'] = object;
	return aggregationObject;
}

// formation of where aggregation oject

var whereOject = function (array, object) {
	var whereArray = array.slice(0);
	if (whereArray.length === 0) {
		return object;
	}
	else {
		var term;
		var terms;
		var whereData;
		var termWhereData;
		var whereField;
		var termsArray;
		var t;
		if (whereArray.length === 1) {
			var objectData;
			objectData = {}, term = {}, terms = {};
			whereData = whereArray[0];
			termWhereData = whereData[0].replace(/ /g, '');
			term[termWhereData] = whereData[1].replace(/\\|\'| /g, '');
			if (whereData.length === 2) {
				whereField = 'filter_' + term[termWhereData];
				objectData[whereField] = { "filter": { "term": term }, "aggs": object };
			}
			else {
				termsArray = [];
				for (t = 0; t < whereData.length - 1; t++) {
					termsArray.push(whereData[t + 1].replace(/ /g, ''));
				}
				terms[termWhereData] = termsArray;
				whereField = 'filter_' + termWhereData + '_multiple';
				objectData[whereField] = { "filter": { "terms": terms }, "aggs": object };
			}
			return objectData;
		}
		else {
			term = {};
			terms = {};
			var aggregation = {};
			whereData = whereArray.shift();
			termWhereData = whereData[0].replace(/ /g, '');
			term[termWhereData] = whereData[1].replace(/\\|\'| /g, '');
			if (whereData.length === 2) {
				whereField = 'filter_' + termWhereData + '_' + term[termWhereData];
				aggregation[whereField] = { "filter": { "term": term }, "aggs": whereOject(whereArray, object) };
			}
			else {
				termsArray = [];
				for (t = 0; t < whereData.length - 1; t++) {
					termsArray.push(whereData[t + 1].replace(/ /g, ''));
				};
				terms[termWhereData] = termsArray;
				whereField = 'filter_' + termWhereData + '_multiple';
				aggregation[whereField] = { "filter": { "terms": terms }, "aggs": whereOject(whereArray, object) };
			}
			return aggregation;
		}
	}
}

// formation of gropuby aggregation object

var groupbyObject = function (array, object) {
	var groupArray = array.slice(0);
	if (groupArray.length === 0) {
		return object;
	}
	else {
		var groupByName;
		if (groupArray.length === 1) {
			var obj = {};
			groupByName = 'agg_' + groupArray[0];
			obj[groupByName] = { "terms": { "field": groupArray[0] }, "aggs": object };
			return obj;
		}
		else {
			var aggs = {};
			var groupByField = groupArray.shift();
			groupByName = 'agg_' + groupByField;
			aggs[groupByName] = { "terms": { "field": groupByField }, "aggs": groupbyObject(groupArray, object) };
			return aggs;
		}
	}
}

// formation of select field object

var sqlFunctionObject = function (functionSelect) {
	var functionSelectObject = {}, wrapper = {};
	functionSelectObject[functionSelect[0]] = { "field": functionSelect[1] };
	wrapper[functionSelect[0] + '_' + functionSelect[1]] = functionSelectObject;
	return wrapper;
}

