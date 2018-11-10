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

var peerConnectionConfig = { 
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302'
    },
    {
      urls: 'turn:arulearning.com',
      username: 'franco',
      credential: '123456'
    }
  ]
}

turnReady = true;

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
  mandatory: {
    OfferToReceiveAudio: true,
    OfferToReceiveVideo: true
  }
};

/////////////////////////////////////////////


var socket = io().connect();

var isStudent = true;
var isTransmitter = false;

var room = getQueryParam("room");
if (room !== '') {
  socket.emit('create', room);
  console.log('Attempted to create or join room', room);
  navigator.mediaDevices.getUserMedia(
    {
      audio: true,
      video: isStudent
      //Commenting this cuz doesnt work on all browsers
      // video: {
      //     width: {
      //         max: 3309
      //     },
      //     height: {
      //         max: 1613
      //     }
      // }
    }
  ).then(gotStream)
    .catch(function(e) {
      alert('getUserMedia() error: ' + e.name);
    });
} else{
  alert("¿Estás seguro que deberías estar aquí?");
}

socket.on('created', function(room, id) {
  setClientMessage("joinedRoom")
  isTransmitter = true
  isStudent = false
  myId = id
  joinedRoom("Tu (transmisor)", id)

  sdpConstraints = {
    offerToReceiveAudio: true,
    offerToReceiveVideo: true
  };
  isChannelReady = true;
  console.log('Created room ' + room);
});

socket.on('joinRoom', function(room){
  if (isStudent) socket.emit('student join', room);
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
  if (isChannelReady){ setClientMessage("joinedRoom") }
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

//if (location.hostname !== 'localhost') {
//  requestTurn(
//{
//    urls: 'turn:arulearning.com',
//    credential: '123456'
//}
//  );
//}
function maybeStart() {
  console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
  // if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
  if (typeof localStream !== 'undefined' && isChannelReady) {
    console.log('>>>>>> creating peer connection');
    console.log("Sending new offers");
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
    console.log("Creating peer connection", peerConnectionConfig);
    pc = new RTCPeerConnection(peerConnectionConfig);
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
  console.log('Sending offer to peer', sdpConstraints);
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError, sdpConstraints);
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
