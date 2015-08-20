var Q = require('q');
var Firebase = require('firebase');
var fb_keys = require('../firebaselink.js');
var crimeCodes = require('./data/crimeCodes.json');
var distance = require('./server.js');
var utility = require('./utility/utility.js');

var fb = new Firebase(fb_keys.url);

// get data from db
var allCrimesFromDatabase; 
var allParkingSpotsFromDatabase; 

// parse dates
var recentDateObj;
var recentDate;
var crimeDate;
var recentCrimesArr;

// update crime scores in database 
var distanceFromCrime; 
var crimeZoneRadius = 0.2; 
var parkingSpotCompositeCrimeScore = 0;
var currentCrimeRating; 
var crimeData; 
// refreshes the crime data once daily 
var refreshCrimeDataInterval = 86400000;

var crimesFromDatabase = function() {
  var deferred = Q.defer();   
  fb.child('CrimeIncident').once('value', function(snapshot) {
    deferred.resolve(snapshot.val());
  }, function(errorObject) {
     deferred.reject(errorObject.code);
     console.log("The read failed:", errorObject.code);
     return deferred.promise;
  });
    return deferred.promise;
};

var parkingMetersFromDatabase = function() {
  var deferred = Q.defer();

  fb.child('MeteredParkingSpots').once('value', function(snapshot) {
    deferred.resolve(snapshot.val());
  }, function(errorObject) {
    deferred.reject(errorObject.code);
    console.log("The read failed:", errorObject.code);
    return deferred.promise;
  });
    return deferred.promise;
};

function makeArrayofNewCrimes(allCrimesArr) {
  var deferred = Q.defer();
  var yesterday = (function(date){ date.setDate(date.getDate()-1); return date})(new Date());
  // convert currentDate to YYYY-MM-DD format 
  var parseMonth = function(month) {
    return month < 10 ? '0' + month : month;
  };
  recentDate = yesterday.getFullYear() + '-' + parseMonth(yesterday.getMonth()+1) + '-' + yesterday.getDate();
  recentCrimesArr = [];

  utility.each(allCrimesArr,function(crime) {
    // crimeDate is the date crime occurred in YYYY-MM-DD format 
    crimeDate = crime.dateOccurred.substr(0,10);
    if (crimeDate === recentDate) {
      recentCrimesArr.push(crime);
    }
  });
  deferred.resolve(recentCrimesArr); 
  return deferred.promise;
}

function crimeScoreMap(parkingSpots, newCrimesOccurred) {
  var deferred = Q.defer();
  for (var parkingSpot in parkingSpots) {
    parkingSpotCompositeCrimeScore = parkingSpots[parkingSpot].compositeCrimeScore;
    newCrimesOccurred.forEach(function(crime) {
      distanceFromCrime = utility.distanceFormula(parkingSpots[parkingSpot].latitude, parkingSpots[parkingSpot].longitude, crime.latitude, crime.longitude); 
      if (distanceFromCrime < crimeZoneRadius) {
        // // look up the crimeRating by the first 2 letters of the crimeCode 
        currentCrimeRating = crimeCodes[crime.UCR.slice(0,2)];
      
        if (currentCrimeRating) {
          parkingSpotCompositeCrimeScore += parseInt(currentCrimeRating.rating);  
        }
      }
    });
    if (parkingSpotCompositeCrimeScore > parkingSpots[parkingSpot].compositeCrimeScore) {
      fb.child('MeteredParkingSpots').child(parkingSpot).child('compositeCrimeScore').set(parkingSpotCompositeCrimeScore);

    }
  }
  
  deferred.resolve(); 
  return deferred.promise;
}

// promises ensure all crimeData and Parking Meter data is received before crimeScoreMap is called 
setInterval(function() {
  return crimesFromDatabase()
    .then(function(crimes) {
      crimeData = makeArrayofNewCrimes(crimes);
      return crimeData;
    })
    .then(function(crimeData) {
      // uses an array to return multiple values to the next function
      return [crimeData, parkingMetersFromDatabase()];
    })
    // use spread instead of then to unpack the array of arguments 
    .spread(function(crimeData, parkingMeters) {
        return crimeScoreMap(parkingMeters, crimeData);
    }),
    function(error) {
      return errorHandling(error);
    };
}, refreshCrimeDataInterval);

module.exports = crimeScoreMap; 
