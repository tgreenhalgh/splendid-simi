# Park Assist
####A web application to quickly help you find the closest metered parking spot in Santa Monica, CA.

##Problem
Parking is near impossible to find in Santa Monica. In addition, the information in the Santa Monica Parking API is not being fully utilized.

##Abstract
Web app to take the decision making away from parking at meters in Santa Monica, CA. It will choose the closest confirmed open parking meter for you.

##Strategy
The Santa Monica Parking API provides information on 6700+ meters local to Santa Monica. Hundreds of meter events are sent to the API per minute. We took this data and processed it behind the scenes using two different servers and created a client app that uses that data to facilitate reasonable and responsive meter parking decisions for the user.

## Developer Documentation

####Tools Used:
* [AngularJS](https://angularjs.org/)
* [Firebase](https://www.firebase.com/)
* [Node.js](https://nodejs.org/)
* [Express](http://expressjs.com/)
* [Google Maps APIs](https://developers.google.com/maps/?hl=en/)
* [City of Santa Monica Parking Data API](https://parking.api.smgov.net/)
* [City of Santa Monica Crime Data API ](https://data.smgov.net/Public-Safety/Police-Incidents/kn6p-4y74)

####To start contributing to the Park Assist codebase:
  1. Fork the repo
  2. Clone your fork locally
  3. npm install - server dependencies
  4. bower install - client dependencies
  5. Set your Google Maps API key in index.html
  6. gulp - run the app on a local server
  7. Visit http://localhost:8080/ on your browser

####Google Developer Console API Dependencies:
  * **Google Maps JavaScript API v3** - Google Maps functionality via JS
  * **Google Maps Embed API** - Embeds your maps on different pages
  * **Directions API** - Path calculation and rendering
  * **Geocoding API** - Coordinate calculation via address strings or Latitude/Longitude tuples

##Front End

###Client Application Information
We loosely modeled the directory structure from the information in this article:
https://scotch.io/tutorials/angularjs-best-practices-directory-structure

```
js
├── app.js
├── directions
│   ├── directionsDisplayService.js
│   ├── directionsService.js
│   └── index.js
├── geocoder
│   ├── geocoderService.js
│   └── index.js
├── locator
│   ├── index.js
│   └── locatorService.js
├── map
│   ├── index.js
│   ├── mapDirective.js
│   ├── mapOptions.js
│   ├── mapService.js
│   └── mapTemplate.html
├── markers
│   ├── index.js
│   ├── meterMarkerService.js
│   └── userMarkerService.js
├── modal
│   ├── index.js
│   ├── modalDirective.js
│   ├── modalService.js
│   └── modalTemplate.html
├── team
│   ├── index.js
│   ├── teamController.js
│   ├── teamDirective.js
│   └── teamTemplate.html
├── traffic
│   ├── index.js
│   └── trafficService.js
└── user
    ├── index.js
    └── userService.js
```
  * The main is located at js/app.js
      * All app.js does is require all module dependencies
      * The only controller is used by the team directive.

  * Primary functionality is split up into custom directives
    * **Map** - You will probably be most concerned with this.
    * **Modal**
    * **Team**

  * ng services are arranged into separate directories w/ an index.js that requires the service into a module of the same name
    * **Directions** - Calculates and renders path on Google Maps.
    * **Geocoder** - Parses to Latitude/Longitude coordinates into a LatLng object w/ useful location data. Parses street address strings into LatLng objects.
    * **Locator** - Functionality for creating user based on browser user location. Each unique user location is posted into the database as a unique user on Geolocation resolution.
    * **Map** - Map initialization, logic for setting parking spot marker when meter is found and returning an instance of the map initialized on the DOM.
    * **Markers** - Color coded map marker methods for User and Parking Meters.
    * **Traffic** - Traffic layer for Google Maps. Minimal ng service ideal for studying the code base file structure.
    * **User** - Watches user position through browser Geolocation data. Heavy dependency on Directions service.

###Buttons
* **Show Me Another Spot** - Shows the user another candidate spot taken from the queue of parking meters.
* **Enter Another Destination** - This will change the target destination of the user and repeat steps 1-6 above with that location information.
* **Reserve This Spot** - This will remove the parking spot the user selected from all other user's recommended park spaces so no two users will be directed to the same parking space.
* **Show Me a Parking Lot** - This will direct the user to the nearest parking space that has available parking spaces.

###Color Code 
 * **Map Legend** - The map legend in the upper-righthand corner of the application shows the color-codes for each parking meter and parking lot. Green indicates a weighted score of 500 or less crimes within the past year. Yellow indicates a weighted score of 500-750 crimes within the past year. Red indicates a weighted score of 750 or greater within the past year. 
 * **Parking Icon** - When a marker appears on the page, the icon will be a P for a parking spot or an L for a parking lot. 
 * **Parking Icon Color** - The color of the parking icon (green, yellow, or red) is based on the compositeSafetyScore of each parking meter. The compositeSafetyScore is created using a weighted algorithm that looks at the frequency and severity of crimes that have occurred in an 0.2 mile radius of the parking space or parking lot.
 
##Back End

###Server Information

This application uses two servers:

####IMPORTANT: If you are cloning this repo, create a file in the root directory called firebaselink.js that contains:

module.exports = {
   url: 'URL for your firebase database'
}

#####This is so that you can link it to your firebase database.

* **"Parking Spot Analyzer" Server** - responsible for choosing the meters to be sent to the client and for updating the parking meter's composite crime scores daily. Its logic is stored in server/server.js in the main Parking Assist repository.

* **"Cloudify" Server** - used to scrape the events from the City of Santa Monica parking meter and parking lot APIs to keep the database updated. Additionally, updates the compositeCrimeScores for each parking meter by scraping the City of Santa Monica crime API. The source code for this server is located in the [dbScrape](https://github.com/splendid-simi/dbScrape) repository. 

**Steps to loading up the main page and routing a user to a parking space:**

  1. The client app finds user current location and sends a get request to the PSA server.
  2. The PSA server stores the current location as a unique user in the firebase database, so that personalized parking recommendations can be stored.
  3. The PSA server pings Firebase database and iterates through all 6000+ meters stored in the database to find all within 0.2 (default setting) miles away that currently show as empty (or SE) according to the data imported in the Cloudify. The information for the meters are added to an array of meter information objects.
  4. The PSA server sorts this array of meter information objects by the distance from the user and adds this array of objects under the user information in the database.
  5. The PSA server responds to the client with the closest spot.
  6. The client app maps the location on Google Maps.

####Cloudify Server
Cloudify automatically updates the Firebase database with event information for each meter (mostRecentEvent and timeStamp fields only). We split this into a separate server so that the speed of this application would not be affected by the constantly changing meter event information. [The repo can be found here.](https://github.com/splendid-simi/dbScrape/)

### Database Information

We use Firebase to store the data.

#### Schema

#####MeteredParkingSpots
* #####MeterID
  * compositeCrimeScore - safety score assigned to each parking meter based on frequency and severity of crimes that have happened within an 0.2 mile radius  
  * active - Set up with PSA server
  * latitude - Set up with PSA server
  * longitude - Set up with PSA server
  *  mostRecentEvent- Continually updated with Cloudify Server
  *  timeStamp- Continually updated with Cloudify Server

* #####ParkingLots
  * Firebase unique identifier
    * available_spaces - number of available parking spaces in the parking lot 
    * latitude - from Google Maps API
    * logitude - from Google Maps API
    * safety score assigned to each parking lot based on frequency and severity of crimes that have happened within an 0.2 mile radius  
    * lot_id - unique lot identifier 

* #####Users
  * Firebase unique identifier
    * latitude - from Google Maps API
    * logitude - from Google Maps API
    * range - auto set
    * Recomendations
    * array of objects with MeterID: {active, latitude, longitude, mostRecentEvent, timeStamp} same format as MeteredParkingSpots.
  
* #####CrimeIncident
  * Firebase unique identifier
    * dateOccurred 
    * latitude - from Google Maps API
    * logitude - from Google Maps API
    * UCR - Uniform Crime Rating (police crime code for each type of crime)

###Application Flow

![alt text](https://github.com/rodocite/splendid-simi/blob/dev/applicationflow.jpg)

