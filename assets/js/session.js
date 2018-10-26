'use strict';

var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var numberOfPeers = 0;
var localStream;
var pc;
var remoteStream;
var turnReady;

var pcConfig = {
  'iceServers': [{
    'urls': 'stun:stun.l.google.com:19302'
  },
	]
};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

/////////////////////////////////////////////

var clientMessages={
"beforeAllow": "Permítenos usar tu cámara para las sesiones",
  "afterAllow" :"Gracias, ahora te conectaremos a la sala",
  "joinedRoom": "Listo, espera un momento que se conecte la otra persona",
  "beforeConnection":  "Alguien se conectó, espera mientras iniciamos la llamada",
  "afterConnection" : "Listo, disfruta de la sesión de Telepresencia",
  "roomFull" : "La sala esta llena, has abierto la sesion en dos pestañas de casualidad, o no deberias estar en esta sesion.",
  "takingTooLong" : "Esto esta tardando demasiado, prueba refrescando la pagina"
}

var inRoom = {}

//Get room key from server
function setClientMessage(key){
  $("#roomStatus").html(clientMessages[key])
  if (key == "beforeConnection"){
    window.setTimeout(function(){
      setClientMessage("takingTooLong")
    }, 5000)
  }
}

function joinedRoom(name){
  console.log(name)
  if (!inRoom[name]){
      $(".lobby").append("<div>" + name + "</div>")
      inRoom[name] = true;
  }
}
// Get name from URL
var room = 'foo';
function getQueryParam(param) {
      location.search.substr(1)
          .split("&")
          .some(function(item) { // returns first occurence and stops
	    return item.split("=")[0] == param && (param = item.split("=")[1])
	  })
      return param
  }
room = getQueryParam("room");
// Could prompt for room name:
//room = prompt('Enter room name:');
//var socket = io('https://app.Telepresencialearning.com/', {path: '/socket/socket.io/'})
var socket = io().connect();

var isStudent = Math.round(Math.random());
isStudent = true;
if (isStudent) alert("You are a student");
if (!isStudent) alert("You are a observer");
var isTransmitter = false;

if (room !== '') {
  setClientMessage("afterAllow")
  socket.emit('create', room);
  console.log('Attempted to create or join room', room);
}

socket.on('created', function(room) {
  setClientMessage("joinedRoom")
  isTransmitter = true
  joinedRoom("Tu")
navigator.mediaDevices.getUserMedia({
  audio: true,
  video: true
}).then(gotStream)
  .catch(function(e) {
    alert('getUserMedia() error: ' + e.name);
  });
  alert("You are a transmitter")
  console.log('Created room ' + room);
  isInitiator = true;
});

socket.on('joinRoom', function(room){
  if (isStudent) socket.emit('student join', room);
  if (!isStudent) socket.emit('observer join', room);
});

socket.on('full', function(room) {
  setClientMessage("roomFull")
  console.log('Room ' + room + ' is full');
});

socket.on('join', function (room){
  // Change Status UI
  setClientMessage("joinedRoom")
  // Add Somebody to room list
  joinedRoom("Alguien")
  console.log('Another peer made a request to join room ' + room);
  //console.log('This peer is the initiator of room ' + room + '!');
  isChannelReady = true;
});

socket.on('joined', function(room) {
  // Change Status UI
  setClientMessage("joinedRoom")
  // Add Somebody to room list
  joinedRoom("Tu")
  console.log('joined: ' + room);
  isChannelReady = true;
});

socket.on('log', function(array) {
  console.log.apply(console, array);
});

////////////////////////////////////////////////

function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}

// This client receives a message
socket.on('message', function(message) {
  console.log('Client received message:', message);
  if (message === 'got user media') {
    console.log("Lanuching maybe start")
    maybeStart();
  } else if (message.type === 'offer') {
    // If it is not the initiator and it is not started
    if (!isInitiator) {
      maybeStart();
    }
    pc.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
  } else if (message.type === 'answer' && isStarted) {
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === 'candidate' && isStarted) {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    pc.addIceCandidate(candidate);
  } else if (message === 'bye') {
    // handleRemoteHangup();
    // isInitiator = true;
  }
});

////////////////////////////////////////////////////

var localVideo = document.querySelector('#localVideo');

if (isTransmitter || isStudent){
navigator.mediaDevices.getUserMedia({
  audio: true,
  video: true
}).then(gotStream)
  .catch(function(e) {
    alert('getUserMedia() error: ' + e.name);
  });
}
else{

navigator.mediaDevices.getUserMedia({
  audio: false,
  video: false
}).then( stream => {
  if (isInitiator) {
    maybeStart();
  }
})
  .catch(function(e) {
    alert('getUserMedia() error: ' + e.name);
  });
}

function gotStream(stream) {
  setClientMessage("afterAllow")
  if (isChannelReady){
  setClientMessage("joinedRoom")
  }
  console.log('Adding local stream.');
  localStream = stream;
  localVideo.srcObject = stream;
  sendMessage('got user media');
  if (isInitiator) {
    maybeStart();
  }
}

var constraints = {
  video: true
};

console.log('Getting user media with constraints', constraints);

if (location.hostname !== 'localhost') {
  requestTurn(
{
    url: 'turn:franco@arulearning.com',
    credential: '123456'
}
  );
}
function maybeStart() {
  console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
  // if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
   if (typeof localStream !== 'undefined' && isChannelReady) {
    console.log('>>>>>> creating peer connection');
    createPeerConnection();
    pc.addStream(localStream);
    isStarted = true;
    console.log('isInitiator', isInitiator);
    setClientMessage("afterConnection")
    if (isInitiator) {
    console.log('isInitiator', isInitiator);
      doCall();
    }
  }
}

window.onbeforeunload = function() {
  sendMessage('bye');
};

/////////////////////////////////////////////////////////

function createPeerConnection() {
  try {
    pc = new RTCPeerConnection(null);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    console.log('Created RTCPeerConnnection');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
}

function handleIceCandidate(event) {
  console.log('icecandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } else {
    console.log('End of candidates.');
  }
}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

function doCall() {
  console.log('Sending offer to peer');
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
  console.log('Sending answer to peer.');
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message', sessionDescription);
  sendMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function requestTurn(turnURL) {
  var turnExists = false;
  for (var i in pcConfig.iceServers) {
    if (pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log('Getting TURN server from ', turnURL);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    pcConfig.iceServers.push(turnURL)
    turnReady = true;
    /*var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
	var turnServer = JSON.parse(xhr.responseText);
	console.log('Got TURN server: ', turnServer);
	pcConfig.iceServers.push({
	  'urls': 'turn:' + turnServer.username + '@' + turnServer.turn,
	  'credential': turnServer.password
	});
	turnReady = true;
      }
    };
    xhr.open('GET', turnURL, true);
    xhr.send();
	*/
  }
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  remoteStream = event.stream;
  // Create a new canvas and put the stream there
  console.log(event)
  console.log("NOW IT STIME TO ADD THE STREAM")
  numberOfPeers += 1
  $('.remoteVideos').append("<video width='"+ 500+ "' height='400' class='remoteVideo' id='stream_"+numberOfPeers+"' autoplay playsinline></video>")
  $("#stream_"+numberOfPeers)[0].srcObject = remoteStream;
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function hangup() {
  console.log('Hanging up.');
  stop();
  sendMessage('bye');
}

function handleRemoteHangup() {
  console.log('Session terminated.');
  stop();
  isInitiator = false;
}

function stop() {
  isStarted = false;
  pc.close();
  pc = null;
}
