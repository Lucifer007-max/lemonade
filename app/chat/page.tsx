"use client"

import React, { useEffect, useRef, useState } from "react"
import io from "socket.io-client"

const socket = io("http://localhost:8000") // Update if deployed

export default function VideoChat() {
  const localVideo = useRef<HTMLVideoElement>(null)
  const remoteVideo = useRef<HTMLVideoElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const intervalRef = useRef<NodeJS.Timer | null>(null)

  const [isMatched, setIsMatched] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)

  const startChat = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      if (!localVideo.current) return

      localVideo.current.srcObject = stream
      streamRef.current = stream
      await localVideo.current.play()
      setIsStreaming(true)

      // Media Recorder
      let recordedChunks: Blob[] = []
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm; codecs=vp8",
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data)

          const blob = new Blob(recordedChunks, { type: "video/webm" })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.style.display = "none"
          a.href = url
          a.download = `recording_${Date.now()}.webm`
          document.body.appendChild(a)
          a.click()
          URL.revokeObjectURL(url)

          recordedChunks = []
        }
      }

      mediaRecorder.start()
      // intervalRef.current = setInterval(() => {
      //   if (mediaRecorder.state === "recording") {
      //     mediaRecorder.stop()
      //     mediaRecorder.start()
      //   }
      // }, 30000)

      // WebRTC Setup
      const captureStream =
        (localVideo.current).captureStream?.() || (localVideo.current as any).mozCaptureStream?.()
      if (!captureStream) {
        alert("Your browser does not support captureStream.")
        return
      }

      pcRef.current = new RTCPeerConnection()

      captureStream.getTracks().forEach((track) => {
        pcRef.current!.addTrack(track, captureStream)
      })

      pcRef.current.ontrack = (event) => {
        if (remoteVideo.current) {
          remoteVideo.current.srcObject = event.streams[0]
        }
      }

      pcRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", event.candidate)
        }
      }

      socket.emit("find-match")
    } catch (err) {
      console.error("Error accessing media:", err)
      alert("Please allow camera/mic access.")
    }
  }

  const stopChat = () => {
    socket.emit("leave-room")
    pcRef.current?.close()
    pcRef.current = null
    setIsMatched(false)

    if (remoteVideo.current) remoteVideo.current.srcObject = null
    if (localVideo.current) localVideo.current.srcObject = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    }
    clearInterval(intervalRef.current as NodeJS.Timer)
    setIsStreaming(false)
  }

  const nextChat = () => {
    stopChat()
    setTimeout(() => {
      startChat()
    }, 1000)
  }

  useEffect(() => {
    // Socket Signaling
    socket.on("match-found", async ({ isCaller }) => {
      setIsMatched(true)
      if (isCaller && pcRef.current) {
        const offer = await pcRef.current.createOffer()
        await pcRef.current.setLocalDescription(offer)
        socket.emit("offer", offer)
      }
    })

    socket.on("offer", async (offer) => {
      if (!pcRef.current) return
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pcRef.current.createAnswer()
      await pcRef.current.setLocalDescription(answer)
      socket.emit("answer", answer)
    })

    socket.on("answer", async (answer) => {
      if (!pcRef.current) return
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer))
    })

    socket.on("ice-candidate", async (candidate) => {
      if (!pcRef.current) return
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        console.error(err)
      }
    })

    socket.on("partner-disconnected", () => {
      alert("Partner disconnected")
      stopChat()
    })

    return () => {
      socket.disconnect()
      stopChat()
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-4">
      <h1 className="text-2xl font-bold mb-4">ChatVibe</h1>
      <div className="flex gap-4 mb-6">
        <video
          ref={localVideo}
          autoPlay
          muted
          playsInline
          className="w-[45vw] h-[50vh] bg-gray-800 border border-white/20 rounded"
        />
        <video
          ref={remoteVideo}
          autoPlay
          playsInline
          className="w-[45vw] h-[50vh] bg-gray-800 border border-white/20 rounded"
        />
      </div>

      <div className="flex space-x-4">
        {!isStreaming ? (
          <button
            onClick={startChat}
            className="px-6 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            Start
          </button>
        ) : (
          <>
            <button
              onClick={stopChat}
              className="px-6 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              Stop
            </button>
            <button
              onClick={nextChat}
              className="px-6 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Next
            </button>
          </>
        )}
      </div>

      {!isMatched && isStreaming && (
        <p className="mt-4 text-yellow-400 text-sm">Searching for a partner...</p>
      )}
    </div>
  )
}
