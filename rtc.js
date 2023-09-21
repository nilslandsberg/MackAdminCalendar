
const webSocketConnection = "wss://9mfjb7j56d.execute-api.us-west-2.amazonaws.com/websocket";
const turnServerIPAddress = "54.224.33.11";
const turnServerPort = "3478";
const turnServerUserName = "oxwebrtc";
const turnServerPassword = "S@pDyK?k4D8Ckskr";

var inBoundTimestampPrev = 0;
var inBoundBytesPrev = 0;
var outBoundTimestampPrev = 0;
var outBoundBytesPrev = 0;

existingTracks = [];

var socket, localStream, connection, clientId = uuidv4(), channel;

const configuration = {
    iceServers: [
        {
            urls: 'stun:' + turnServerIPAddress + ':' + turnServerPort
        },
        {
            urls: 'turn:' + turnServerIPAddress + ':' + turnServerPort,
            username: turnServerUserName,
            credential: turnServerPassword
        }
    ]
}

// wait for document to load
document.addEventListener("DOMContentLoaded", function(event) {

    disableAllButtons();

    getLocalAudioFeed();

});


/*
    This function creates the socket connection and WebRTC connection. 
    This is also responsible for changing media tracks when user switches mobile cameras (Front and back)
*/
function initiatSocketAndPeerConnection(stream){
    if(typeof socket === 'undefined'){
        connectToWebSocket();
    }else{
        stream.getAudioTracks().forEach(function (track, index) {
            connection.getSenders().find(function(s) {
                if (s.track.kind == track.kind){
                    s.replaceTrack(track);
                }
            });
        });
    }
}

function disableAllButtons(){
    document.getElementById("sendOfferButton").disabled = true;
    document.getElementById("answerButton").disabled = true;
    document.getElementById("hangUpButton").disabled = true;
    document.getElementById("muteButton").disabled = true;
}

/*
    Send messages via Data Channel
*/
function sendMessage(){
    var messageText = document.getElementById("messageInput").value; 

    channel.send(JSON.stringify({
        "message": messageText
    }));

    document.getElementById("chatTextArea").value += messageText + '\n';
}

function disconnectRTCPeerConnection(){
    connection.close();
}

/*
    Connect to the web socket and handle Received messages from web sockets
*/
function connectToWebSocket(){
    socket = new WebSocket(webSocketConnection);

    // Create WebRTC connection only if the socket connection is successful.
    socket.onopen = function(event) {
        createRTCPeerConnection();
    };

    // Handle messages Received in socket
    socket.onmessage = function(event) {
        jsonData = JSON.parse(event.data);

        switch (jsonData.type){
            case 'candidate':
                handleCandidate(jsonData.data, jsonData.id);
                break;
            case 'offer':
                handleOffer(jsonData.data, jsonData.id);
                break;
            case 'answer':
                handleAnswer(jsonData.data, jsonData.id);
                break;
            default:
                break
        }
    };

    socket.onerror = function(event) {
        console.error(event);
    };

    socket.onclose = function(event) {
        document.getElementById("sendOfferButton").disabled = true;
        document.getElementById("answerButton").disabled = true;
        document.getElementById("muteButton").disabled = true;
    };
}

function log(message){
    // document.getElementById("logs").value += message + '\n';
    console.log(message);
}

function getLocalAudioFeed(){
    constraints = {
        audio: true,
        video: false
    } 

    navigator.getAudio = (navigator.getUserMedia || navigator.webKitGetUserMedia || navigator.moxGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
    if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia(constraints)
        .then(function (stream) {
            localStream = stream;
            initiatSocketAndPeerConnection(stream);
        })
        .catch(function (e) { log(e.name + ": " + e.message); });
    }
    else {
        navigator.getAudio({ audio: true, video: false }, 
            function (stream) {
                localStream = stream;
                initiatSocketAndPeerConnection(stream);
            }, 
            function () { log("Cannot access microphone."); 
        });
    }
}

/*
    This is responsible for creating an RTCPeerConnection and handle it's events.
*/
function createRTCPeerConnection(){
    connection = new RTCPeerConnection(configuration);

    // Add both video and audio tracks to the connection
    for (const track of localStream.getTracks()) {
        existingTracks.push(connection.addTrack(track, localStream));
    }

    // This event handles displaying remote video and audio feed from the other peer
    connection.ontrack = event => {
        document.getElementById("remoteAudio").srcObject = event.streams[0];
    }

    // This event handles the received data channel from the other peer
    connection.ondatachannel = function (event) {
        channel = event.channel;
        setChannelEvents(channel);
    };

    // This event sends the ice candidates generated from Stun or Turn server to the Receiver over web socket
    connection.onicecandidate = event => {
        if (event.candidate) {
            socket.send(JSON.stringify(
                {
                    action: 'onMessage',
                    type: 'candidate',
                    data: event.candidate,
                    id: clientId
                }
            ));
        }
    }

    // This event logs messages and handles button state according to WebRTC connection state changes
    connection.onconnectionstatechange = function(event) {
        switch(connection.connectionState) {
            case "connected":
                document.getElementById("answerButton").disabled = true;
                document.getElementById("sendOfferButton").disabled = true;
                document.getElementById("hangUpButton").disabled = false;
                document.getElementById("muteButton").disabled = false;
                break;
            case "disconnected":
                disableAllButtons();
                break;
            case "failed":
                console.log(event);
                disableAllButtons();
                break;
            case "closed":
                disableAllButtons();
                break;
            default:
                break;
        }
    }

    document.getElementById("sendOfferButton").disabled = false;
}

/*
    Creates and sends the Offer to the Receiver
    Creates a Data channel for exchanging text messages
    This function is invoked by the Caller
*/
function createAndSendOffer(){
    if(channel){
        channel.close();
    }

    // Create Data channel
    channel = connection.createDataChannel('channel', {});
    setChannelEvents(channel);

    // Create Offer
    connection.createOffer().then(
        offer => {
            // Send Offer to other peer
            socket.send(JSON.stringify(
                {
                    action: 'onMessage',
                    type: 'offer',
                    data: offer,
                    id: clientId
                }
            ));

            // Set Offer for negotiation
            connection.setLocalDescription(offer);
        },
        error => {
            console.error(error);
        }
    );
}

/*
    Creates and sends the Answer to the Caller
    This function is invoked by the Receiver
*/
function createAndSendAnswer(){

    // Create Answer
    connection.createAnswer().then(
        answer => {
            // Set Answer for negotiation
            connection.setLocalDescription(answer);

            // Send Answer to other peer
            socket.send(JSON.stringify(
                {
                    action: 'onMessage',
                    type: 'answer',
                    data: answer,
                    id: clientId
                }
            ));
        },
        error => {
            console.error(error);
        }
    );
}

/*
    Accepts ICE candidates received from the Caller
*/
function handleCandidate(candidate, id){

    // Avoid accepting the ice candidate if this is a message created by the current peer
    if(clientId != id){
        connection.addIceCandidate(new RTCIceCandidate(candidate));
    }
}

/*
    Accepts Offer received from the Caller
*/
function handleOffer(offer, id){

    if(clientId != id){
        connection.setRemoteDescription(new RTCSessionDescription(offer));
        // answer the phone
        createAndSendAnswer();
        document.getElementById("answerButton").disabled = false;
        document.getElementById("sendOfferButton").disabled = true;
    }
}

/*
    Accetps Answer received from the Receiver
*/
function handleAnswer(answer, id){

    // Avoid accepting the Answer if this is a message created by the current peer
    if(clientId != id){
        connection.setRemoteDescription(new RTCSessionDescription(answer));
    }
}

/*
    Generate a unique ID for the peer
*/
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/*
    Handle Data Channel events
*/
function setChannelEvents(channel) {
    channel.onmessage = function (event) {
        var data = JSON.parse(event.data);
        console.log(data.message)
    };

    channel.onerror = function (event) {
        console.error(event)
    };

    channel.onclose = function (event) {
        disableAllButtons();
    };
}

function muteMic() {
    localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
    });
    document.getElementById('muteButton').classList.toggle('muted');
}
