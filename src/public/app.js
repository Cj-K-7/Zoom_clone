const socket = io();

const myVideo = document.getElementById("myVideo");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const cameraSelect = document.getElementById("cameras")
const call = document.getElementById("call");

call.hidden = true;

let myStream;
let roomName;
let myConnection;
let myDataChannel;
let muted = false;
let cameraOff = false;

async function getCamera() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === "videoinput");
        const currentCamera = myStream.getVideoTracks();
        cameras.forEach(camera => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if(currentCamera.label == camera.label){
              option.selected = true;
            }
            cameraSelect.appendChild(option);
        });
    } catch (error) {
      console.log(error);
    }
}
async function getMedia( deviceID ) {
    const defaultConst = {
        audio: true,
        video: { facingMode : "user" }
    };
    const cameraConst = {
      audio: true,
      video: { deviceId: { exact: deviceID } },
    };
  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceID ? cameraConst : defaultConst
    );
    myVideo.srcObject = myStream;
    if ( !deviceID ) {
      await getCamera();
    }
  } catch (error) {
    console.log(error);
  }
};

function handleMute() {
    myStream
      .getAudioTracks()
      .forEach((track) => (track.enabled = !track.enabled));
  if (!muted) {
    muteBtn.innerText = "Unmute";
    muted = true;
  } else {
    muteBtn.innerText = "Mute";
    muted = false;
  }
};

function handleCamera() {
    myStream
      .getVideoTracks()
      .forEach((track) => (track.enabled = !track.enabled));
  if (cameraOff) {
    cameraBtn.innerText = "Camera Off";
    cameraOff = false;
  } else {
    cameraBtn.innerText = "Camera On";
    cameraOff = true;
  }
};

async function handleCameraChange() {
    await getMedia(cameraSelect.value);
    if(myConnection){
      const videoTrack = myStream.getVideoTracks()[0];
      const videoSender = myConnection
        .getSenders()
        .find((sender) => sender.track.kind === "video");
      videoSender.replaceTrack(videoTrack);
    }
};


muteBtn.addEventListener("click", handleMute);
cameraBtn.addEventListener("click", handleCamera);
cameraSelect.addEventListener("input", handleCameraChange);

//welcome form

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

async function startMedia(){
  welcome.hidden = true;
  call.hidden = false;
  await getMedia();
  makeConnection();
}

async function handleWelcomeSubmit(event) {
  event.preventDefault();
  const input = welcomeForm.querySelector("input");
  await startMedia();
  socket.emit("join_room", input.value);
  roomName = input.value;
  input.value = ""
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// Socket Code

socket.on("welcome", async ()=>{
  myDataChannel = myConnection.createDataChannel("chat");
  myDataChannel.addEventListener("message", console.log);
  const offer = await myConnection.createOffer();
  myConnection.setLocalDescription(offer);
  socket.emit("offer", offer, roomName);
  console.log("send offer");
})

socket.on("offer", async (offer) => {
  myConnection.addEventListener("datachannel", event => {
    myDataChannel = event.channel;
    myDataChannel.addEventListener("message", console.log);
  });
  console.log("received offer");
  myConnection.setRemoteDescription(offer);
  const answer = await myConnection.createAnswer();
  myConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
  console.log("send answer")
});

socket.on("answer", answer =>{
  myConnection.setRemoteDescription(answer);
  console.log("received answer");
})

socket.on("ice", ice=>{
  myConnection.addIceCandidate(ice);
})
// RTC code

function makeConnection() {
  myConnection = new RTCPeerConnection();
  myConnection.addEventListener("icecandidate", handleIce);
  myConnection.addEventListener("addstream", handleAddStream);
  myStream
    .getTracks()
    .forEach((track) => myConnection.addTrack(track, myStream));
}

function handleIce(data){
  socket.emit("ice", data.candidate, roomName);
};

function handleAddStream(data) {
  const peersFace = document.getElementById("peersFace");
  peersFace.srcObject = data.stream;
};
