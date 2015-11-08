'use strict';

angular.module('peerflixServerApp')
  .controller('MainCtrl', function ($scope, $resource, $log, $q, $upload, torrentSocket, chatSocket, $http) {
    $http.defaults.useXDomain = true;
    var Torrent = $resource('/torrents/:infoHash');
    var Search = $resource('/search/:query');

    function load() {
      var torrents = Torrent.query(function () {
        $scope.torrents = torrents.reverse();
      });
    }

    function loadTorrent(hash) {
      return Torrent.get({ infoHash: hash }).$promise.then(function (torrent) {
        var existing = _.find($scope.torrents, { infoHash: hash });
        if (existing) {
          var index = $scope.torrents.indexOf(existing);
          $scope.torrents[index] = torrent;
        } else {
          $scope.torrents.unshift(torrent);
        }
        return torrent;
      });
    }

    function findTorrent(hash) {
      var torrent = _.find($scope.torrents, { infoHash: hash });
      if (torrent) {
        return $q.when(torrent);
      } else {
        return loadTorrent(hash);
      }
    }

    load();

    $scope.playFile = function(link){
      $scope.fileToPlay = window.location.origin + link;
      chatSocket.get();
    }

    $scope.keypress = function (e) {
      if (e.which === 13) {
        $scope.download();
      }
    };

    $scope.download = function () {
      if ($scope.link) {
        Torrent.save({ link: $scope.link }).$promise.then(function (torrent) {
          loadTorrent(torrent.infoHash);
        });
        $scope.link = '';
      }
    };

    $scope.upload = function (files) {
      if (files && files.length) {
        files.forEach(function (file) {
          $upload.upload({
            url: '/upload',
            file: file
          }).then(function (response) {
            loadTorrent(response.data.infoHash);
          });
        });
      }
    };

    $scope.pause = function (torrent) {
      torrentSocket.emit(torrent.stats.paused ? 'resume' : 'pause', torrent.infoHash);
      chatSocket.emit('message', 'hey');
    };

    $scope.select = function (torrent, file) {
      torrentSocket.emit(file.selected ? 'deselect' : 'select', torrent.infoHash, torrent.files.indexOf(file));
    };

    $scope.remove = function (torrent) {
      Torrent.remove({ infoHash: torrent.infoHash });
      _.remove($scope.torrents, torrent);
    };

    $scope.searchKC = function(e){
      if(e.which === 13){
        callKCApi($scope.searchQuery);
      }
    };

    $scope.watchNow = function(e){
      $scope.link = e.currentTarget.id;
      $scope.download();
    };

    $scope.sendChat = function(e){
      e.preventDefault();
      var chat = $('#chatInput').val();
      chatSocket.send(chat);
    };

    function callKCApi(q){
      Search.save({query : q}).$promise.then(function(result){
        $scope.searchResult = result.list;
      });
    }

    torrentSocket.on('verifying', function (hash) {
      findTorrent(hash).then(function (torrent) {
        torrent.ready = false;
      });
    });

    torrentSocket.on('ready', function (hash) {
      loadTorrent(hash);
    });

    torrentSocket.on('interested', function (hash) {
      findTorrent(hash).then(function (torrent) {
        torrent.interested = true;
      });
    });

    torrentSocket.on('uninterested', function (hash) {
      findTorrent(hash).then(function (torrent) {
        torrent.interested = false;
      });
    });

    torrentSocket.on('stats', function (hash, stats) {
      findTorrent(hash).then(function (torrent) {
        torrent.stats = stats;
      });
    });

    torrentSocket.on('download', function (hash, progress) {
      findTorrent(hash).then(function (torrent) {
        torrent.progress = progress;
      });
    });

    torrentSocket.on('selection', function (hash, selection) {
      findTorrent(hash).then(function (torrent) {
        for (var i = 0; i < torrent.files.length; i++) {
          var file = torrent.files[i];
          file.selected = selection[i];
        }
      });
    });

    torrentSocket.on('destroyed', function (hash) {
      _.remove($scope.torrents, { infoHash: hash });
    });

    torrentSocket.on('disconnect', function () {
      $scope.torrents = [];
    });

    torrentSocket.on('connect', load);
  });
