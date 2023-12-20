import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import {calculateWinner} from "./helper.js"
import cors from 'cors';

const app = express();
const server = http.createServer(app);


app.use(
  cors({
    origin: '*',
    credentials: 'true',
  })
);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
});

const rooms = {};

io.on('connection', (socket) => {
  console.log(`User connected ${socket.id}`);
  
socket.join("lobby")


socket.on('sendMsg',(data)=>{
  console.log("message",data)
  socket.leave("lobby");
  socket.join(data.roomName)
  socket.to(data.roomName).emit('receiveMsg', {text:data.text});
})
  

  
 
  socket.on('joinRoom', (data) => {
    socket.leave("lobby");
    socket.join(data.roomName);
  
    if (!rooms[data.roomName]) {
      //  room doesn't exist, initialiing one
      rooms[data.roomName] = { players: [], board: Array(9).fill(null), started: false, turn: 'O', player: "" };
    }
  
    if (rooms[data.roomName].players.length >= 2) {
      // Room is already filled
      console.log("Room is already filled")
      socket.emit('roomJoinError', { type: 'roomAlreadyFilled', message: 'Room already filled' });
      socket.leave(data.roomName);
      socket.join("lobby");
    } else if (rooms[data.roomName].players.length === 1) {
      // Room has one player
      rooms[data.roomName].players.push('X');
      rooms[data.roomName].started = true;
      rooms[data.roomName].turn = 'O';
      rooms[data.roomName].player = 'X';
  
      io.to(data.roomName).emit('playerJoined', { board: rooms[data.roomName].board, symbol: 'X', turn: 'O' });
    } else {
      // Room  empty
      rooms[data.roomName].players.push('O');
      rooms[data.roomName].started = false;
      rooms[data.roomName].turn = 'O';
      rooms[data.roomName].player = 'O';
  
      io.to(data.roomName).emit('playerJoined', { board: rooms[data.roomName].board, symbol: 'O', turn: 'O' });
    }
  });
  


  socket.on('restart',(data)=>{
    socket.leave("lobby")
    socket.join(data.roomName)
  const room = rooms[data.roomName]
  if(room)  {
    room.board = Array(9).fill(null)
    if(room.players.length>1){
      room.started = true
    }
    
    console.log(room)
     io.in(data.roomName).emit('restartGame',{board: rooms[data.roomName].board})
  }
  
  })
socket.on('makeMove', ({ roomName, index, player }) => {
  
  const room = rooms[roomName];
  if(room.started === false){
    console.log('Game not started')
    socket.emit('invalidMove', 'Game not started');
    return
  }
  if (room) {
    if (player === room.turn && room.started) {
      room.board[index] = player;
      room.turn = room.turn === 'O' ? 'X' : 'O'; // Switch turns
      console.log({ board: room.board, turn: room.turn });

      const winner = calculateWinner(room.board);
      io.in(roomName).emit('updateGame', { board: room.board, turn: room.turn });
      if(winner){
        console.log('winner', winner)
       io.in(roomName).emit('winner', { winner});
       room.started = false;
      }

      
    } else {
      socket.emit('invalidMove', 'Not your turn');
    }
  }
});


  

  
  
  

  socket.on('disconnect', () => {
    console.log(`User disconnected`);
  });
});

  
 
  
  







server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
