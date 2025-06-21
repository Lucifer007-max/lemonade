"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  SkipForward,
  Heart,
  Flag,
  Settings,
  Users,
  Monitor,
  MessageSquare,
  Send,
} from "lucide-react"
import Link from "next/link"
import { useSocket } from "@/hooks/useSocket"
import { useWebRTCWithSocket } from "@/hooks/useWebRTCWithSocket"

export default function VideoChat() {
  const [showChat, setShowChat] = useState(false)
  const [chatMessage, setChatMessage] = useState("")
  const [isRemoteAudioEnabled, setIsRemoteAudioEnabled] = useState(true)

  const {
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
  } = useSocket()

  const { localVideoRef, remoteVideoRef, isVideoEnabled, isAudioEnabled, connectionState, toggleVideo, toggleAudio } =
    useWebRTCWithSocket({
      socket,
      roomId,
      isInitiator: true,
    })

  // Auto-find match when connected
  useEffect(() => {
    if (isConnected && !partner && !isMatching) {
      findMatch()
    }
  }, [isConnected, partner, isMatching, findMatch])

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      sendChatMessage(chatMessage)
      setChatMessage("")
    }
  }

  const handleNextPerson = () => {
    leaveRoom()
    setTimeout(() => {
      findMatch()
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-lg border-b border-white/10 p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">ChatVibe</span>
          </Link>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full animate-pulse ${
                  isConnected ? (partner ? "bg-green-400" : "bg-yellow-400") : "bg-red-400"
                }`}
              ></div>
              <span className="text-sm text-gray-300">
                {!isConnected
                  ? "Connecting..."
                  : isMatching
                    ? "Finding someone..."
                    : partner
                      ? `Connected • ${onlineCount} online`
                      : "Ready to connect"}
              </span>
            </div>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Main Video Area */}
        <div className="flex-1 relative">
          {isMatching || !partner ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full text-center"
            >
              <div className="w-24 h-24 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Users className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">
                {isMatching ? "Finding your next connection..." : "Ready to start?"}
              </h3>
              <p className="text-gray-300 text-lg mb-6">
                {isMatching
                  ? "We're matching you with someone awesome!"
                  : "Click the button below to find someone to video chat with"}
              </p>

              {!isMatching && (
                <Button
                  onClick={findMatch}
                  size="lg"
                  className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-0 px-8 py-4"
                  disabled={!isConnected}
                >
                  <Video className="w-5 h-5 mr-2" />
                  Start Video Chat
                </Button>
              )}

              {isMatching && (
                <div className="flex space-x-2 mt-6">
                  <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce"></div>
                  <div
                    className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="h-full relative">
              {/* Remote Video */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full h-full bg-black/50 rounded-lg overflow-hidden relative"
              >
                <video ref={remoteVideoRef} className="w-full h-full object-cover" autoPlay playsInline />

                {/* Remote user info overlay */}
                <div className="absolute top-4 left-4">
                  <Card className="bg-black/50 backdrop-blur-lg border-white/20">
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-2">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm">
                            {partner.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-white font-semibold text-sm">
                            {partner.name}, {partner.age}
                          </p>
                          <p className="text-gray-300 text-xs">{partner.location}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Connection status */}
                <div className="absolute top-4 right-4">
                  <Badge
                    variant="secondary"
                    className={`${
                      connectionState === "connected"
                        ? "bg-green-500/20 text-green-400"
                        : connectionState === "connecting"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {connectionState}
                  </Badge>
                </div>
              </motion.div>

              {/* Local Video (Picture-in-Picture) */}
              <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute bottom-4 right-4 w-48 h-36 bg-black rounded-lg overflow-hidden border-2 border-white/20"
              >
                <video ref={localVideoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                {!isVideoEnabled && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                    <VideoOff className="w-8 h-8 text-white" />
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">You</span>
                </div>
              </motion.div>

              {/* Controls */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                <Card className="bg-black/50 backdrop-blur-lg border-white/20">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`w-12 h-12 rounded-full ${
                          isVideoEnabled
                            ? "bg-white/20 text-white hover:bg-white/30"
                            : "bg-red-500 text-white hover:bg-red-600"
                        }`}
                        onClick={toggleVideo}
                      >
                        {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className={`w-12 h-12 rounded-full ${
                          isAudioEnabled
                            ? "bg-white/20 text-white hover:bg-white/30"
                            : "bg-red-500 text-white hover:bg-red-600"
                        }`}
                        onClick={toggleAudio}
                      >
                        {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-12 h-12 rounded-full bg-white/20 text-white hover:bg-white/30"
                        onClick={() => setShowChat(!showChat)}
                      >
                        <MessageSquare className="w-5 h-5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-12 h-12 rounded-full bg-white/20 text-white hover:bg-white/30"
                      >
                        <Monitor className="w-5 h-5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-12 h-12 rounded-full bg-red-500 text-white hover:bg-red-600"
                        onClick={handleNextPerson}
                      >
                        <Phone className="w-5 h-5 rotate-[135deg]" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <AnimatePresence>
          {showChat && partner && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className="w-80 bg-black/20 backdrop-blur-lg border-l border-white/10 flex flex-col"
            >
              {/* Partner Info */}
              <div className="p-4 border-b border-white/10">
                <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-4">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                          {partner.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-white">
                          {partner.name}, {partner.age}
                        </h3>
                        <p className="text-sm text-gray-300">{partner.location}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-gray-300">Interests:</p>
                      <div className="flex flex-wrap gap-2">
                        {partner.interests.map((interest, index) => (
                          <Badge key={index} variant="secondary" className="bg-white/10 text-white text-xs">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                        message.sender === "user"
                          ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      {message.text}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-white/10">
                <div className="flex space-x-2">
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  />
                  <Button
                    onClick={handleSendMessage}
                    size="icon"
                    className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-4 space-y-3 border-t border-white/10">
                <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-0">
                  <Heart className="w-4 h-4 mr-2" />
                  Add Friend
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10"
                  onClick={handleNextPerson}
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  Next Person
                </Button>
                <Button variant="outline" className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10">
                  <Flag className="w-4 h-4 mr-2" />
                  Report User
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
