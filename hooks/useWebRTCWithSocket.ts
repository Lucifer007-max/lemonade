"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import type { Socket } from "socket.io-client"

interface UseWebRTCProps {
  socket: Socket | null
  roomId: string | null
  isInitiator?: boolean
}

export function useWebRTCWithSocket({ socket, roomId, isInitiator = false }: UseWebRTCProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new")

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  // Initialize WebRTC
  const initializeWebRTC = useCallback(async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      setLocalStream(stream)
      localStreamRef.current = stream

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
        ],
      })

      // Add local stream to peer connection
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream)
      })

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams
        setRemoteStream(remoteStream)

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream
        }
      }

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        setConnectionState(peerConnection.connectionState)
      }

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket && roomId) {
          socket.emit("webrtc-ice-candidate", {
            roomId,
            candidate: event.candidate,
          })
        }
      }

      peerConnectionRef.current = peerConnection

      // If initiator, create offer
      if (isInitiator && socket && roomId) {
        const offer = await peerConnection.createOffer()
        await peerConnection.setLocalDescription(offer)

        socket.emit("webrtc-offer", {
          roomId,
          offer,
        })
      }
    } catch (error) {
      console.error("Error accessing media devices:", error)
    }
  }, [socket, roomId, isInitiator])

  // Socket event handlers
  useEffect(() => {
    if (!socket) return

    const handleOffer = async (data: { offer: RTCSessionDescriptionInit; from: string }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(data.offer)
        const answer = await peerConnectionRef.current.createAnswer()
        await peerConnectionRef.current.setLocalDescription(answer)

        socket.emit("webrtc-answer", {
          roomId,
          answer,
        })
      }
    }

    const handleAnswer = async (data: { answer: RTCSessionDescriptionInit; from: string }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(data.answer)
      }
    }

    const handleIceCandidate = async (data: { candidate: RTCIceCandidateInit; from: string }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(data.candidate)
      }
    }

    socket.on("webrtc-offer", handleOffer)
    socket.on("webrtc-answer", handleAnswer)
    socket.on("webrtc-ice-candidate", handleIceCandidate)

    return () => {
      socket.off("webrtc-offer", handleOffer)
      socket.off("webrtc-answer", handleAnswer)
      socket.off("webrtc-ice-candidate", handleIceCandidate)
    }
  }, [socket, roomId])

  // Initialize when room is available
  useEffect(() => {
    if (socket && roomId) {
      initializeWebRTC()
    }
  }, [socket, roomId, initializeWebRTC])

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoEnabled(videoTrack.enabled)
      }
    }
  }, [])

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioEnabled(audioTrack.enabled)
      }
    }
  }, [])

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }
    setLocalStream(null)
    setRemoteStream(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    localVideoRef,
    remoteVideoRef,
    localStream,
    remoteStream,
    isVideoEnabled,
    isAudioEnabled,
    connectionState,
    toggleVideo,
    toggleAudio,
    cleanup,
  }
}
