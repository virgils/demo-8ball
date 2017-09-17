// Dependencies
var express = require('express');
var crypto = require('crypto');
 
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var port = process.env.PORT || 5000;

app.use(express.static('public'));

http.listen(port, function(){
  console.log('listening on *:'+port);
});

var socketCodes = {};

// When a client connects...
io.on('connection', function(socket) 
{
   // Confirm the connection
   socket.emit("welcome", {});
   
   // Receive the client device type
   socket.on("device", function(device)
   {
      // if client is a browser game
      if(device.type == "game") {
         // Generate a code
         var gameCode = crypto.randomBytes(3).toString('hex').substring(0,4).toLowerCase();
         
         // Ensure uniqueness
         while(gameCode in socketCodes) {
            gameCode = crypto.randomBytes(3).toString('hex').substring(0,4).toLowerCase();
         }
         
         // Store game code -> socket association
         socketCodes[gameCode] = io.sockets.sockets[socket.id];
         socket.gameCode = gameCode
         
         // Tell game client to initialize 
         //  and show the game code to the user
         socket.emit("initialize", gameCode);
      }
      // if client is a phone controller
      else if(device.type == "controller") {
         // if game code is valid...
         if(device.gameCode in socketCodes) {
            // save the game code for controller commands
            socket.gameCode = device.gameCode

            // initialize the controller
            socket.emit("connected", {});
            
            // start the game
            socketCodes[device.gameCode].emit("connected", {});

         }
         // else game code is invalid, 
         //  send fail message and disconnect
         else {
            socket.emit("fail", {});
            socket.disconnect();
         }
      }
   });
   
	socket.on('send gyro', function(data){
		if(socket.gameCode && socket.gameCode in socketCodes) {
			socketCodes[socket.gameCode].emit("new gyro", data);
		}
	});
	
	socket.on('tap', function(data){
		if(socket.gameCode && socket.gameCode in socketCodes) {
         console.log('tap registered: ' + socket.gameCode);
			socketCodes[socket.gameCode].emit("tap", data);
		}
	});

   socket.on('disconnect', function(socket) {
      console.log('Got disconnect!');

		// remove game code -> socket association on disconnect
		if(socket.gameCode && socket.gameCode in socketCodes) {
		  delete socketCodes[socket.gameCode];
		}
   });


});
