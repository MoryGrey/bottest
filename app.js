(function(){
	const tg = window.Telegram?.WebApp;
	if (tg) {
		tg.expand();
		tg.enableClosingConfirmation();
	}

	const qs = new URLSearchParams(location.search);
	const userPrefill = {
		userId: qs.get('u') || '',
		name: qs.get('name') || '',
		phone: qs.get('phone') || '',
		status: qs.get('status') || 'Клиент',
	};

	// Tabs
	const tabs = {
		order: document.getElementById('tab-order'),
		profile: document.getElementById('tab-profile'),
		history: document.getElementById('tab-history'),
	};
	const navButtons = Array.from(document.querySelectorAll('.nav-btn'));
	navButtons.forEach(btn => btn.addEventListener('click', () => {
		navButtons.forEach(b => b.classList.remove('active'));
		btn.classList.add('active');
		const tab = btn.dataset.tab;
		Object.values(tabs).forEach(s => s.classList.remove('active'));
		tabs[tab].classList.add('active');
	}));

	// Profile prefill
	document.getElementById('name').value = userPrefill.name;
	document.getElementById('phone').value = userPrefill.phone;
	document.getElementById('status').textContent = userPrefill.status || 'Клиент';
	document.getElementById('free-info').textContent = 'До бесплатной: — | Бесплатных: 0';

	// Map and order form
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

	// Order submit
	document.getElementById('order-form').addEventListener('submit', (e) => {
		e.preventDefault();
		const payload = {
			type: 'order',
			from: fromInput.value.trim(),
			to: toInput.value.trim(),
			tariff: tariffSelect.value,
			payment: paymentSelect.value,
			ts: Date.now()
		};
		if (tg?.sendData) {
			tg.sendData(JSON.stringify(payload));
			tg.showPopup?.({title: 'Заказ принят', message: 'Ожидайте, ваш заказ принят.', buttons:[{type:'ok'}]});
			if (tg?.close) tg.close();
		} else {
			alert('WebApp не инициализирован. Откройте через Telegram.');
		}
	});

	// Profile save
	document.getElementById('profile-form').addEventListener('submit', (e) => {
		e.preventDefault();
		const payload = {
			type: 'profile_update',
			name: document.getElementById('name').value.trim(),
			phone: document.getElementById('phone').value.trim(),
			ts: Date.now()
		};
		if (tg?.sendData) {
			tg.sendData(JSON.stringify(payload));
			tg.showToast?.('Профиль отправлен на обновление');
		} else {
			alert('WebApp не инициализирован. Откройте через Telegram.');
		}
	});

	document.getElementById('support').addEventListener('click', () => {
		if (tg?.showPopup) {
			tg.showPopup({title:'Техподдержка', message:'Напишите нам: @your_dispatch_contact', buttons:[{type:'ok'}]});
		}
	});

	// History segmented (UI only, can be extended to fetch via bot if needed)
	const segBtns = Array.from(document.querySelectorAll('.segmented button'));
	const listEl = document.getElementById('history-list');
	segBtns.forEach(b => b.addEventListener('click', () => {
		segBtns.forEach(x => x.classList.remove('active'));
		b.classList.add('active');
		// History rendering would require a backend or bot fetch; left as UI placeholder.
		listEl.innerHTML = '';
	}));
})();
