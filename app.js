var _ = require("underscore");
var express = require("express");
var socketio = require("socket.io");
var mongoose = require("mongoose");

var expressServer = express.createServer()
expressServer.use(express.bodyParser());
expressServer.use(express.errorHandler());
expressServer.use(express.static(__dirname + "/public"));

var io = socketio.listen(expressServer);

var mongo = mongoose.createConnection('mongodb://whiteboard:wh1teboard@flame.mongohq.com:27100/shared-whiteboard');

var port = parseInt(process.env.PORT, 10) || 1337;
expressServer.listen(port);
console.info("listen port ", port);

var WhiteBoardElement = mongo.model('WhiteBoardElement', new mongoose.Schema({
	whiteboard: String,
	type: String
}));


io.sockets.on("connection", function (socket) {
  	socket.on("connect", function(data) {
  		WhiteBoardElement.find({
  			whiteboard: data.whiteboard
  		}, function(err, docs) {
  			socket.emit("init", docs);
  		});
  	});
  	socket.on("element", function(data) {
		socket.broadcast.emit("element", data);
		var instance = new WhiteBoardElement(data, false);
		instance.save(function(err) {
			console.log(err);
		});
	});
});