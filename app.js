var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var messages = [];

app.use(express.static(__dirname + '/client'));

app.get('/history', function(req, res) {
  res.send(messages);
});

io.on('connection', function(socket) {
  console.log('an user connected');
  socket.on('chat message', function(msg) {
    io.emit('chat message', msg);
    console.log(msg);
    messages.push(msg);
  });
});

http.listen(process.env.PORT || 8080, function() {
  console.log("Listening...");
});
