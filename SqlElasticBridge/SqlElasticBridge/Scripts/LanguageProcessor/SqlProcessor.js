
var sqlEditor = ace.edit("sqlEditor");
sqlEditor.setTheme("ace/theme/solarized_dark");
sqlEditor.getSession().setMode("ace/mode/sql");

var elasticEditor = ace.edit("elasticEditor");
elasticEditor.setTheme("ace/theme/solarized_dark");
elasticEditor.getSession().setMode("ace/mode/json");

function sqlProcessor() {
	var sqlReader = $('#sqlEditor > div.ace_scroller').text();
	
	elasticEditor.insert(sqlReader);
}
