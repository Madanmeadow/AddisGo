const express = require('express')
const http = require('http')
const cors = require('cors')
const { Server } = require('socket.io')

const app = express()
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/auth', require('./routes/auth.routes'))
app.use('/api/posts', require('./routes/posts.routes'))

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

io.on('connection', (socket) => {
  console.log('🔥 User connected:', socket.id)

  socket.on('joinConversation', (conversationId) => {
    socket.join(`room_${conversationId}`)
  })

  socket.on('sendMessage', (data) => {
    io.to(`room_${data.conversationId}`).emit('newMessage', data)
  })

  // WebRTC Signaling
  socket.on('offer', (data) => {
    socket.to(data.room).emit('offer', data.offer)
  })

  socket.on('answer', (data) => {
    socket.to(data.room).emit('answer', data.answer)
  })

  socket.on('ice-candidate', (data) => {
    socket.to(data.room).emit('ice-candidate', data.candidate)
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})



