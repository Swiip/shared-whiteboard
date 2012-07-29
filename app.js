var express = require("express");
var socketio = require("socket.io");

var expressServer = express.createServer()
expressServer.use(express.bodyParser());
expressServer.use(express.errorHandler());
expressServer.use(express.static(__dirname + "/public"));

var io = socketio.listen(expressServer);

var port = parseInt(process.env.PORT, 10) || 1337;
expressServer.listen(port);
console.info("listen port ", port);


io.sockets.on("connection", function (socket) {
  	socket.on("element", function(data) {
		socket.broadcast.emit("element", data);
	});
});