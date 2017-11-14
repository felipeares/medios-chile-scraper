const express = require('express');
const app = express();
var path = require("path");

app.get('/', function (req, res) {
	res.sendFile(path.join(__dirname+'/visualization/index.html'));
});

app.use(express.static('visualization'));

app.listen(3000, function () {
	console.log('Example app listening on port 3000!');
});
