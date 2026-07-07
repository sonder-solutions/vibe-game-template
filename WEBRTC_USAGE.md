# WebRTC Module Usage

## Separation of Concerns

The WebRTC module handles **only** peer-to-peer communication:
- Creates SDP offer/answer strings
- Accepts SDP strings from remote peer
- Manages media streams (video/audio/chat)
- Handles data channels

**What WebRTC does NOT do:**
- QR code generation/scanning
- SDP encoding/decoding for transport
- Any transport mechanism (QR, WebSocket, etc.)

**Application layer handles:**
- Taking SDP string → encoding to QR → displaying
- Scanning QR → decoding to SDP string → passing to WebRTC
- Any other transport mechanism

## Basic Usage

```typescript
import { CommunicationManager } from './modules/security/CommunicationManager';
import { WebRTCService } from './modules/communication/webrtc/WebRTCService';

// Create services
const security = new CommunicationManager();
const webrtc = new WebRTCService(security);

// Initialize
await webrtc.initialize({
  mode: 'webrtc',
  media: { video: true, audio: true, chat: true }
});

// Peer A: Create offer
const offerString = await webrtc.createOffer();
// offerString is just a string - you decide how to transport it
console.log('Offer:', offerString);

// Application layer: Encode offer to QR codes
// import { FountainQREncoder } from './modules/qr/FountainQR';
// const encoder = new FountainQREncoder();
// const qrFrames = await encoder.generateFrames(offerString, 5, 'H');
// Display QR codes...

// Peer B: Receive offer (from QR scan or other method)
// const receivedOffer = scanQRCode(); // Your application logic
await webrtc.handleOffer(receivedOffer);
const answerString = await webrtc.handleOffer(receivedOffer);

// Application layer: Encode answer to QR codes
// const answerFrames = await encoder.generateFrames(answerString, 5, 'H');
// Display QR codes...

// Peer A: Receive answer
// const receivedAnswer = scanQRCode(); // Your application logic
await webrtc.handleAnswer(receivedAnswer);

// Connection established!
```

## Chat-Only Mode

For minimal handshaking (e.g., small QR codes):

```typescript
await webrtc.initialize({
  mode: 'webrtc',
  media: { 
    video: false,
    audio: false,
    chat: true  // Only data channel, smaller SDP
  }
});
```

## Event Handling

```typescript
webrtc.onEvent((event) => {
  switch (event.type) {
    case 'connected':
      console.log('Peer connected!');
      break;
    
    case 'disconnected':
      console.log('Peer disconnected');
      break;
    
    case 'message':
      console.log('Chat message:', event.payload);
      break;
    
    case 'data':
      if (event.payload.type === 'remote-stream') {
        // Handle remote video/audio
        const video = document.getElementById('remoteVideo');
        video.srcObject = event.payload.stream;
      }
      break;
    
    case 'error':
      console.error('WebRTC error:', event.payload);
      break;
  }
});
```

## Transport Agnostic

WebRTC doesn't care how you exchange SDP strings:

**QR Codes:**
```typescript
const offer = await webrtc.createOffer();
const qrFrames = await fountainEncoder.generateFrames(offer, 5, 'H');
// Display QR codes
```

**WebSocket:**
```typescript
const offer = await webrtc.createOffer();
websocket.send(offer);
```

**Copy/Paste:**
```typescript
const offer = await webrtc.createOffer();
navigator.clipboard.writeText(offer);
// User manually shares the string
```

**Any other method you can think of!**

## Security

All SDP strings are automatically encrypted/decrypted by CommunicationManager if provided:

```typescript
const security = new CommunicationManager();
const webrtc = new WebRTCService(security);

// All SDP operations are automatically encrypted
const encryptedOffer = await webrtc.createOffer();
// encryptedOffer is encrypted - safe to transport via any method

// Decryption happens automatically
await webrtc.handleOffer(encryptedOfferFromPeer);
```

If you don't provide a security service, SDP strings are plaintext:

```typescript
const webrtc = new WebRTCService(); // No security service
const plaintextOffer = await webrtc.createOffer();
// plaintextOffer is JSON - not encrypted
```

## Media Streams

```typescript
// Get local stream (your camera/mic)
const localStream = webrtc.getLocalStream();
localVideo.srcObject = localStream;

// Get remote stream (peer's camera/mic)
webrtc.onEvent((event) => {
  if (event.type === 'data' && event.payload.type === 'remote-stream') {
    remoteVideo.srcObject = event.payload.stream;
  }
});
```

## Chat Messages

```typescript
// Send message
await webrtc.sendMessage('Hello!');

// Receive messages
webrtc.onEvent((event) => {
  if (event.type === 'message') {
    console.log('Received:', event.payload.content);
    console.log('Timestamp:', event.payload.timestamp);
  }
});
```

## File Transfer

```typescript
// Send binary data
const data = new Uint8Array([1, 2, 3, 4, 5]);
await webrtc.sendData(data);

// Receive binary data
webrtc.onEvent((event) => {
  if (event.type === 'data' && event.payload.type === 'binary') {
    const receivedData = event.payload.data;
    // Process binary data
  }
});
```

## Cleanup

```typescript
// When done
await webrtc.close();
// Stops all media tracks, closes connections, cleans up
```
