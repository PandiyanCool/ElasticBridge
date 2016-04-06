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

	var inputText = sqlReader.replace(/(\r\n|\n|\r)/gm, "").replace(/\s+/g, ' ').trim();

	var select, sqlFunctions, table, whereFilter, groupBy, orderBy;

	var columnRegex = /.*select\s+(.*)\s+from.*/;

	var columns = inputText.replace(columnRegex, "$1");

	return columns;
}


