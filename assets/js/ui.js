$(document).mouseover(showControls);
$(document).mouseleave(hideControls);
function showControls(){
   $(".fullscreen").show("slide",
     {
      direction: "left",
      duration: 30
    }, function(){
   $(".muteVideo").show("slide",
     {
      direction: "left",
      duration: 30
    }, function(){
   $(".muteAudio").show("slide",
     {
      direction: "left",
      duration: 30
    });
    });
    });
}
function hideControls(){
   $(".muteAudio").hide("slide",
     {
      direction: "left",
      duration: 30
    }, function(){
   $(".muteVideo").hide("slide",
     {
      direction: "left",
      duration: 30
    }, function(){
   $(".fullscreen").hide("slide",
     {
      direction: "left",
      duration: 30
    });
    });
    });
}

function setClientMessage(key){
  $("#roomStatus").html(clientMessages[key])
  if (key == "beforeConnection"){
    window.setTimeout(function(){
      setClientMessage("takingTooLong")
    }, 5000)
  }
  if (key == "afterConnection"){
   $("#roomStatus").hide("slide",
     {
      direction: "up",
      duration: 300
    });
   $(".lobby").hide("slide",
     {
      direction: "right",
      duration: 300
    });
  }
  else{
   $("#roomStatus").show("slide",
     {
      direction: "up",
      duration: 300
    });
   $(".lobby").show("slide",
     {
      direction: "right",
      duration: 300
    });
  }

}

var clientMessages={
"beforeAllow": "Permítenos usar tu cámara para las sesiones",
  "afterAllow" :"Gracias, ahora te conectaremos a la sala",
  "joinedRoom": "Link de conexión: <a href='"+ location.href + "'>" + location.href + "</a>",
  "beforeConnection":  "Alguien se conectó, espera mientras iniciamos la llamada",
  "afterConnection" : "Listo, disfruta de la sesión de Telepresencia",
  "roomFull" : "La sala esta llena, has abierto la sesion en dos pestañas de casualidad, o no deberias estar en esta sesion.",
  "takingTooLong" : "Esto esta tardando demasiado, prueba refrescando la pagina"
}

var inRoom = {}
function joinedRoom(name, id){
  if (!inRoom[id]){
    $(".lobby > ul").append(
	"<li>" + name +
	    //"<small>" + id +"</small>" +
	  "</li>")
    inRoom[id] = true;
  }
}

function getQueryParam(param) {
  location.search.substr(1)
    .split("&")
    .some(function(item) { // returns first occurence and stops
      return item.split("=")[0] == param && (param = item.split("=")[1])
    })
  return param
}

function updateVideos(){
  var contador = 0
  console.log("number of peers", numberOfPeers);
  if (numberOfPeers > 0){
    $("#localVideo").css("width", "320px");
    $("#localVideo").css("right", "0");
    $("#localVideo").css("height", "initial");
  }
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

var isFullscreen = false;

function toggleFullscreen(event){
  isFullscreen = !isFullscreen;
  if (isFullscreen){
    openFullscreen();
    $(".fullscreen").children("i").removeClass("fa-expand");
    $(".fullscreen").children("i").addClass("fa-compress");
  }
  else {
    closeFullscreen();
    $(".fullscreen").children("i").removeClass("fa-compress");
    $(".fullscreen").children("i").addClass("fa-expand");
  }
}
var elem = document.documentElement;

/* View in fullscreen */
function openFullscreen() {
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if (elem.mozRequestFullScreen) { /* Firefox */
    elem.mozRequestFullScreen();
  } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
    elem.webkitRequestFullscreen();
  } else if (elem.msRequestFullscreen) { /* IE/Edge */
    elem.msRequestFullscreen();
  }
}
/* Close fullscreen */
function closeFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.mozCancelFullScreen) { /* Firefox */
    document.mozCancelFullScreen();
  } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
    document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) { /* IE/Edge */
    document.msExitFullscreen();
  }
}
var localAudioMuted = false;
var localVideoMuted = false;
function toggleLocalAudio(){
  localAudioMuted = !localAudioMuted;
  if (localAudioMuted){
    $(".muteAudio").children("i").removeClass("fa-microphone");
    $(".muteAudio").children("i").addClass("fa-microphone-slash");
  }
  else {
    $(".muteAudio").children("i").removeClass("fa-microphone-slash");
    $(".muteAudio").children("i").addClass("fa-microphone");
  }
   localStream.getTracks().forEach(
     track =>
     {
       if(track.kind == "audio")
	 track.enabled = !track.enabled;
     })
}
function toggleLocalVideo(){
  localVideoMuted = !localVideoMuted;
  if (localVideoMuted){
    $(".muteVideo").children("i").removeClass("fa-video");
    $(".muteVideo").children("i").addClass("fa-video-slash");
  }
  else {
    $(".muteVideo").children("i").removeClass("fa-video-slash");
    $(".muteVideo").children("i").addClass("fa-video");
  }
   localStream.getTracks().forEach(
     track =>
     {
       if(track.kind == "video")
	 track.enabled = !track.enabled;
     })
}

// If it is chrome show the network information
if (!!window.chrome && !!window.chrome.webstore){
  window.setInterval(function(){
    // check downlink for mozilla
    console.log("Network Information: " + navigator.connection.downlink + "Mb/s")
    console.log('rtt (round trip): ' + navigator.connection.rtt + 'ms');
    console.log('effectiveType: ' + navigator.connection.effectiveType);

  }, 10000)
}
function downloadSampleFile(){
  // Taken From
  // https://gist.github.com/debloper/7296289
  // Let's initialize the primitives
  var startTime, endTime, fileSize;

  // Set up the AJAX to perform
  var xhr = new XMLHttpRequest();

  // Rig the call-back... THE important part
  xhr.onreadystatechange = function () {

    // we only need to know when the request has completed
    if (xhr.readyState === 4 && xhr.status === 200) {

      // Here we stop the timer & register end time
      endTime = (new Date()).getTime();

      // Also, calculate the file-size which has transferred
      fileSize = xhr.responseText.length;

      // Calculate the connection-speed
      var speed = (fileSize * 8) / ((endTime - startTime)/1000) / 1024;

      // Report the result, or have fries with it...
      console.log(speed + " Kbps\n");
    }
  }

  // Snap back; here's where we start the timer
  startTime = (new Date()).getTime();

  // All set, let's hit it!
  xhr.open("GET", "URL/TO/PROBE.FILE", true);
  xhr.send();

}
