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

## Constructor

```js
var app = new MarkerClusterer.default(map, data, config);
```

| Prop | Description |
| --- | --- |
| `map` | Document element or instance of `google.maps.Map`. The map instance is accessible via `markerClusterer.map`. |
| `data` | Array of `{id: <int \| string>, latlng: <[<lat>, <lng>] \| {lat: <lat>, lng: <lng>} \| google.maps.LatLng>}` objects. These objects will be passed to the handler you specify in the config when their respective markers are clicked. |
| `config` | Optional configuration. See below for options and defaults. |

### Config object

| Prop | Description |
| --- | --- |
| `clusterRadius` | Pixel radius of cluster bounds on map (default 150). A single cluster may encompass points within this radius on the rendered map. |
| `onMarkerClick` | Handler called when a marker is clicked; passed the original data element associated with the marker; may return text content or a DOM node to display in a popover. |
| `clusterIcons` | Array of `{min: <int>, icon: <url \| google.maps.Icon \| google.maps.Symbol>}` (optionally also specifying `color`, `fontSize`, and `fontWeight`, like `google.maps.MarkerLabel`) specifying cluster icons to render according to cluster size, where min is the minimum cluster size at which the icon applies; ordered from least to greatest minimum cluster size. Alternately, a function may be provided, accepting a cluster size, and returning the config for the associated cluster icon and label. If `config.clusterIcons` is not passed in, default cluster icons will be rendered. |
| `enableDebug` | Enable debug output covering the initialization and rendering cycle (default `false`). |

## Static methods

```js
MarkerClusterer.createGoogleMap(mapEl, fullscreenControl = false)
```

Creates an instance of `google.maps.Map` using `mapEl` for the container. `fullscreenControl` says whether to show a fullscreen option on the map.

```js
MarkerClusterer.defaultIcon(color, strokeWeight, scale)
```

Returns a circular icon to use in cluster icon config. `color` should not have transparency, which is added by default. `strokeWeight` controls the circle's border line thickness. `scale` scales the size of the circle.

```js
MarkerClusterer.geocodeAddress(address, callback)
```

Initiates a lookup request to the Google Maps Geocoding API using the given address. `callback` is a function that will receive `null` when the address is empty, `false` when lookup fails, or an instance of `google.maps.LatLng`. `address` may also be an array of address parts to be joined with commas, or an object containing any subset of `street`, `city`, `province` or `state`, `country`, `postcode` or `zipcode`, sent to Google in that order.

## Instance methods

| Method | Description |
| --- | --- |
| `app.setData(data)` | Replaces the mapped locations. |
| `app.addData(data)` | Adds locations to the map. Do not duplicate IDs already on the map. |
| `app.clearData()` | Removes all locations from the map. |
| `app.closeInfoWindow()` | Closes the marker popover if one is open. |
| `app.setCenter(latlng)` | Centers the map on the given location. |
| `app.calcBounds(data)` | Returns a bounding box that contains all the given data. |
| `app.zoomToBounds(bounds)` | Pans and zooms to the given bounds. |
| `app.zoomToPosition(latlng, callback)` | Pans and zooms to the given location. `callback` is called after markers at the new location are rendered. |

## Testing

Build, start server, and access
[http://localhost:8080/demo.html](http://localhost:8080/demo.html)

```bash
npm run prod
python -m http.server 8080
```
