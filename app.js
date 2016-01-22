console.log("Start App");

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var messages = [];

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

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
  console.log("Listening");
});
