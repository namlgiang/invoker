var socket = io();
var user, room;

/*
GLOBAL
*/

$(document).ready(function() {

  if(!authenticate()) {
    $(".login").addClass("active");
  }

  $(".username").focus();
  $(".username").keypress(function(e) {
    if(e.keyCode == 13)
      login();
  });

  $(".submit").click(function() {
    login();
  });

  $(".log-out").click(function() {
    socket.emit('logout');
  });

  $(".find-match").click(function() {
    if(!$(this).is(".active")) {
      $(this).text("Finding match...").addClass("active");
      socket.emit("find match");
    }
    else {
      $(this).text("Find match").removeClass("active");
      socket.emit("stop match");
    }
  });

  $(".message").keyup(function(e) {
    if(e.keyCode == 13)
      sendMessage();
  });
  $(".send").click(function() {
    sendMessage();
  });

  $(".leave").click(function() {
    socket.emit("leave");
  });

});

function sendMessage() {
  if($(".message").val().trim() != "") {
    socket.emit("chat", {
      'room': room,
      'name': user.username,
      'msg': $(".message").val()
    });
    $(".message").val("");
  }
}

/*
RECEIVE
*/

socket.on('leave complete', function() {
  room = undefined;
  $(".chat").removeClass('active');
  $(".main").addClass('active');
  $(".find-match").text("Find match").removeClass("active");
});

socket.on('left', function(user) {
  var li = $("<li>").addClass('disconnected').html(user + " left the room");
  $(".messages").append(li);
});

socket.on('disconnect', function(user) {
  var li = $("<li>").addClass('disconnected').html(user + " has just been disconnected");
  li.css('opacity', 1).animate({opacity: 1}, 3000).animate({opacity: 0}, 500, function() {
    $(this).remove();
  });
  $(".messages").append(li);
});

socket.on('reconnect', function(user) {
  var li = $("<li>").addClass('reconnected').html(user + " has just been reconnected");
  li.css('opacity', 1).animate({opacity: 1}, 3000).animate({opacity: 0}, 500, function() {
    $(this).remove();
  });
  $(".messages").append(li);
});

// Chat history
socket.on('chat history', function(data) {
  for(var i=0; i<data.length; i++)
    $(".messages").append("<li>" + data[i].name + ": " + data[i].msg + "</li>");
});

// Receive message
socket.on('chat', function(data) {
  console.log(data);
  $(".messages").append("<li>" + data.name + ": " + data.msg + "</li>");
});

// On match found
socket.on('found match', function(data) {
  $(".main").removeClass("active");
  $(".chat").addClass("active");
  $(".messages").empty();
  $(".chat .title").html(data.userList[0] + " & " + data.userList[1]);
  room = data.room;
});

// On authenticate response
socket.on('authenticate complete', function(data) {
  console.log('authenticate: ');
  console.log(data);
  if(data.valid) {
    $(".welcome .name").html(user.username);

    if(data.hasRoom) {
      room = data.hasRoom;
      $(".chat .title").html(data.userList[0] + " & " + data.userList[1]);
      $(".chat").addClass("active");
      $(".main").removeClass("active");
      $(".login").removeClass("active");
    }
    else {
      $(".main").addClass("active");
      $(".login").removeClass("active");
      $(".welcome .name").html(user.username);
    }

  }
  else {
    $(".login").addClass("active");
    $(".main").removeClass("active");
  }
});

// On register response
socket.on('register complete', function(data) {
  if(data.err != undefined) {
    $(".msg").html(data.msg);
    console.log(data.msg);
    return;
  }
  $(".msg").html("");
  user = data;
  $.cookie("user", JSON.stringify(user));
  $(".welcome .name").html(user.username);
  $(".main").addClass("active");
  $(".login").removeClass("active");
});

// On log out response
socket.on('logout complete', function(data) {
  if(data) {
    $(".login").addClass("active");
    $(".main").removeClass("active");
    $(".find-match").text("Find match").removeClass("active");
  }
});

/*
SEND
*/

// Send authenticate data
function authenticate() {
  var cookie = $.cookie('user');
  if(cookie == undefined)
    return false;
  user = $.parseJSON($.cookie('user'));
  console.log("user from cookie: ");
  console.log(user);
  if(user == undefined)
    return false;
  socket.emit('authenticate', user);
  return true;
}

// Send login request
function login() {
  $(".find-match").removeClass('active');

  var u = $(".username").val();
  if(u=="") {
    $(".login").animate({left: "49%"}, 50).animate({left: "51%"}, 50). animate({left: "50%"}, 100);
    $(".username").focus();
    console.log("username cannot be empty");
    return;
  }
  console.log("registering username");
  socket.emit('register', {username: u});
}
