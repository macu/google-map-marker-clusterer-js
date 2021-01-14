export default class MarkerClusterer {

	/**
	 * Inspired by Marker Clusterer Plus
	 * https://github.com/mikesaidani/marker-clusterer-plus
	 *
	 * @param map a container DOM element, or an instance of google.maps.Map
	 * @param data array of objects with id and latlng properties
	 * @param config config values (see code for defaults)
	 */
	constructor(map, data, config = null) {
		config = config || {};
		this.config = {

			// pixel radius of cluster bounds on map
			clusterRadius: 150,

			// called when a marker is clicked;
			// passed the original data element associated with the marker;
			// may return text content or a DOM node to display in popover
			onMarkerClick: config.onMarkerClick || null,

			// array of {min: <int>, icon: <url | google.maps.Icon | google.maps.Symbol>}
			// (optionally also specifying color, fontSize, and fontWeight, like google.maps.MarkerLabel)
			// specifying cluster icons to render according to cluster size,
			// where min is the minimum cluster size at which the icon applies;
			// ordered from least to greatest minimum cluster size.
			// alternately, a function may be provided, accepting a cluster size,
			// and returning the config for the associated cluster icon and label.
			// if config.clusterIcons is not passed in, default cluster icons will be rendered.
			clusterIcons: config.clusterIcons || (clusterSize => {
				let scale = Math.round(clusterSize / 10);
				switch (scale) {
					case 0: return {icon: defaultIcon('rgb(0, 204, 255)', 3, 20)};
					case 1: return {icon: defaultIcon('rgb(85, 255, 0)', 3.25, 24)};
					case 2: return {icon: defaultIcon('rgb(255, 217, 0)', 3.5, 28)};
					case 3: return {icon: defaultIcon('rgb(255, 0, 174)', 3.75, 32)};
					default: return {icon: defaultIcon('rgb(170, 0, 255)', 4, 37)};
				}
			}),

			// enable debug output covering the initiation and rendering cycle
			enableDebug: config.enableDebug || false,

		};

		this.debug('built for Google Maps API v3');

		if (map instanceof google.maps.Map) {
			this.map = map;
		} else {
			this.map = createGoogleMap(map);
		}

		this.data = [];
		this.clusters = [];
		this.clustersById = {};
		this.markersById = {};
		this.visibleInfoWindow = null;

		this.maxZoomService = new google.maps.MaxZoomService();
	 	this.zoomInFromZoom = null;

		function init() {
			this.debug('initializing');

			this.setData(data);

			this.map.addListener('zoom_changed', (function() {
				this.debug('zoom_changed', this.map.getZoom());

				if (this.zoomInFromZoom !== null && this.zoomInFromZoom >= this.map.getZoom()) {
					// Zoom didn't occur when cluster was clicked; try to force a zoom
					this.map.setZoom(this.zoomInFromZoom + 1);
					this.zoomInFromZoom = null;
					// Wait for next invocation of zoom_changed
					return;
				}
				this.zoomInFromZoom = null;

				// Markers will be rendered in idle event following zoom.
				// awaitingIdle suspends rendering markers following calls to calculateClusters.
				this.awaitingIdle = true;

				// Clusters need to be recalculated at each zoom
				this.calculateClusters();

			}).bind(this));

			// Idle follows pan, zoom, and other events marking changes to the underlying map.
			this.map.addListener('idle', (function() {
				this.debug('idle');

				// Resume rendering markers after calls to calculateClusters
				this.awaitingIdle = false;

				this.renderMarkers();

			}).bind(this));

			this.map.addListener('click', (function() {
				this.closeInfoWindow();
			}).bind(this));
		}

		if (this.map.getBounds() && this.map.getCenter()) {
			this.debug('map ready');
			init.apply(this);
		} else {
			this.debug('waiting for map');
			var initialIdleListener = this.map.addListener('idle', (function() {
				this.debug('idle');
				init.apply(this);
				initialIdleListener.remove();
			}).bind(this));
		}
	}

	setData(data) {
		this.debug('setData');

		this.data = data || [];

		if (this.data.length) {
			this.zoomToBounds(this.calcBounds(this.data));
			if (this.map.getZoom() > 16) {
				// Zoom out to neighbourhood
				this.map.setZoom(16);
			}
		} else if (!this.map.getBounds()) {
			// Focus on North America when there is no data
			this.zoomToBounds(new google.maps.LatLngBounds(
				{lat: 41.40329390690307, lng: -132.41174280543527},
				{lat: 65.0273544712607, lng: -50.87670862574777}
			));
		}

		this.calculateClusters();
	}

	// TODO Replace existing data on duplicate ID
	addData(data) {
		this.debug('addData');

		if (Array.isArray(data)) {
			this.data = this.data.concat(data);
		} else {
			this.data.push(data);
		}
		this.calculateClusters();
	}

	clearData() {
		this.debug('clearData');

		this.data = [];

		this.calculateClusters();
	}

	calculateClusters() {
		this.debug('calculateClusters');

		// Determine whether zoom is at max for current map center
		this.maxZoomService.getMaxZoomAtLatLng(this.map.getCenter(), (function(result) {

			var allowClustering = false;
			if (result.status === 'OK') {
				// only show clusters if greater zoom is available
				allowClustering = result.zoom > this.map.getZoom();
			}

			this.clusters = [];

			if (allowClustering) {

				createClusters:
				for (var i = 0; i < this.data.length; i++) {
					var e = this.data[i], latlng = makeLatlng(e.latlng);

					for (var j = 0; j < this.clusters.length; j++) {
						var cluster = this.clusters[j];

						if (this.testPointWithinClusterRadius(cluster.center, latlng)) {
							cluster.data.push(e);

							// Update cluster center to be average center
							var len = cluster.data.length;
							var lat = (cluster.center.lat() * (len - 1) + latlng.lat()) / len;
							var lng = (cluster.center.lng() * (len - 1) + latlng.lng()) / len;
							cluster.center = new google.maps.LatLng(lat, lng);

							continue createClusters;
						}
					}

					// No suitable cluster; add to new cluster
					this.clusters.push({
						center: latlng,
						data: [e],
					});
				}

			} else {
				// No clustering at max zoom level

				for (var i = 0; i < this.data.length; i++) {
					var e = this.data[i];

					this.clusters.push({
						center: makeLatlng(e.latlng),
						data: [e],
					});
				}

			}

			// Calculate cluster IDs and update clustersById
			var newClustersById = {};
			for (var i = 0; i < this.clusters.length; i++) {
				var cluster = this.clusters[i];

				if (cluster.data.length > 1) {
					var dataIds = [];
					for (var j = 0; j < cluster.data.length; j++) {
						dataIds.push(cluster.data[j].id);
					}
					cluster.id = 'cluster-' + hashString(dataIds.sort().join('-'));
				} else {
					cluster.id = cluster.data[0].id;
				}

				var existing = this.clustersById[cluster.id];
				if (existing) {
					cluster.marker = existing.marker;
				}

				newClustersById[cluster.id] = cluster;
			}
			this.clustersById = newClustersById;

			if (this.awaitingIdle) {
				// Don't render markers while awaiting an idle event following a zoom event
			} else {
				this.renderMarkers();
			}

		}).bind(this));
	}

	renderMarkers() {
		this.debug('renderMarkers');

		var mapBounds = this.map.getBounds();

		// Create markers (only create new ones)
		for (var i = 0; i < this.clusters.length; i++) {
			var cluster = this.clusters[i];

			if (cluster.marker) {
				// Marker already present on map
				continue;
			}

			if (mapBounds.contains(cluster.center)) {
				// Render markers within a margin of the viewport

				if (cluster.data.length > 1) {
					// Add cluster marker

					let iconConfig;

					if (Array.isArray(this.config.clusterIcons)) {
						for (var j = this.config.clusterIcons.length - 1; j >= 0; j--) {
							if (this.config.clusterIcons[j].min <= cluster.data.length) {
								iconConfig = this.config.clusterIcons[j];
								break;
							}
						}
					} else if (typeof this.config.clusterIcons === 'function') {
						iconConfig = this.config.clusterIcons(cluster.data.length);
					} else {
						throw 'Unsupported clusterIcons config';
					}

					if (!iconConfig) {
						throw 'No icon config for cluster size ' + cluster.data.length;
					}

					cluster.marker = new google.maps.Marker({
						id: cluster.id,
						position: cluster.center,
						icon: iconConfig.icon,
						label: {
							text: '' + cluster.data.length,
							color: iconConfig.color,
							fontSize: iconConfig.fontSize,
							fontWeight: iconConfig.fontWeight,
						},
						map: this.map,
					});

					cluster.marker.addListener('click', (function(clusterId) {
						this.zoomInFromZoom = this.map.getZoom();
						this.zoomToBounds(this.calcBounds(this.clustersById[clusterId].data));
					}).bind(this, cluster.id));

				} else {
					// Add standalone coach marker

					cluster.marker = new google.maps.Marker({
						id: cluster.id,
						position: cluster.center,
						map: this.map,
					});

					cluster.marker.addListener('click',
						this.clickMarker.bind(this, cluster.marker, cluster.data[0]));

				}

				this.debug('marker added');
				this.markersById[cluster.id] = cluster.marker;

			}
		}

		// Remove markers no longer represented at current zoom level
		for (var id in this.markersById) {
			if (!this.clustersById[id]) {
				this.markersById[id].setMap(null);
				delete(this.markersById[id]);
				this.debug('marker cleared');
			}
		}

		if (this.afterNextRenderCallback) {
			this.afterNextRenderCallback();
			this.afterNextRenderCallback = null;
		}

	}

	clickMarker(marker, e) {
		if (this.visibleInfoWindow) {
			this.visibleInfoWindow.close();
		}

		if (this.config.onMarkerClick) {
			// Call click handler and render info window

			var infoWindowContent = this.config.onMarkerClick(e);

			if (infoWindowContent) {
				this.visibleInfoWindow = new google.maps.InfoWindow({
					content: infoWindowContent,
				});

				this.visibleInfoWindow.addListener('closeclick', function() {
					this.visibleInfoWindow = null;
				});

				this.visibleInfoWindow.open(this.map, marker);
			}
		}
	}

	closeInfoWindow() {
		if (this.visibleInfoWindow) {
			this.visibleInfoWindow.close();
			this.visibleInfoWindow = null;
		}
	}

	/* Test whether the given point is within a pixel distance of the given cluster center
	 * at the current zoom.
	 */
	testPointWithinClusterRadius(clusterCenter, point) {
		var projection = this.map.getProjection();

		var p1 = projection.fromLatLngToPoint(clusterCenter);
		var p2 = projection.fromLatLngToPoint(point);

		var pixelSize = Math.pow(2, -this.map.getZoom());

		var d = Math.sqrt((p1.x-p2.x)*(p1.x-p2.x) + (p1.y-p2.y)*(p1.y-p2.y))/pixelSize;

		return d < this.config.clusterRadius; // max pixel cluster radius
	}

	setCenter(latlng) {
		this.map.setCenter(makeLatlng(latlng));
	}

	calcBounds(data) {
		var bounds = new google.maps.LatLngBounds();
		for (var i = 0; i < data.length; i++) {
			bounds.extend(makeLatlng(data[i].latlng));
		}
		return bounds;
	}

	zoomToBounds(bounds) {
		this.map.fitBounds(bounds);
		this.map.panToBounds(bounds);
	}

	zoomToPosition(latlng, afterNextRenderCallback) {
		if (this.map.getZoom() < 16) {
			// Zoom in to neighbourhood
			this.map.setZoom(16);
		}
		this.map.setCenter(makeLatlng(latlng));
		this.afterNextRenderCallback = afterNextRenderCallback;
	}

	debug() {
		if (this.config.enableDebug) {
			var args = ['MarkerClusterer'].concat(Array.prototype.slice.call(arguments));
			console.debug.apply(null, args);
		}
	}

}

// Returns a circular marker icon with the given properties
export function defaultIcon(color, strokeWeight, scale) {
	return {
		path: google.maps.SymbolPath.CIRCLE,
		fillColor: color,
		fillOpacity: 0.75,
		strokeColor: color,
		strokeWeight,
		scale,
	};
}

// Creates a new instance of google.maps.Map given a container element
export function createGoogleMap(mapEl, fullscreenControl = false) {
	return new google.maps.Map(mapEl, {
		fullscreenControl,
		streetViewControlOptions: {
			position: google.maps.ControlPosition.TOP_RIGHT,
		},
		mapTypeControlOptions: {
			style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
		},
	});
}

// Returns an instance of google.maps.LatLng
function makeLatlng(v) {
	if (v instanceof google.maps.LatLng) {
		return v;
	} else if (Array.isArray(v) && v.length === 2) {
		return new google.maps.LatLng(v[0], v[1]);
	} else if (typeof v === 'object') {
		return new google.maps.LatLng(v.lat, v.lng);
	} else {
		throw 'Unsupported latlng value';
	}
}

// Simple string hash for cluster IDs
function hashString(string) {
	var hash = 0, i, chr;
	for (i = 0; i < string.length; i++) {
		chr   = string.charCodeAt(i);
		hash  = ((hash << 5) - hash) + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
}
