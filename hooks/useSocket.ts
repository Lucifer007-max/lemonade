"use client"

import { useEffect, useState } from "react"
import { io, type Socket } from "socket.io-client"

interface PartnerInfo {
  name: string
  age: number
  location: string
  interests: string[]
}

interface ChatMessage {
  id: string
  text: string
  sender: "user" | "partner"
  timestamp: Date
}

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isMatching, setIsMatching] = useState(false)
  const [partner, setPartner] = useState<PartnerInfo | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [onlineCount, setOnlineCount] = useState(0)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])

  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000", {
      transports: ["websocket"],
    })

    socketInstance.on("connect", () => {
      console.log("Connected to server")
      setIsConnected(true)
      setSocket(socketInstance)

      // Join with user data
      socketInstance.emit("join", {
        name: "Anonymous User",
        age: 22,
        location: "🌍 Earth",
        interests: ["Video Chat", "Meeting People"],
      })
    })

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from server")
      setIsConnected(false)
      setPartner(null)
      setRoomId(null)
    })

    socketInstance.on("joined", (data) => {
      console.log("Joined successfully:", data.userId)
    })

    socketInstance.on("waiting-for-match", () => {
      setIsMatching(true)
    })

    socketInstance.on("match-found", (data) => {
      console.log("Match found:", data)
      setIsMatching(false)
      setPartner(data.partner)
      setRoomId(data.roomId)
    })

    socketInstance.on("partner-left", () => {
      setPartner(null)
      setRoomId(null)
      setChatMessages([])
    })

    socketInstance.on("online-count", (count) => {
      setOnlineCount(count)
    })

    socketInstance.on("chat-message", (data) => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: data.message,
          sender: "partner",
          timestamp: data.timestamp,
        },
      ])
    })

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  const findMatch = () => {
    if (socket) {
      socket.emit("find-match")
      setIsMatching(true)
    }
  }

  const leaveRoom = () => {
    if (socket && roomId) {
      socket.emit("leave-room")
      setPartner(null)
      setRoomId(null)
      setChatMessages([])
    }
  }

  const sendChatMessage = (message: string) => {
    if (socket && roomId && message.trim()) {
      socket.emit("chat-message", { roomId, message })
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: message,
          sender: "user",
          timestamp: new Date(),
        },
      ])
    }
  }

  return {
    socket,
    isConnected,
    isMatching,
    partner,
    roomId,
    onlineCount,
    chatMessages,
    findMatch,
    leaveRoom,
    sendChatMessage,
  }
}
