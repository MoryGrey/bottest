(function(){
	const tg = window.Telegram?.WebApp;
	if (tg) {
		tg.expand();
		tg.enableClosingConfirmation();
	}

	const map = L.map('map', { zoomControl: true });
	const HENICHESK = [46.1693, 34.8085];
	map.setView(HENICHESK, 14);
	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; OpenStreetMap'
	}).addTo(map);

	let activeField = 'from';
	const fromInput = document.getElementById('from-input');
	const toInput = document.getElementById('to-input');
	const tariffSelect = document.getElementById('tariff');
	const paymentSelect = document.getElementById('payment');

	fromInput.addEventListener('focus', () => activeField = 'from');
	toInput.addEventListener('focus', () => activeField = 'to');

	let fromMarker = null;
	let toMarker = null;

	function putMarker(latlng, type){
		if (type === 'from') {
			if (fromMarker) map.removeLayer(fromMarker);
			fromMarker = L.marker(latlng, {draggable:false}).addTo(map).bindPopup('Откуда');
			fromInput.value = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
		} else {
			if (toMarker) map.removeLayer(toMarker);
			toMarker = L.marker(latlng, {draggable:false}).addTo(map).bindPopup('Куда');
			toInput.value = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
		}
	}

	map.on('click', (e) => putMarker(e.latlng, activeField));

	document.getElementById('order-form').addEventListener('submit', (e) => {
		e.preventDefault();
		const payload = {
			from: fromInput.value.trim(),
			to: toInput.value.trim(),
			tariff: tariffSelect.value,
			payment: paymentSelect.value,
			ts: Date.now()
		};
		if (tg?.sendData) {
			tg.sendData(JSON.stringify(payload));
			if (tg?.close) tg.close();
		} else {
			alert('WebApp не инициализирован. Откройте через Telegram.');
		}
	});
})();
