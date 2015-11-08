'use strict';

angular.module('peerflixServerApp')
  .factory('torrentSocket', function (socketFactory) {
    return socketFactory();
  })
  .factory('chatSocket', function($rootScope, $firebaseObject) {
    var ref = new Firebase("https://chillflix.firebaseio.com/");
    return {
      send : function(msg){
        ref.push({message : msg});
        $('#chatInput').val('');
      },
      get : function(){
        ref.limitToLast(10).on('child_added', function(snap){
          $('#messages').append($('<li>').text(snap.val().message));
        })
      }
    }
  });
