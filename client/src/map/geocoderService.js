var map = angular.module('parkAssist.map');
var Q = require('q');

map.factory('Geocoder', [function() {
  var geocoder = new google.maps.Geocoder();
  
  var parseLatLng = function(lat,long) {
    var latlng = new google.maps.LatLng(lat, long);

    var deferred = Q.defer();

    geocoder.geocode({'location': latlng}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        if (results[0]) {
          var addressComponents = results[0].address_components;
          var address = addressComponents[0].long_name + ' ' + addressComponents[1].long_name;
          deferred.resolve(address);
        } else {
          deferred.reject('No results found');
        }
      } else {
        deferred.reject('Geocoder failed due to: ' + status);
      }
    });

    return deferred.promise;
  };

  var parseAddress = function(address) {

    var deferred = Q.defer();

    geocoder.geocode({"address":address}, function(results, status) {
      if ( status !== google.maps.GeocoderStatus.OK ) {
        return;
      }
      var lat = results[0].geometry.location.lat();
      var lng = results[0].geometry.location.lng();

      deferred.resolve([lat,lng]);
    });

    return deferred.promise;
  };

  return {
    parseLatLng: parseLatLng,
    parseAddress: parseAddress
  };

}]);