var map = angular.module('parkAssist.map');
var Q = require('q');
var alertify = require('alertify');

map.factory('Map', ['Traffic', 'DirectionsDisplay', 'Geocoder', 'MapOptions', 'Locator', 'MeterMarkers', 'User', '$rootScope', function (Traffic, DirectionsDisplay, Geocoder, MapOptions, Locator, MeterMarkers, User, $rootScope) {
  var map, center, dbUser, meterLoc;
  var firstSpotInitialized = false;
  var firstLotInitialized = false;
  var range = 0.2;
  var queue = [];
  var lotQueue = [];
  var currentMeterId;

  // If user leaves browser, remove user from db
  window.onbeforeunload = function(e) {
    if(dbUser) {
      dbUser.set(null);
    }
  };

  var getDangerRating = function (crimeScore) {
    var maxCrimeScore = 500
    if (crimeScore < maxCrimeScore/3) {
      return '../img/parkingGreen.png';
    } else if (crimeScore < maxCrimeScore*2/3) {
      return '../img/parkingYellow.png';
    } else { return '../img/parkingRed.png'; }
  }

  var setMeter = function(pSpot) {
    var spot = [pSpot.latitude, pSpot.longitude];
    meterLoc = new google.maps.LatLng(spot[0], spot[1]);
    var parkingPic = getDangerRating(pSpot.compositeCrimeScore)

    MeterMarkers.addMarker(map, true, meterLoc, parkingPic);
  };

  var findSpot = function(tuple, newDestination) {
    var pSpot;

    if(newDestination) {
      queue = [];
    }

    $rootScope.$broadcast('parkAssist:changeLoadingText','Finding you the best parking spot...');
    $rootScope.$broadcast('parkAssist:showLoadingText');

    // If user already has a spot and is just requesting a new one
    if(firstSpotInitialized && !newDestination) {
      pSpot = queue.shift();

      if(!pSpot) {
        $rootScope.$broadcast('parkAssist:hideLoadingText');
        alertify.alert('There are no parking spots in this area at this time.');
        return;
      }

      setMeter(pSpot);
      currentMeterId = pSpot.meter_id;
      User.setDestination(meterLoc);
      User.calcRoute()
      .then(function() {
        $rootScope.$broadcast('parkAssist:hideLoadingText');
      });
      return;
    }

    // User has begun a new search, wipe the old user
    if(dbUser) {
      dbUser.set(null);
    }

    firstSpotInitialized = false;

    // Create a new user
    Locator.createUser(tuple,range)
    .then(function(user) {
      dbUser = user;
      // Setup a listener for recommendations, ordered by distance
      dbUser
      .child('Recommendations')
      .orderByChild('distance')
      .on('child_added', function(snapshot) {
        var pSpot = snapshot.val();

        // If user has a first spot, just push new spots on the queue
        if(firstSpotInitialized) {
          queue.push(pSpot);
          return;
        }

        firstSpotInitialized = true;

        setMeter(pSpot);
        currentMeterId = pSpot.meter_id; 
        User.setDestination(meterLoc);

        User.calcRoute()
        .then(function() {
          $rootScope.$broadcast('parkAssist:hideLoadingText');
        });

      });

    });
  };

  var reserveSpot = function(){
    // tell db to mark currentMeterId as reserved
    if (currentMeterId !== 'LOT'){
      $rootScope.$broadcast('parkAssist:changeLoadingText','reserving your spot');
      $rootScope.$broadcast('parkAssist:showLoadingText');
      console.log('reserveSpot from mapService.js with ', currentMeterId);
      Locator.reserveSpace(currentMeterId)
      .then(function(meter){
        $rootScope.$broadcast('parkAssist:hideLoadingText');
        console.log('Marked meter: '+ meter);
      });
    }
  };

  var findLot = function(tuple, newDestination) {
    var pLot;

    if(newDestination) {
      lotQueue = [];
    }

    $rootScope.$broadcast('parkAssist:changeLoadingText','Finding you the best parking lot...');
    $rootScope.$broadcast('parkAssist:showLoadingText');

    // If user already has a spot and is just requesting a new one
    if(firstLotInitialized && !newDestination) {
      pLot = lotQueue.shift();

      if(!pLot) {
        $rootScope.$broadcast('parkAssist:hideLoadingText');
        alertify.alert('There are no free parking lot spaces in this area at this time.');
        return;
      }

      setMeter(pLot);
      currentMeterId = 'LOT'; // change later; you shouldnt be able to reserve lots
      User.setDestination(meterLoc);
      User.calcRoute()
      .then(function() {
        $rootScope.$broadcast('parkAssist:hideLoadingText');
      });
      return;
    }

    // User has begun a new search, wipe the old user
    if(dbUser) {
      dbUser.set(null);
    }

    firstLotInitialized = false;

    // Create a new user
    Locator.createUser(tuple,range*10)
    .then(function(user) {
      dbUser = user;
      // Setup a listener for recommendations, ordered by distance
      dbUser
      .child('LotRecommendations')
      .orderByChild('distance')
      .on('child_added', function(snapshot) {
        var pLot = snapshot.val();

        // If user has a first spot, just push new spots on the lotQueue
        if(firstLotInitialized) {
          lotQueue.push(pLot);
          return;
        }

        firstLotInitialized = true;

        setMeter(pLot);
        currentMeterId = 'LOT'; // change later; you shouldnt be able to reserve lots
        User.setDestination(meterLoc);

        User.calcRoute()
        .then(function() {
          $rootScope.$broadcast('parkAssist:hideLoadingText');
        });

      });

    });
  };

  var getMap = function() {
    return map;
  };

  var getCurrentLocation = function() {
    window.navigator.geolocation.getCurrentPosition(function(pos) {

      var lat = pos.coords.latitude;
      var lng = pos.coords.longitude;

      Geocoder.parseLatLng(lat,lng)
      .then(function(addressInfo) {

        User.watchPosition(map)
        .then(function(userLocation) {
          map.panTo(userLocation);
          $rootScope.$broadcast('parkAssist:initAutoComplete');
        });

        if( !addressInfo.formatted_address.match(/Santa Monica/) ) {
          $rootScope.$broadcast('parkAssist:hideLoadingText');
          alertify.alert('You are outside of Santa Monica. Please select a Santa Monica destination.');
          firstSpotInitialized = true;
          return;
        }

        findLot([lat,lng]);
        findSpot([lat,lng]);
        
      });

    }, null);
  };

  var init = function(mapCanvas) {
    map = new google.maps.Map(mapCanvas, MapOptions);
    DirectionsDisplay.setMap(map);
    Traffic.showTraffic(map);

    google.maps.event.addDomListener(map, 'idle', function() {
      center = map.getCenter();
    });

    google.maps.event.addDomListener(window, 'resize', function() {
      map.setCenter(center);
    });

    $rootScope.$broadcast('parkAssist:changeLoadingText', 'Finding your location...');
    $rootScope.$broadcast('parkAssist:showLoadingText');

    getCurrentLocation();
  };

  return {
    init: init,
    findSpot: findSpot,
    reserveSpot: reserveSpot,
    findLot: findLot,
    getMap: getMap
  };
}]);
