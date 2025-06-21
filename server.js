const express = require("express")
const { createServer } = require("http")
const { Server } = require("socket.io")
const next = require("next")

const dev = process.env.NODE_ENV !== "production"
const app = next({ dev })
const handle = app.getRequestHandler()

const PORT = process.env.PORT || 3000

app.prepare().then(() => {
  const server = express()
  const httpServer = createServer(server)

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  })

  // Store connected users and waiting queue
  const connectedUsers = new Map()
  const waitingQueue = []
  const activeRooms = new Map()

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id)

    // Handle user joining
    socket.on("join", (userData) => {
      connectedUsers.set(socket.id, {
        ...userData,
        socketId: socket.id,
        isMatching: false,
        roomId: null,
      })

      socket.emit("joined", { userId: socket.id })
    })

    // Handle finding a match
    socket.on("find-match", () => {
      const user = connectedUsers.get(socket.id)
      if (!user) return

      user.isMatching = true

      // Check if there's someone waiting
      const waitingUser = waitingQueue.find((u) => u.socketId !== socket.id)

      if (waitingUser) {
        // Remove from waiting queue
        const index = waitingQueue.indexOf(waitingUser)
        waitingQueue.splice(index, 1)

        // Create room
        const roomId = `room_${socket.id}_${waitingUser.socketId}`

        // Update user data
        user.roomId = roomId
        user.isMatching = false
        waitingUser.roomId = roomId
        waitingUser.isMatching = false

        // Join both users to room
        socket.join(roomId)
        io.sockets.sockets.get(waitingUser.socketId)?.join(roomId)

        // Store active room
        activeRooms.set(roomId, {
          users: [user, waitingUser],
          createdAt: new Date(),
        })

        // Notify both users of match
        socket.emit("match-found", {
          roomId,
          partner: {
            name: waitingUser.name || "Anonymous",
            age: waitingUser.age || 22,
            location: waitingUser.location || "🌍 Unknown",
            interests: waitingUser.interests || ["Chat", "Music"],
          },
        })

        io.to(waitingUser.socketId).emit("match-found", {
          roomId,
          partner: {
            name: user.name || "Anonymous",
            age: user.age || 22,
            location: user.location || "🌍 Unknown",
            interests: user.interests || ["Chat", "Music"],
          },
        })
      } else {
        // Add to waiting queue
        waitingQueue.push(user)
        socket.emit("waiting-for-match")
      }
    })

    // WebRTC Signaling
    socket.on("webrtc-offer", (data) => {
      socket.to(data.roomId).emit("webrtc-offer", {
        offer: data.offer,
        from: socket.id,
      })
    })

    socket.on("webrtc-answer", (data) => {
      socket.to(data.roomId).emit("webrtc-answer", {
        answer: data.answer,
        from: socket.id,
      })
    })

    socket.on("webrtc-ice-candidate", (data) => {
      socket.to(data.roomId).emit("webrtc-ice-candidate", {
        candidate: data.candidate,
        from: socket.id,
      })
    })

    // Chat messages
    socket.on("chat-message", (data) => {
      socket.to(data.roomId).emit("chat-message", {
        message: data.message,
        from: socket.id,
        timestamp: new Date(),
      })
    })

    // Handle user leaving room
    socket.on("leave-room", () => {
      const user = connectedUsers.get(socket.id)
      if (user && user.roomId) {
        socket.to(user.roomId).emit("partner-left")
        socket.leave(user.roomId)

        // Clean up room
        activeRooms.delete(user.roomId)
        user.roomId = null
        user.isMatching = false
      }
    })

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id)

      const user = connectedUsers.get(socket.id)
      if (user) {
        // Remove from waiting queue
        const queueIndex = waitingQueue.findIndex((u) => u.socketId === socket.id)
        if (queueIndex > -1) {
          waitingQueue.splice(queueIndex, 1)
        }

        // Notify partner if in room
        if (user.roomId) {
          socket.to(user.roomId).emit("partner-left")
          activeRooms.delete(user.roomId)
        }

        connectedUsers.delete(socket.id)
      }
    })

    // Send online users count
    setInterval(() => {
      io.emit("online-count", connectedUsers.size)
    }, 5000)
  })

  // Handle Next.js requests
  server.all("*", (req, res) => {
    return handle(req, res)
  })

  httpServer.listen(PORT, (err) => {
    if (err) throw err
    console.log(`> Ready on http://localhost:${PORT}`)
  })
})
