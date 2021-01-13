(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["MarkerClusterer"] = factory();
	else
		root["MarkerClusterer"] = factory();
})(self, function() {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 519:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "createGoogleMap": () => /* reexport */ createGoogleMap,
  "default": () => /* reexport */ MarkerClusterer,
  "defaultIcon": () => /* reexport */ defaultIcon,
  "geocodeAddress": () => /* binding */ geocodeAddress
});

;// CONCATENATED MODULE: ./marker-clusterer.js
function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var MarkerClusterer = /*#__PURE__*/function () {
  /**
   * Inspired by Marker Clusterer Plus
   * https://github.com/mikesaidani/marker-clusterer-plus
   *
   * @param map a container DOM element, or an instance of google.maps.Map
   * @param data array of objects with id and latlng properties
   * @param config config values (see code for defaults)
   */
  function MarkerClusterer(map, data) {
    var config = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    _classCallCheck(this, MarkerClusterer);

    config = config || {};
    this.config = {
      // pixel radius of cluster bounds on map
      clusterRadius: 150,
      // called when a marker is clicked;
      // passed the original data element associated with the marker;
      // may return text content or a DOM node to display
      onMarkerClick: config.onMarkerClick || null,
      // array of {min: <int>, icon: <string|google.maps.Icon|google.maps.Symbol>}
      // (optionally also specifying color, fontSize, and fontWeight, like google.maps.MarkerLabel)
      // values specifying cluster icons to render according to cluster size,
      // where min is the minimum cluster size at which the icon applies;
      // ordered from least to greatest minimum cluster size.
      // alternately, a function may be provided, accepting a cluster size,
      // and returning the config for the associated cluster icon and label.
      // if no array is given, default cluster icons will be rendered.
      clusterIcons: config.clusterIcons || function (clusterSize) {
        var scale = Math.round(clusterSize / 10);

        switch (scale) {
          case 0:
            return {
              icon: defaultIcon('rgb(0, 204, 255)', 3, 20)
            };

          case 1:
            return {
              icon: defaultIcon('rgb(85, 255, 0)', 3.25, 24)
            };

          case 2:
            return {
              icon: defaultIcon('rgb(255, 217, 0)', 3.5, 28)
            };

          case 3:
            return {
              icon: defaultIcon('rgb(255, 0, 174)', 3.75, 32)
            };

          default:
            return {
              icon: defaultIcon('rgb(170, 0, 255)', 4, 37)
            };
        }
      },
      // enable debug output
      enableDebug: config.enableDebug || false
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
      this.setData(data); // Zoom event occurrs followed by idle event;
      // skip re-rendering markers on idle following zoom,
      // as zoom calls calculateClusters which itself calls renderMarkers.

      var renderOnIdle = true;
      this.map.addListener('zoom_changed', function () {
        this.debug('zoom_changed', this.map.getZoom());

        if (this.zoomInFromZoom !== null && this.zoomInFromZoom >= this.map.getZoom()) {
          // Zoom didn't occur when cluster was clicked; try to force a zoom
          this.map.setZoom(this.zoomInFromZoom + 1);
          this.zoomInFromZoom = null;
          return;
        }

        this.zoomInFromZoom = null; // Rendering will be called when calculating clusters is finished.

        renderOnIdle = false;
        this.calculateClusters();
      }.bind(this));
      this.map.addListener('idle', function () {
        this.debug('idle');

        if (renderOnIdle) {
          this.renderMarkers();
        } // Always render on the next idle in case of bounds changes without zoom.


        renderOnIdle = true;
      }.bind(this));
      this.map.addListener('click', function () {
        this.closeInfoWindow();
      }.bind(this));
    }

    if (this.map.getBounds() && this.map.getCenter()) {
      this.debug('map ready');
      init.apply(this);
    } else {
      this.debug('waiting for map');
      var initialIdleListener = this.map.addListener('idle', function () {
        this.debug('idle');
        init.apply(this);
        initialIdleListener.remove();
      }.bind(this));
    }
  }

  _createClass(MarkerClusterer, [{
    key: "setData",
    value: function setData(data) {
      this.data = data || [];

      if (this.data.length) {
        this.zoomToBounds(this.calcBounds(this.data));

        if (this.map.getZoom() > 16) {
          // Zoom out to neighbourhood
          this.map.setZoom(16);
        }
      } else {
        // Focus on North America when there is no data
        this.zoomToBounds(new google.maps.LatLngBounds({
          lat: 41.40329390690307,
          lng: -132.41174280543527
        }, {
          lat: 65.0273544712607,
          lng: -50.87670862574777
        }));
      }

      this.calculateClusters();
    } // TODO This would not be safe if adding data already present on the map

  }, {
    key: "addData",
    value: function addData(data) {
      if (Array.isArray(data)) {
        this.data = this.data.concat(data);
      } else {
        this.data.push(data);
      }

      this.calculateClusters();
    }
  }, {
    key: "clearData",
    value: function clearData() {
      this.data = [];
      this.calculateClusters();
    }
  }, {
    key: "calculateClusters",
    value: function calculateClusters() {
      this.debug('calculateClusters'); // Determine whether zoom is at max for current map center

      this.maxZoomService.getMaxZoomAtLatLng(this.map.getCenter(), function (result) {
        var allowClustering;

        if (result.status !== "OK") {
          // error
          allowClustering = false;
        } else {
          // only show clusters if greater zoom is available
          allowClustering = result.zoom > this.map.getZoom();
        }

        this.clusters = [];

        if (allowClustering) {
          createClusters: for (var i = 0; i < this.data.length; i++) {
            var e = this.data[i],
                latlng = makeLatlng(e.latlng);

            for (var j = 0; j < this.clusters.length; j++) {
              var cluster = this.clusters[j];

              if (this.testPointWithinClusterRadius(cluster.center, latlng)) {
                cluster.data.push(e); // Update cluster center to be average center

                var len = cluster.data.length;
                var lat = (cluster.center.lat() * (len - 1) + latlng.lat()) / len;
                var lng = (cluster.center.lng() * (len - 1) + latlng.lng()) / len;
                cluster.center = new google.maps.LatLng(lat, lng);
                continue createClusters;
              }
            } // No suitable cluster; add to new cluster


            this.clusters.push({
              center: latlng,
              data: [e]
            });
          }
        } else {
          // No clustering at max zoom level
          for (var i = 0; i < this.data.length; i++) {
            var e = this.data[i];
            this.clusters.push({
              center: makeLatlng(e.latlng),
              data: [e]
            });
          }
        } // Calculate cluster IDs and update clustersById


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

        this.clustersById = newClustersById; // Always render markers immediately after recalculating clusters.

        this.renderMarkers();
      }.bind(this));
    }
  }, {
    key: "renderMarkers",
    value: function renderMarkers() {
      this.debug('renderMarkers');
      var mapBounds = this.map.getBounds(); // Create markers (only create new ones)

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
            var iconConfig = void 0;

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
                fontWeight: iconConfig.fontWeight
              },
              map: this.map
            });
            cluster.marker.addListener('click', function (clusterId) {
              this.zoomInFromZoom = this.map.getZoom();
              this.zoomToBounds(this.calcBounds(this.clustersById[clusterId].data));
            }.bind(this, cluster.id));
          } else {
            // Add standalone coach marker
            cluster.marker = new google.maps.Marker({
              id: cluster.id,
              position: cluster.center,
              map: this.map
            });
            cluster.marker.addListener('click', this.clickMarker.bind(this, cluster.marker, cluster.data[0]));
          }

          this.debug('marker added');
          this.markersById[cluster.id] = cluster.marker;
        }
      } // Remove markers no longer represented at current zoom level


      for (var id in this.markersById) {
        if (!this.clustersById[id]) {
          this.markersById[id].setMap(null);
          delete this.markersById[id];
          this.debug('marker cleared');
        }
      }

      if (this.afterNextRenderCallback) {
        this.afterNextRenderCallback();
        this.afterNextRenderCallback = null;
      }
    }
  }, {
    key: "clickMarker",
    value: function clickMarker(marker, e) {
      if (this.visibleInfoWindow) {
        this.visibleInfoWindow.close();
      }

      if (this.config.onMarkerClick) {
        var infoWindowContent = this.config.onMarkerClick(e);

        if (infoWindowContent) {
          this.visibleInfoWindow = new google.maps.InfoWindow({
            content: infoWindowContent
          });
          this.visibleInfoWindow.addListener('closeclick', function () {
            this.visibleInfoWindow = null;
          });
          this.visibleInfoWindow.open(this.map, marker);
        }
      }
    }
  }, {
    key: "closeInfoWindow",
    value: function closeInfoWindow() {
      if (this.visibleInfoWindow) {
        this.visibleInfoWindow.close();
        this.visibleInfoWindow = null;
      }
    }
    /* Test whether the given point is within a pixel distance of the given cluster center
     * at the current zoom.
     */

  }, {
    key: "testPointWithinClusterRadius",
    value: function testPointWithinClusterRadius(clusterCenter, point) {
      var projection = this.map.getProjection();
      var p1 = projection.fromLatLngToPoint(clusterCenter);
      var p2 = projection.fromLatLngToPoint(point);
      var pixelSize = Math.pow(2, -this.map.getZoom());
      var d = Math.sqrt((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y)) / pixelSize;
      return d < this.config.clusterRadius; // max pixel cluster radius
    }
  }, {
    key: "calcBounds",
    value: function calcBounds(data) {
      var bounds = new google.maps.LatLngBounds();

      for (var i = 0; i < data.length; i++) {
        bounds.extend(makeLatlng(data[i].latlng));
      }

      return bounds;
    }
  }, {
    key: "setCenter",
    value: function setCenter(latlng) {
      this.map.setCenter(makeLatlng(latlng));
    }
  }, {
    key: "zoomToBounds",
    value: function zoomToBounds(bounds) {
      this.map.fitBounds(bounds);
      this.map.panToBounds(bounds);
    }
  }, {
    key: "zoomToPosition",
    value: function zoomToPosition(latlng, afterNextRenderCallback) {
      if (this.map.getZoom() < 16) {
        // Zoom in to neighbourhood
        this.map.setZoom(16);
      }

      this.map.setCenter(makeLatlng(latlng));
      this.afterNextRenderCallback = afterNextRenderCallback;
    }
  }, {
    key: "debug",
    value: function debug() {
      if (this.config.enableDebug) {
        var args = ['MarkerClusterer'].concat(Array.prototype.slice.call(arguments));
        console.debug.apply(null, args);
      }
    }
  }]);

  return MarkerClusterer;
}(); // Returns a circular marker icon with the given properties



function defaultIcon(color, strokeWeight, scale) {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 0.75,
    strokeColor: color,
    strokeWeight: strokeWeight,
    scale: scale
  };
} // Creates a new instance of google.maps.Map given a container element

function createGoogleMap(mapEl) {
  var fullscreenControl = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  return new google.maps.Map(mapEl, {
    fullscreenControl: fullscreenControl,
    streetViewControlOptions: {
      position: google.maps.ControlPosition.TOP_RIGHT
    },
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
    }
  });
} // Returns an instance of google.maps.LatLng

function makeLatlng(v) {
  if (v instanceof google.maps.LatLng) {
    return v;
  } else if (Array.isArray(v) && v.length === 2) {
    return new google.maps.LatLng(v[0], v[1]);
  } else if (_typeof(v) === 'object') {
    return new google.maps.LatLng(v.lat, v.lng);
  } else {
    throw 'Unsupported latlng value';
  }
} // Simple string hash for cluster IDs


function hashString(string) {
  var hash = 0,
      i,
      chr;

  for (i = 0; i < string.length; i++) {
    chr = string.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }

  return hash;
}
;// CONCATENATED MODULE: ./index.js
function index_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { index_typeof = function _typeof(obj) { return typeof obj; }; } else { index_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return index_typeof(obj); }


var geocoder = null;
function geocodeAddress(address, callback) {
  if (!address) {
    callback(null);
    return;
  }

  if (!geocoder) {
    geocoder = new google.maps.Geocoder();
  }

  if (typeof address === 'string') {
    address = address.trim();
  } else if (index_typeof(address) === 'object') {
    if (Array.isArray(address)) {
      var compiledAddressParts = [];

      for (var i = 0; i < address.length; i++) {
        var part = address[i].trim();

        if (part) {
          compiledAddressParts.push(part);
        }
      }

      address = compiledAddressParts.join(', ');
    } else {
      var p = 0;
      var street = (address.street || '').trim();
      var city = (address.city || '').trim();
      var province = (address.province || address.state || '').trim();
      var country = (address.country || '').trim();
      var postcode = (address.postcode || address.zipcode || '').trim();
      address = (street ? (p++, street) : '') + (city ? (p ? ', ' : '') + (p++, city) : '') + (province ? (p ? ', ' : '') + (p++, province) : '') + (country ? (p ? ', ' : '') + (p++, country) : '') + (postcode ? (p ? ', ' : '') + postcode : '');
    }
  }

  if (!address) {
    callback(null);
    return;
  }

  geocoder.geocode({
    address: address
  }, function (results, status) {
    if (status == 'OK') {
      // geometry.location is an instance of google.maps.LatLng
      callback(results[0].geometry.location);
    } else {
      callback(false);
    }
  });
}

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	// module exports must be returned from runtime so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(519);
/******/ })()
;
});