var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

/* Rooms:
[
{id:
messages:
users: []}
] */
var rooms = [];

/* Connecting users:
[
{username:
key:
socket:
room:}
] */
var users = [];

//Waiting user
var waitingUser;



app.use(express.static(__dirname + '/client'));

function disconnectUser(user) {
  if(user.room != undefined) {
    io.to(user.room.id).emit('disconnect', user.username);
  }
}

io.on('connection', function(socket) {
  console.log('an user connected ' + socket.id);

  // Leave
  socket.on('leave', function() {
    for(var i=0; i<users.length; i++)
      if(users[i].socket.id == socket.id && users[i].room != undefined) {
        io.to(users[i].room.id).emit('left', users[i].username);
        socket.leave(users[i].room);
        users[i].room.activeUser--;
        if(users[i].room.activeUser == 0) {
          for(var j=0; j<rooms.length; j++)
            if(rooms[j].id == users[i].room.id) {
              rooms.splice(j,1);
              break;
            }
        }
        users[i].room = undefined;
        socket.emit('leave complete');
      }
  });

  // On disconnect:
  // Stop finding match
  // Leave room
  socket.on('disconnect', function() {
    console.log('- an user disconnected ' + socket.id);
    if(waitingUser != undefined && waitingUser.socket.id == socket.id)
      waitingUser = undefined;
    for(var i=0; i<users.length; i++)
      if(users[i].socket.id == socket.id)
        disconnectUser(users[i]);
  });

  // Authenticate with client
  socket.on('authenticate', function(user) {
    console.log('authenticate ' + user.username);
    for(var i=0; i<users.length; i++)
      if(users[i].username == user.username && users[i].key == user.key) {
        users[i].socket = socket;
        var ul = [];
        if(users[i].room != undefined)
          for(var j=0; j<users[i].room.users.length; j++)
            ul.push(users[i].room.users[j].username);
        socket.emit('authenticate complete', {
          valid: true,
          hasRoom: users[i].room == undefined ? false : users[i].room.id,
          userList: users[i].room == undefined ? false : ul
        });
        if(users[i].room != undefined) {
          console.log("Old room id: " + users[i].room.id);
          socket.join(users[i].room.id);
          socket.emit('chat history', users[i].room.messages);
          io.to(users[i].room.id).emit('reconnect', user.username);
        }
        return;
      }
    socket.emit('authenticate complete', {
      validate: false
    });
  });

  // Register new user
  socket.on('register', function(user) {
    for(var i=0; i<users.length; i++)
      if(users[i].username == user.username) {
        socket.emit('register complete', {
          err: "username already exists!"
        });
        return;
      }

    var newUser = {
      "username": user.username,
      "key": randomString(32),
      "socket": socket,
      "room": undefined
    };
    users.push(newUser);
    socket.emit('register complete', {
      "username": newUser.username,
      "key": newUser.key
    });
  });

  // Log out
  socket.on('logout', function() {
    if(waitingUser != undefined && waitingUser.socket.id == socket.id)
      waitingUser = undefined;
    for(var i=0; i<users.length; i++)
      if(users[i].socket.id == socket.id) {
        disconnectUser(users[i]);
        users.splice(i,1);
        socket.emit('logout complete', true);
        return;
      }
    socket.emit('logout complete', false);
  });

  // Find match
  socket.on('find match', function() {
    for(var i=0; i<users.length; i++)
      if(users[i].socket.id == socket.id) {
        if(waitingUser == undefined)
          waitingUser = users[i];
        else {
          // Notify to both user and move to new room
          var newRoom = waitingUser.username + '_' + users[i].username;

          // Add new room
          var roomObj = {
            id: newRoom,
            users: [waitingUser, users[i]],
            messages: [],
            activeUser: 2
          };
          rooms.push(roomObj);
          users[i].room = roomObj;
          waitingUser.room = roomObj;

          waitingUser.socket.join(newRoom);
          users[i].socket.join(newRoom);

          var data = {
            userList: [waitingUser.username, users[i].username],
            room: newRoom
          };

          waitingUser.socket.emit('found match', data);
          users[i].socket.emit('found match', data);
          waitingUser = undefined;
        }
      }
  });
  socket.on('stop match', function() {
    if(waitingUser != undefined && waitingUser.socket.id == socket.id)
      waitingUser = undefined;
  });

  // Send message
  socket.on('chat', function(data) {
    io.to(data.room).emit('chat', data);
    for(var i=0; i<rooms.length; i++)
      if(rooms[i].id == data.room)
        rooms[i].messages.push(data);
  });

});

http.listen(process.env.PORT || 8080, function() {
  console.log("Listening...");
});

function randomString(length) {
    var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}
