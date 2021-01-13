export {default, defaultIcon, createGoogleMap} from './marker-clusterer.js';

let geocoder = null;
export function geocodeAddress(address, callback) {
	if (!address) {
		callback(null);
		return;
	}
	if (!geocoder) {
		geocoder = new google.maps.Geocoder();
	}
	if (typeof address === 'string') {
		address = address.trim();
	} else if (typeof address === 'object') {
		if (Array.isArray(address)) {
			let compiledAddressParts = [];
			for (let i = 0; i < address.length; i++) {
				let part = address[i].trim();
				if (part) {
					compiledAddressParts.push(part);
				}
			}
			address = compiledAddressParts.join(', ');
		} else {
			let p = 0;
			let street = (address.street || '').trim();
			let city = (address.city || '').trim();
			let province = (address.province || address.state || '').trim();
			let country = (address.country || '').trim();
			let postcode = (address.postcode || address.zipcode || '').trim();
			address = (street ? (p++, street) : '') +
				(city ? ((p ? ', ' : '') + (p++, city)) : '') +
				(province ? ((p ? ', ' : '') + (p++, province)) : '') +
				(country ? ((p ? ', ' : '') + (p++, country)) : '') +
				(postcode ? ((p ? ', ' : '') + postcode) : '');
		}
	}
	if (!address) {
		callback(null);
		return;
	}
	geocoder.geocode({address: address}, function(results, status) {
		if (status == 'OK') {
			// geometry.location is an instance of google.maps.LatLng
			callback(results[0].geometry.location);
		} else {
			callback(false);
		}
	});
}
