// Sql Processor
var sqlEditor = ace.edit("sqlEditor");
sqlEditor.setTheme("ace/theme/solarized_dark");
sqlEditor.getSession().setMode("ace/mode/sql");

var elasticEditor = ace.edit("elasticEditor");
elasticEditor.setTheme("ace/theme/solarized_dark");
elasticEditor.getSession().setMode("ace/mode/json");

// Method to read the sql queries and return converted Elastic queries
function sqlProcessor() {
	var sqlReader = $('#sqlEditor > div.ace_scroller').text();
	var elasticData = sqlParser(sqlReader);
	elasticEditor.insert(elasticData);
}

// Parser to parse the sql queries
function sqlParser(sqlReader) {

	var select = '', table = '', whereFilter = '', groupBy = '', orderBy = '';

	var inputText = sqlReader.replace(/(\r\n|\n|\r)/gm, "").replace(/\s+/g, ' ').trim();

	var sqlQuery = inputText.toLowerCase().split(/select|from|where|group by|order by/);

	select = sqlQuery[1] ? sqlQuery[1].replace(/\n| /g, '').split(',') : "";
	table = sqlQuery[2] ? sqlQuery[2].replace(/\n| /g, '').split(',') : "";
	whereFilter = sqlQuery[3] ? sqlQuery[3].replace(/\n/g, '').split('and ') : "";
	groupBy = sqlQuery[4] ? sqlQuery[4].replace(/\n| /g, '').split(',') : "";
	orderBy = sqlQuery[5] ? sqlQuery[5].replace(/\n| /g, '').split(',') : "";
	console.log(select, table, whereFilter, groupBy, orderBy);

	// aggregating the sql function

	var functionSelect = [];
	var i;
	for (i = 0; i < select.length; i++) {
		var m = select[i].match(/sum\(|avg\(|min\(|max\(/g);
		if (m) {
			functionSelect.push(m[0].replace(/\(/, ''));
			functionSelect.push(select[i].replace(m[0], '').replace(')', ''));
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
				whereField = 'where_' + termWhereData + '_' + term[termWhereData];
				objectData[whereField] = { "filter": { "term": term }, "aggs": object };
			}
			else {
				termsArray = [];
				for (t = 0; t < whereData.length - 1; t++) {
					termsArray.push(whereData[t + 1].replace(/ /g, '')); // purposefully not removing quotes here
				}
				terms[termWhereData] = termsArray;
				whereField = 'where_' + termWhereData + '_multiple';
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
				whereField = 'where_' + termWhereData + '_' + term[termWhereData];
				aggregation[whereField] = { "filter": { "term": term }, "aggs": whereOject(whereArray, object) };
			}
			else {
				termsArray = [];
				for (t = 0; t < whereData.length - 1; t++) {
					termsArray.push(whereData[t + 1].replace(/ /g, ''));
				};
				terms[termWhereData] = termsArray;
				whereField = 'where_' + termWhereData + '_multiple';
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
			groupByName = 'group_by_' + groupArray[0];
			obj[groupByName] = { "terms": { "field": groupArray[0] }, "aggs": object };
			return obj;
		}
		else {
			var aggs = {};
			var groupByField = groupArray.shift();
			groupByName = 'group_by_' + groupByField;
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










