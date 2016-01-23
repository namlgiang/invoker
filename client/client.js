var socket = io();

$.get('/history', function(data) {
  console.log(data);
  for(var i=0; i<data.length; i++)
    $('#messages').append($('<li>').text(data[i]));
});

$('form').submit(function(){
  socket.emit('chat message', $('#m').val());
  $('#m').val('');
  return false;
});
socket.on('chat message', function(msg){
  $('#messages').append($('<li>').text(msg));
});
