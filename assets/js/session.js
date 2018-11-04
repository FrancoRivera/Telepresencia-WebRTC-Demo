'use strict';
var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var numberOfPeers = 0;
var localStream;
var pc;
var remoteStream;
var turnReady;
var myId = null;
var transmitterId = null;
var latestId = null;

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

function joinedRoom(name, id){
  console.log("Una nueva persona entro al salon")
  if (!inRoom[id]){
      $(".lobby").append("<div>" + name + "<small>" + id +"</small></div>")
      inRoom[id] = true;
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
//if (isStudent) alert("You are a student");
var isTransmitter = false;

if (room !== '') {
  setClientMessage("afterAllow")
  socket.emit('create', room);
  console.log('Attempted to create or join room', room);
}

socket.on('created', function(room, id) {
  setClientMessage("joinedRoom")
  isTransmitter = true
  isStudent = false
  myId = id
  joinedRoom("Tu (transmisor)", id)

sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: false
};
navigator.mediaDevices.getUserMedia(
    {
    audio: true,
    video: {
        width: {
            max: 3309
        },
        height: {
            max: 1613
        }
    }
    }
).then(gotStream)
  .catch(function(e) {
    alert('getUserMedia() error: ' + e.name);
  });
  console.log('Created room ' + room);
  //isInitiator = true;
});

socket.on('joinRoom', function(room){
  if (isStudent) socket.emit('student join', room);
  //if (!isStudent) socket.emit('observer join', room);
});

socket.on('full', function(room) {
  setClientMessage("roomFull")
  console.log('Room ' + room + ' is full');
});

socket.on('join', function (room, id){
  // Change Status UI
  setClientMessage("joinedRoom")
  // Add Somebody to room list
  console.log("Estudiante nuevo: ", id)
  joinedRoom("Estudiante ", id)
  console.log('Another peer made a request to join room ' + room);
  //console.log('This peer is the initiator of room ' + room + '!');
  isChannelReady = true;
});

socket.on('student joined', function (room, id){
  console.log("Emits to students the id");
  latestId = id
  if (isTransmitter) socket.emit("transmitter info", id, myId)
});

socket.on('transmitter info', function(id) {
  console.log("receives transmitter info")
  joinedRoom("Transmisor", id)
  transmitterId = id
  latestId = id
});
socket.on('joined', function(room, id) {
  // Change Status UI
  setClientMessage("joinedRoom")
  // Add Somebody to room list
  joinedRoom("Tu (estudiante)", id)
  myId = id
  console.log("My id ", id)
  console.log('joined: ' + room);
  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: {
        width: {
            max: 200
        },
        height: {
            max: 200
        }
    }
  }).then(gotStream)
    .catch(function(e) {
      alert('getUserMedia() error: ' + e.name);
    });
  isChannelReady = true;
  isInitiator = true;
  maybeStart()
});

socket.on('log', function(array) {
  console.log.apply(console, array);
});

////////////////////////////////////////////////

function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message, myId, room, isStudent, latestId);
}

// This client receives a message and the id of who sent it
socket.on('message', function(message, id) {
  //console.log('Client received message:', message);
  if (message === 'got user media') {
    console.log("Launching maybe start")
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
    handleRemoteHangup(id);
    isInitiator = true;
  }
});

////////////////////////////////////////////////////

var localVideo = document.querySelector('#localVideo');


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
    urls: 'turn:arulearning.com',
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
function updateVideos(){
  var contador = 0
  $(".remoteVideo").each(function(){
  if (numberOfPeers >= 4){
    //put them on a square grid
    if (contador < 2) {
    $(this).css("width", (50) + "vw")
    $(this).css("height", (50) + "vh")
    $(this).css("top", "0")
    $(this).css("left", (contador*50) + "vw")
    }
    else{
    $(this).css("width", (100/(numberOfPeers-2)) + "vw")
    $(this).css("height", (50) + "vh")
    $(this).css("top", "50vh")
    $(this).css("left", ((contador-2)*(100/(numberOfPeers-2))) + "vw")
    }
  }
  else{
    // reduce video size
    $(this).css("width", (100/numberOfPeers) + "vw")
    $(this).css("left", (contador*(100/numberOfPeers)) + "vw")
  }
  contador += 1;
  }
  )
}
function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  remoteStream = event.stream;
  // Create a new canvas and put the stream there
  numberOfPeers += 1
  $('.remoteVideos').append("<video class='remoteVideo' id='video_"+ latestId +"' autoplay playsinline></video>")
  updateVideos();
  $("#video_" + latestId)[0].srcObject = remoteStream;

  $("#video_" + latestId)[0].addEventListener('loadedmetadata', function() {
  console.log(`loaded metadata Remote video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
});
  $("#video_" + latestId)[0].addEventListener('resize', () => {
  console.log(`resize: Remote video size changed to ${$("#video_" + latestId)[0].videoWidth}x${$("#video_" + latestId)[0].videoHeight}`);
  // We'll use the first onsize callback as an indication that video has started
  // playing out.
});
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function hangup() {
  console.log('Hanging up.');
  stop();
  sendMessage('bye');
}

function handleRemoteHangup(id) {
  console.log('Session terminated.');
  //remove the video from the videos arrays
  console.log("Removing id: " , id)
  $("#video_"+id).remove()
  numberOfPeers -= 1
  updateVideos();
  //stop();
  isInitiator = false;
}

function stop() {
  isStarted = false;
  pc.close();
  pc = null;
}
