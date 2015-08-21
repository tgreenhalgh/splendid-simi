var Q = require('q');
var Firebase = require('firebase');
var fb_keys = require('../firebaselink.js');
var crimeCodes = require('./data/crimeCodes.json');
var distance = require('./server.js');
var utility = require('./utility/utility.js');

var calculateCrimeScore = (function() {
  // get data from db
  var fb = new Firebase(fb_keys.url);
  var allCrimesFromDatabase; 
  var allParkingSpotsFromDatabase; 

  // parse dates
  var recentDateObj;
  var recentDate;
  var crimeDate;
  var recentCrimesArr;
  var allCrimesArr;

  // update crime scores in database 
  var distanceFromCrime; 
  var crimeZoneRadius = 0.2; 
  var parkingSpotCompositeCrimeScore = 0;
  var currentCrimeRating; 
  var crimeData; 
  
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

  var makeArrayofNewCrimes = function(allCrimesObj, dateObj){
    var deferred = Q.defer();
    var datePassedIn = utility.makeDateStr(dateObj);
    recentCrimesArr = [];

    utility.each(allCrimesObj,function(crime) {
      // crimeDate is the date crime occurred in YYYY-MM-DD format 
      crimeDate = crime.dateOccurred.substr(0,10);

      if (crimeDate === datePassedIn) {
        recentCrimesArr.push(crime);
       } 
    });
    deferred.resolve(recentCrimesArr); 
    return deferred.promise;
  };

  var makeArrayofAllCrimes = function(allCrimesObj){
    var deferred = Q.defer();
    allCrimesArr = [];

    utility.each(allCrimesObj,function(crime) {
      allCrimesArr.push(crime); 
    });
    deferred.resolve(allCrimesArr); 
    return deferred.promise;
  };

  var crimeScoreMap = function(parkingSpots, newCrimesOccurred){
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
        console.log("updates database with parking meter crime score", parkingSpot, 'score', parkingSpotCompositeCrimeScore);

      }
    }
    deferred.resolve(); 
    return deferred.promise;
  };

  return {
    crimesFromDatabase: crimesFromDatabase,
    makeArrayofNewCrimes: makeArrayofNewCrimes,
    makeArrayofAllCrimes: makeArrayofAllCrimes,
    parkingMetersFromDatabase: parkingMetersFromDatabase,
    crimeScoreMap: crimeScoreMap
  };
})();

module.exports = calculateCrimeScore; 
