// Signaling service for WebRTC peer-to-peer connections
// In a real app, this would use WebSockets or Socket.IO

export class SignalingService {
  private ws: WebSocket | null = null
  private callbacks: { [key: string]: Function[] } = {}

  constructor(private userId: string) {}

  connect() {
    // In a real implementation, connect to your signaling server
    // this.ws = new WebSocket('wss://your-signaling-server.com')

    // For demo purposes, we'll simulate signaling
    console.log("Signaling service connected")
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
    }
  }

  // Send signaling messages
  send(type: string, data: any, targetUserId?: string) {
    const message = {
      type,
      data,
      from: this.userId,
      to: targetUserId,
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }

    // For demo, simulate receiving messages
    this.simulateResponse(type, data)
  }

  // Listen for signaling messages
  on(event: string, callback: Function) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = []
    }
    this.callbacks[event].push(callback)
  }

  off(event: string, callback: Function) {
    if (this.callbacks[event]) {
      this.callbacks[event] = this.callbacks[event].filter((cb) => cb !== callback)
    }
  }

  private emit(event: string, data: any) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach((callback) => callback(data))
    }
  }

  // Simulate signaling responses for demo
  private simulateResponse(type: string, data: any) {
    setTimeout(() => {
      switch (type) {
        case "offer":
          this.emit("answer", { answer: "simulated-answer" })
          break
        case "answer":
          this.emit("connected", {})
          break
        case "ice-candidate":
          this.emit("ice-candidate", { candidate: "simulated-candidate" })
          break
      }
    }, 1000)
  }

  // Find and match with random user
  findMatch() {
    // Simulate finding a match
    setTimeout(() => {
      this.emit("match-found", {
        userId: "stranger-" + Math.random().toString(36).substr(2, 9),
        name: "Alex",
        age: 22,
        location: "🇺🇸 California, USA",
        interests: ["Photography", "Music", "Travel"],
      })
    }, 2000)
  }
}
