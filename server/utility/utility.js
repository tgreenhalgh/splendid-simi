var utilities = {
  each: function(input, callback) {
    if (Array.isArray(input)) {
      for (var i = 0; i < input.length; i++) {
        callback(input[i], i, input);
      }
    } else if (Object.prototype.toString.call(input) === "[object Object]") {
      for (var item in input) {
        callback(input[item], item, input);
      }
    } else {
      return "please enter a valid object or array to iterate over"; 
    }
  },
  distanceFormula: function(latU, longU, latP, longP) {
    return Math.sqrt(Math.pow((latP - latU) * 69.1128, 2) + Math.pow((longP - longU) * 57.2807, 2));
  }

}

module.exports = utilities;
