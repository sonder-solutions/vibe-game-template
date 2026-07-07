import type { ISecurityService } from '../../../services/interfaces/ISecurityService.js';
import type { ICommunicationService, CommunicationConfig, CommunicationEvent } from '../../../services/interfaces/ICommunicationService.js';

/**
 * WebRTC Communication Service
 * Provides peer-to-peer communication with configurable media options
 * Supports video, audio, chat, and file transfer
 * Can be configured for minimal chat-only mode for QR code handshaking
 */
export class WebRTCService implements ICommunicationService {
  #config: CommunicationConfig | null = null;
  #initialized = false;
  #connected = false;
  #peerConnection: RTCPeerConnection | null = null;
  #dataChannel: RTCDataChannel | null = null;
  #localStream: MediaStream | null = null;
  #remoteStream: MediaStream | null = null;
  #eventCallbacks: Array<(event: CommunicationEvent) => void> = [];
  #securityService?: ISecurityService;

  constructor(securityService?: ISecurityService) {
    this.#securityService = securityService;
  }

  async initialize(config: CommunicationConfig): Promise<void> {
    this.#config = config;
    
    // Initialize security service if provided
    if (this.#securityService) {
      await this.#securityService.initialize();
    }

    // Create peer connection with ICE servers
    this.#peerConnection = new RTCPeerConnection({
      iceServers: config.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    // Set up event handlers
    this.#peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.#emitEvent({
          type: 'data',
          payload: { type: 'ice-candidate', candidate: event.candidate }
        });
      }
    };

    this.#peerConnection.onconnectionstatechange = () => {
      if (this.#peerConnection) {
        const state = this.#peerConnection.connectionState;
        if (state === 'connected') {
          this.#connected = true;
          this.#emitEvent({ type: 'connected' });
        } else if (state === 'disconnected' || state === 'closed') {
          this.#connected = false;
          this.#emitEvent({ type: 'disconnected' });
        }
      }
    };

    this.#peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.#remoteStream = event.streams[0];
        this.#emitEvent({
          type: 'data',
          payload: { type: 'remote-stream', stream: this.#remoteStream }
        });
      }
    };

    // Set up data channel if offerer
    if (config.mode === 'webrtc') {
      this.#dataChannel = this.#peerConnection.createDataChannel('chat', {
        ordered: true
      });
      this.#setupDataChannel(this.#dataChannel);
    }

    this.#peerConnection.ondatachannel = (event) => {
      this.#dataChannel = event.channel;
      this.#setupDataChannel(this.#dataChannel);
    };

    // Get local media if configured
    if (config.media?.video || config.media?.audio) {
      try {
        this.#localStream = await navigator.mediaDevices.getUserMedia({
          video: config.media.video || false,
          audio: config.media.audio || false
        });
        
        this.#localStream.getTracks().forEach(track => {
          this.#peerConnection?.addTrack(track, this.#localStream!);
        });
      } catch (error) {
        this.#emitEvent({
          type: 'error',
          payload: { message: 'Failed to get media devices', error }
        });
      }
    }

    this.#initialized = true;
  }

  #setupDataChannel(channel: RTCDataChannel): void {
    channel.onopen = () => {
      this.#emitEvent({
        type: 'data',
        payload: { type: 'data-channel-open' }
      });
    };

    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.#emitEvent({
          type: 'message',
          payload: data
        });
      } catch {
        // Binary data
        this.#emitEvent({
          type: 'data',
          payload: { type: 'binary', data: event.data }
        });
      }
    };

    channel.onclose = () => {
      this.#emitEvent({
        type: 'data',
        payload: { type: 'data-channel-closed' }
      });
    };
  }

  isInitialized(): boolean {
    return this.#initialized;
  }

  isConnected(): boolean {
    return this.#connected;
  }

  async createOffer(): Promise<string> {
    if (!this.#peerConnection) {
      throw new Error('WebRTC not initialized');
    }

    const offer = await this.#peerConnection.createOffer();
    await this.#peerConnection.setLocalDescription(offer);

    // Wait for ICE gathering to complete (with safety timeout for unreachable STUN)
    await this.#waitICE();

    // Encrypt SDP if security service is available
    const sdp = this.#peerConnection.localDescription;
    const sdpString = JSON.stringify(sdp);
    
    if (this.#securityService) {
      return this.#securityService.encrypt(sdpString);
    }
    
    return sdpString;
  }

  async handleOffer(offer: string): Promise<string> {
    if (!this.#peerConnection) {
      throw new Error('WebRTC not initialized');
    }

    // Decrypt SDP if security service is available
    let sdpString = offer;
    if (this.#securityService) {
      sdpString = this.#securityService.decrypt<string>(offer);
    }

    const offerDescription = JSON.parse(sdpString);
    await this.#peerConnection.setRemoteDescription(offerDescription);

    const answer = await this.#peerConnection.createAnswer();
    await this.#peerConnection.setLocalDescription(answer);

    // Wait for ICE gathering to complete (with safety timeout for unreachable STUN)
    await this.#waitICE();

    // Encrypt answer SDP if security service is available
    const answerSdp = this.#peerConnection.localDescription;
    const answerString = JSON.stringify(answerSdp);
    
    if (this.#securityService) {
      return this.#securityService.encrypt(answerString);
    }
    
    return answerString;
  }

  async handleAnswer(answer: string): Promise<void> {
    if (!this.#peerConnection) {
      throw new Error('WebRTC not initialized');
    }

    // Decrypt SDP if security service is available
    let sdpString = answer;
    if (this.#securityService) {
      sdpString = this.#securityService.decrypt<string>(answer);
    }

    const answerDescription = JSON.parse(sdpString);
    await this.#peerConnection.setRemoteDescription(answerDescription);
  }

  async sendMessage(message: string): Promise<void> {
    if (!this.#dataChannel || this.#dataChannel.readyState !== 'open') {
      throw new Error('Data channel not open');
    }

    const messageData = JSON.stringify({
      type: 'chat',
      content: message,
      timestamp: Date.now()
    });

    this.#dataChannel.send(messageData);
  }

  async sendData(data: ArrayBuffer | Uint8Array): Promise<void> {
    if (!this.#dataChannel || this.#dataChannel.readyState !== 'open') {
      throw new Error('Data channel not open');
    }

    this.#dataChannel.send(data as any);
  }

  onEvent(callback: (event: CommunicationEvent) => void): void {
    this.#eventCallbacks.push(callback);
  }

  getLocalStream(): MediaStream | null {
    return this.#localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.#remoteStream;
  }

  async close(): Promise<void> {
    // Stop local media tracks
    if (this.#localStream) {
      this.#localStream.getTracks().forEach(track => track.stop());
      this.#localStream = null;
    }

    // Close data channel
    if (this.#dataChannel) {
      this.#dataChannel.close();
      this.#dataChannel = null;
    }

    // Close peer connection
    if (this.#peerConnection) {
      this.#peerConnection.close();
      this.#peerConnection = null;
    }

    this.#connected = false;
    this.#initialized = false;
    this.#remoteStream = null;
  }

  #waitICE(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.#peerConnection?.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      // Safety timeout — proceed with available candidates after 3s instead
      // of waiting for the full STUN timeout (30-40s when servers unreachable).
      const timer = setTimeout(() => {
        console.log('[WebRTCService] ICE gathering timeout (3s) — proceeding');
        resolve();
      }, 3000);
      this.#peerConnection!.onicegatheringstatechange = () => {
        if (this.#peerConnection?.iceGatheringState === 'complete') {
          clearTimeout(timer);
          resolve();
        }
      };
    });
  }

  #emitEvent(event: CommunicationEvent): void {
    for (const callback of this.#eventCallbacks) {
      callback(event);
    }
  }
}
