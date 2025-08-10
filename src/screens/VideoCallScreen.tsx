import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';

interface User {
  id: string;
  username: string;
  name: string;
}

interface VideoCallScreenProps {
  currentUser: User;
  otherUser: User;
  callType: 'voice' | 'video';
  isIncoming?: boolean;
  onEndCall: () => void;
}

const VideoCallScreen: React.FC<VideoCallScreenProps> = ({
  currentUser,
  otherUser,
  callType,
  isIncoming = false,
  onEndCall,
}) => {
  const [callStatus, setCallStatus] = useState<'ringing' | 'connecting' | 'connected' | 'ended'>('ringing');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isIncoming) {
      // Simulate incoming call
      setCallStatus('ringing');
    } else {
      // Outgoing call
      initiateCall();
    }

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (callStatus === 'connected') {
      // Start call duration timer
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      // Clear timer
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [callStatus]);

  const initiateCall = async () => {
    try {
      setCallStatus('connecting');
      
      // Get user media
      const constraints = {
        video: callType === 'video',
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      if (localVideoRef.current && callType === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      // Simulate connection delay
      setTimeout(() => {
        setCallStatus('connected');
        simulateRemoteStream();
      }, 2000 + Math.random() * 3000);

    } catch (error) {
      console.error('Error initiating call:', error);
      Alert.alert('Xəta', 'Zəng başladılmadı. Kamera/mikrofon icazəsi verilməyib.');
      onEndCall();
    }
  };

  const answerCall = async () => {
    try {
      setCallStatus('connecting');
      
      const constraints = {
        video: callType === 'video',
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      if (localVideoRef.current && callType === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      // Simulate connection
      setTimeout(() => {
        setCallStatus('connected');
        simulateRemoteStream();
      }, 1000);

    } catch (error) {
      console.error('Error answering call:', error);
      Alert.alert('Xəta', 'Zəng cavablandırılmadı.');
      onEndCall();
    }
  };

  const simulateRemoteStream = () => {
    // For demo purposes, create a fake remote stream
    // In real app, this would be handled by WebRTC peer connection
    if (callType === 'video' && remoteVideoRef.current) {
      // Create a canvas for fake remote video
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      
      // Draw a simple pattern
      if (ctx) {
        ctx.fillStyle = '#667eea';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(otherUser.name.charAt(0), canvas.width / 2, canvas.height / 2);
      }

      const fakeStream = canvas.captureStream(30);
      remoteVideoRef.current.srcObject = fakeStream;
      setRemoteStream(fakeStream);
    }
  };

  const rejectCall = () => {
    setCallStatus('ended');
    setTimeout(onEndCall, 1000);
  };

  const endCall = () => {
    setCallStatus('ended');
    cleanup();
    setTimeout(onEndCall, 1000);
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream && callType === 'video') {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleSpeaker = () => {
    // This would normally control audio output routing
    setIsSpeakerOn(!isSpeakerOn);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'ringing':
        return isIncoming ? 'Gələn zəng...' : 'Zəng edilir...';
      case 'connecting':
        return 'Bağlanır...';
      case 'connected':
        return formatDuration(callDuration);
      case 'ended':
        return 'Zəng bitdi';
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      {/* Remote Video/Avatar */}
      <View style={styles.remoteContainer}>
        {callType === 'video' && callStatus === 'connected' ? (
          <video
            ref={remoteVideoRef}
            style={styles.remoteVideo}
            autoPlay
            playsInline
          />
        ) : (
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{otherUser.name.charAt(0)}</Text>
            </View>
            <Text style={styles.remoteName}>{otherUser.name}</Text>
            <Text style={styles.callStatus}>{getStatusText()}</Text>
          </View>
        )}
      </View>

      {/* Local Video */}
      {callType === 'video' && callStatus === 'connected' && isVideoEnabled && (
        <View style={styles.localVideoContainer}>
          <video
            ref={localVideoRef}
            style={styles.localVideo}
            autoPlay
            playsInline
            muted
          />
        </View>
      )}

      {/* Call Controls */}
      <View style={styles.controlsContainer}>
        {callStatus === 'ringing' && isIncoming ? (
          <View style={styles.incomingControls}>
            <TouchableOpacity style={styles.rejectButton} onPress={rejectCall}>
              <Text style={styles.controlButtonText}>📞</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.answerButton} onPress={answerCall}>
              <Text style={styles.controlButtonText}>📞</Text>
            </TouchableOpacity>
          </View>
        ) : callStatus === 'connected' ? (
          <View style={styles.connectedControls}>
            <TouchableOpacity
              style={[styles.controlButton, isMuted && styles.activeControlButton]}
              onPress={toggleMute}
            >
              <Text style={styles.controlButtonText}>{isMuted ? '🔇' : '🎤'}</Text>
            </TouchableOpacity>

            {callType === 'video' && (
              <TouchableOpacity
                style={[styles.controlButton, !isVideoEnabled && styles.activeControlButton]}
                onPress={toggleVideo}
              >
                <Text style={styles.controlButtonText}>{isVideoEnabled ? '📹' : '📵'}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.controlButton, isSpeakerOn && styles.activeControlButton]}
              onPress={toggleSpeaker}
            >
              <Text style={styles.controlButtonText}>{isSpeakerOn ? '🔊' : '🔈'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
              <Text style={styles.controlButtonText}>📞</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.otherControls}>
            <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
              <Text style={styles.controlButtonText}>📞</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Call Info */}
      {callStatus === 'connected' && (
        <View style={styles.callInfo}>
          <Text style={styles.callInfoText}>
            {callType === 'video' ? '📹 Video Zəng' : '📞 Səs Zəngi'}
          </Text>
          <Text style={styles.callInfoSubtext}>
            {otherUser.name} ilə - {formatDuration(callDuration)}
          </Text>
        </View>
      )}
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'space-between',
  },
  remoteContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  } as any,
  avatarContainer: {
    alignItems: 'center',
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarText: {
    color: 'white',
    fontSize: 60,
    fontWeight: 'bold',
  },
  remoteName: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  callStatus: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    textAlign: 'center',
  },
  localVideoContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  localVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  } as any,
  controlsContainer: {
    paddingHorizontal: 40,
    paddingBottom: 50,
  },
  incomingControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  connectedControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  otherControls: {
    alignItems: 'center',
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeControlButton: {
    backgroundColor: '#ff4757',
  },
  controlButtonText: {
    fontSize: 24,
  },
  answerButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#48c78e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ff4757',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '135deg' }],
  },
  endCallButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff4757',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '135deg' }],
  },
  callInfo: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 10,
  },
  callInfoText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  callInfoSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
});

export default VideoCallScreen;
