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

console.log("Iniciando servicio...")

// Utilizamos FileServer para servir los html y css/js
var fileServer = new(nodeStatic.Server)();

var app = http.createServer(function(req, res) {
  fileServer.serve(req, res);
}).listen(port);

console.log("Servicio escuchando en localhost:"+port)

// Abre el navegador en el puerto
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
    console.log("sending message to clients ", message)
    // The problem is that this message is being broadcasted to everyone
    if (message === "got user media") {
      // This is hardcoded, I should pass the room
      io.sockets.in("transmitter_123").emit('message', message);
    }else{
      socket.broadcast.emit('message', message);
    }
  });
  socket.on('create', function(room) {
    log('Received request to create ' + room);

    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;

    if (numClients === 0) {
      //Create new room
      socket.join(room);
      // Creator is transmitter so join transmitter room
      socket.join("transmitter_" + room);
      log('Client ID ' + socket.id + ' created room ' + room);
      socket.emit('created', room, socket.id);

    } else { // Room Already exists, tell client it can join the room
      socket.emit('joinRoom', room);
    }
  });


//  socket.on('observer join', function(room) {
//    log('Received request from an observer to join room '
//	+ room + ' with trasmitter at ' + room.id);
//    // Join room as oberver, send and receive appropiate info
//  })

  socket.on('transmitter info', function(student_id, transmitter_id) {
    log("Sending transmitter info: " + student_id)
    io.sockets.connected[student_id].emit("transmitter info", transmitter_id);
  });
  socket.on('student join', function(room) {
    log('Received request  from a student to join room '
      + room + ' with trasmitter at ' + room.id);

    // io.sockets.connected[socketID].join(roomName);
    // io.sockets.connected[socket.id].emit('privateMsg', 'hello this is a private msg');
    // io.to('some room').emit('some event');

    var studentsInRoom = io.sockets.adapter.rooms[room];
    var numClients = studentsInRoom ? Object.keys(studentsInRoom.sockets).length : 0;
    log('Room ' + room + ' now has ' + numClients + ' client(s)');

    if (numClients === 0) {
      //Room doesnt exist
      log('Room ' + room + ' has not been created yet');
      socket.emit("Room doesn't exist", room, socket.id);

    } else if (numClients < MAX_STUDENTS) {
      log('Client ID ' + socket.id + ' joined room ' + room);
      // Notify transmitter to start transmitting to student
      io.sockets.in("transmitter_"+room).emit('student joined', room, socket.id);
      //Someone joined (increase people in room)
      io.sockets.in(room).emit('join', room, socket.id);

      // Student joins room
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
	  // only send this info to the transmitter and back
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

});
