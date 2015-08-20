var map = angular.module('parkAssist.map');

map.directive('map', ['Map', '$rootScope', function(Map, $rootScope) {
  
  var link = function(scope, element, attrs) {
    var $el = $(element);
    var mapCanvas = $el.find('#map-canvas')[0];
    var $changeDest = $el.find('.change-destination');
    var $reserveSpot = $el.find('.reserve-spot');
    var $anotherSpot = $el.find('.another-spot');
    var $parkingLot = $el.find('.parking-lot');
    var $loading = $el.find('.loading');
    var $loadingText = $loading.find('.loading-text');

    scope.$on('parkAssist:changeLoadingText', function(e,text) {
      $loadingText.text(text);
    });

    scope.$on('parkAssist:showLoadingText', function(e) {
      $loading.addClass('show');
    });

    scope.$on('parkAssist:hideLoadingText', function(e) {
      $loading.removeClass('show');
    });

    $changeDest.on('click',function(e) {
      $rootScope.$broadcast('parkAssist:openModal');
    });

    $reserveSpot.on('click', function(e) {
      Map.reserveSpot();
    });

    $anotherSpot.on('click',function(e) {
      Map.findSpot();
      $reserveSpot.show();
    });

    $parkingLot.on('click',function(e) {
      Map.findLot();
      $reserveSpot.hide();
    });

    Map.init(mapCanvas);
  };

  return {
    restrict: 'E',
    replace: true,
    templateUrl: 'js/map/mapTemplate.html',
    link: link
  };
}]);