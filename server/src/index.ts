import express from 'express'
import { createServer } from 'http'
import { Server } from 'colyseus'
import { monitor } from '@colyseus/monitor'
import { GroupRoom } from './rooms/GroupRoom'
import { LobbyRoom } from './rooms/LobbyRoom'
import path from 'path'

const PORT = Number(process.env.PORT ?? 2567)

const app = express()
app.use(express.json())

// Serve static client files in production
const distPath = path.resolve(__dirname, '../../client/dist')
app.use(express.static(distPath))

// Colyseus monitor (admin panel at /colyseus)
app.use('/colyseus', monitor())

const httpServer = createServer(app)
const gameServer = new Server({ server: httpServer })

gameServer.define('lobby', LobbyRoom)
gameServer.define('group', GroupRoom)

gameServer.listen(PORT).then(() => {
  console.log(`Colyseus server listening on ws://localhost:${PORT}`)
})
