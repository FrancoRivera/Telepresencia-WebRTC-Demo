'use strict';

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var socketIO = require('socket.io');
// This is to automatically start browser
var opn = require('opn')

//const io = require('socket.io')();
//io.path('/socket/socket.io/')

var port = 8089

var MAX_STUDENTS = 10
// var MAX_TRANSMITTERS = 1
var MAX_OBSERVER = 1

var fileServer = new(nodeStatic.Server)();
var app = http.createServer(function(req, res) {
  fileServer.serve(req, res);
}).listen(port);

console.log("Servicio escuchando en localhost:"+port)
opn('http://localhost:'+port)

//var io = socketIO.listen(app, { path: '/socket/socket.io'} );
var io = socketIO.listen(app);
//io.path('/socket/socket.io')
io.sockets.on('connection', function(socket) {

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  socket.on('message', function(message) {
    log('Client said: ', message);
    // for a real app, would be room-only (not broadcast)
    socket.broadcast.emit('message', message);
  });
  socket.on('create', function(room) {
    log('Received request to create ' + room);

    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    log('Room ' + room + ' now has ' + numClients + ' client(s)');

    if (numClients === 0) {
      //Create new room
      socket.join(room);
      log('Client ID ' + socket.id + ' created room ' + room);
      socket.emit('created', room, socket.id);

    } else { // Room Already exists
      socket.emit('Room Already Exists', room);
    }
  });
  socket.on('join', function(room) {
    log('Received request to join room ' + room + 'with trasmitter at ' + room.id);

    // io.sockets.connected[socketID].join(roomName);
    // io.sockets.connected[socket.id].emit('privateMsg', 'hello this is a private msg');
    // io.to('some room').emit('some event');

    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    log('Room ' + room + ' now has ' + numClients + ' client(s)');

    if (numClients === 0) {
      //Room doesnt exist
      log('Room ' + room + ' has not been created yet');
      socket.emit('Room doesnt exist', room, socket.id);

    } else if (numClients < MAX_STUDENTS) {
      log('Client ID ' + socket.id + ' joined room ' + room);
      //Notify all users of newly joined room
      io.sockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room, socket.id);
      io.sockets.in(room).emit('ready');
    } else { // max three clients (its actually two, chagne this in production)
      socket.emit('full', room);
    }
  });

  socket.on('ipaddr', function() {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

});
