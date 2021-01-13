# @macu/google-map-marker-clusterer-js

Display and cluster markers on a map.
Inspired by [Marker Clusterer Plus](https://github.com/mikesaidani/marker-clusterer-plus).

You will need Google Maps API access through [Google Cloud](https://cloud.google.com/).

Note: Clusters are recalculated at each zoom level, so they can appear to jump around.

## Usage

[See demo](https://macu.github.io/google-map-marker-clusterer-js/demo.html)

(Example uses jQuery)

```html
<script defer src="https://maps.googleapis.com/maps/api/js?key=YOUR_KEY&callback=initMap"></script>
<script src="/build/index.js"></script>

<div id="map" style="height:400px;"></div>
<button id="addMarker">Add marker at address</button>

<script>
var app;

function initMap() {
	var demoData = [];

	// Random locations across HRM (initial display)
	var minLat = 44.6148756441958;
	var minLng = -63.72629600600812;
	var maxLat = 44.74121085567042;
	var maxLng = -63.407799778743716;
	for (var i = 0; i < 100; i++) {
		demoData.push({
			id: 'r' + nextMarkerIndex++,
			label: 'Random ' + nextMarkerIndex,
			latlng: [
				minLat + ((maxLat - minLat) * Math.random()),
				minLng + ((maxLng - minLng) * Math.random())
			],
		});
	}

	app = new MarkerClusterer.default(document.getElementById('map'), demoData, {
		onMarkerClick: function(data) {
			// Return content for popup
			return $('<span/>').text(data.label).get(0);
		},
		clusterIcons: [
			// See icons for example at https://github.com/mikesaidani/marker-clusterer-plus
			{min: 0, icon: {url: '/images/m1.png', anchor: new google.maps.Point(26, 26)}},
			{min: 10, icon: {url: '/images/m2.png', anchor: new google.maps.Point(28, 28)}},
			{min: 20, icon: {url: '/images/m3.png', anchor: new google.maps.Point(33, 33)}},
			{min: 30, icon: {url: '/images/m4.png', anchor: new google.maps.Point(39, 39)}},
			{min: 40, icon: {url: '/images/m5.png', anchor: new google.maps.Point(45, 45)}},
		],
		enableDebug: true,
	});
}

$('#addMarker').on('click', function() {
	var address = window.prompt('Enter full address:');

	if (address && address.trim()) {
		MarkerClusterer.geocodeAddress(address, function(latlng) {
			if (latlng) {
				app.addData({
					id: 'a' + Date.now(),
					label: address.trim(),
					latlng: latlng,
				});
				app.setCenter(latlng);
			} else {
				window.alert('Geocoding failed');
			}
		});
	}
});
</script>
```

## Testing

Build, start server, and access
[http://localhost:8080/demo.html](http://localhost:8080/demo.html)

```bash
npm run prod
python -m http.server 8080
```
