var express = require("express");
var socketio = require("socket.io");

var expressServer = express.createServer()
expressServer.use(express.bodyParser());
expressServer.use(express.errorHandler());
expressServer.use(express.static(__dirname + "/public"));

var socket = socketio.listen(expressServer);

var port = parseInt(process.env.PORT, 10) || 1337;
expressServer.listen(port);
console.info("listen port ", port);