(function(){
	const tg = window.Telegram?.WebApp;
	if (tg) {
		tg.expand();
		tg.enableClosingConfirmation();
	}
	
	// Prevent zooming and scaling
	document.addEventListener('gesturestart', function (e) {
		e.preventDefault();
	});
	
	document.addEventListener('gesturechange', function (e) {
		e.preventDefault();
	});
	
	document.addEventListener('gestureend', function (e) {
		e.preventDefault();
	});
	
	// Prevent double-tap zoom
	let lastTouchEnd = 0;
	document.addEventListener('touchend', function (event) {
		const now = (new Date()).getTime();
		if (now - lastTouchEnd <= 300) {
			event.preventDefault();
		}
		lastTouchEnd = now;
	}, false);

	const qs = new URLSearchParams(location.search);
	const userPrefill = {
		userId: qs.get('u') || '',
		name: qs.get('name') || '',
		phone: qs.get('phone') || '',
		status: qs.get('status') || 'Клиент',
		totalCompleted: parseInt(qs.get('completed') || '0'),
		sinceFree: parseInt(qs.get('since_free') || '0'),
		ridesToFree: parseInt(qs.get('rides_to_free') || '10'),
		usedPromos: (qs.get('used_promos') || '').split(',').filter(p => p),
		economPrice: parseInt(qs.get('econom_price') || '150'),
		studentPrice: parseInt(qs.get('student_price') || '100'),
		kidsPrice: parseInt(qs.get('kids_price') || '200'),
		isNight: qs.get('is_night') === '1',
		isAdmin: qs.get('is_admin') === '1',
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
		
		// Обновляем данные при переключении
		if (tab === 'profile') {
			refreshProfile();
		} else if (tab === 'history') {
			refreshHistory();
		}
	}));
	
	// Set order tab as active by default
	navButtons[1].classList.add('active'); // Order button (index 1)
	tabs.order.classList.add('active');

	// Profile prefill and stats
	document.getElementById('name').value = userPrefill.name;
	document.getElementById('phone').value = userPrefill.phone;
	document.getElementById('status-badge').textContent = userPrefill.status || 'Клиент';
	
	// Calculate loyalty stats from real user data
	const freeRides = Math.floor(userPrefill.totalCompleted / 10);
	const ridesToFree = userPrefill.ridesToFree;
	const progressPercent = ((userPrefill.sinceFree % 10) / 10) * 100;
	
	document.getElementById('free-rides').textContent = freeRides;
	document.getElementById('rides-to-free').textContent = ridesToFree;
	document.getElementById('progress-fill').style.width = `${progressPercent}%`;

	// Order form - simplified without map
	let selectedTariff = 'econom';
	let selectedPayment = 'cash';
	let entranceNumber = null;
	let additionalStops = [];
	let appliedPromo = null;
	let promoDiscount = 0;
	
	// Актуальные тарифы с сервера
	const tariffPrices = { 
		econom: userPrefill.economPrice, 
		student: userPrefill.studentPrice, 
		kids: userPrefill.kidsPrice 
	};
	const tariffNames = { 
		econom: userPrefill.isNight ? 'Эконом (ночной)' : 'Эконом', 
		student: userPrefill.isNight ? 'Студент (ночной)' : 'Студент', 
		kids: userPrefill.isNight ? 'С детьми (ночной)' : 'С детьми' 
	};
	const paymentNames = { cash: 'Наличными', card: 'Перевод' };
	
	// Available promo codes
	const availablePromos = {
		'WELCOME50': { discount: 50, description: 'Добро пожаловать!' },
		'TAXI2024': { discount: 50, description: 'Новогодняя акция' },
		'STUDENT50': { discount: 50, description: 'Скидка для студентов' },
		'FIRST50': { discount: 50, description: 'Первый заказ' },
		'LOYAL50': { discount: 50, description: 'Для постоянных клиентов' }
	};

	const fromInput = document.getElementById('from-input');
	const toInput = document.getElementById('to-input');

	// Location button
	document.getElementById('location-btn').addEventListener('click', () => {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					const lat = position.coords.latitude;
					const lng = position.coords.longitude;
					
					// Reverse geocoding to get address
					fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`)
						.then(response => response.json())
						.then(data => {
							const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
							fromInput.value = address;
						})
						.catch(() => {
							fromInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
						});
				},
				() => {
					alert('Не удалось определить местоположение');
				}
			);
		} else {
			alert('Геолокация не поддерживается');
		}
	});

	// Entrance button - now updates the address field
	document.getElementById('entrance-btn').addEventListener('click', () => {
		const entrance = prompt('Введите номер подъезда:');
		if (entrance && entrance.trim()) {
			entranceNumber = entrance.trim();
			const currentAddress = fromInput.value;
			if (currentAddress) {
				fromInput.value = `${currentAddress}, подъезд ${entranceNumber}`;
			} else {
				fromInput.value = `Подъезд ${entranceNumber}`;
			}
			document.getElementById('entrance-number').textContent = entranceNumber;
			document.getElementById('entrance-row').style.display = 'flex';
			updateSummary();
		}
	});

	// Add stop button - now shows inline form
	document.getElementById('add-stop-btn').addEventListener('click', () => {
		const stopDiv = document.createElement('div');
		stopDiv.className = 'additional-stop';
		stopDiv.innerHTML = `
			<div class="stop-icon">📍</div>
			<input type="text" class="stop-input" placeholder="Введите адрес дополнительной остановки" />
			<button class="remove-stop" onclick="removeStop(${additionalStops.length})">×</button>
		`;
		
		const container = document.getElementById('additional-stops');
		container.appendChild(stopDiv);
		
		// Focus on the new input
		const newInput = stopDiv.querySelector('.stop-input');
		newInput.focus();
		
		// Add event listener for input
		newInput.addEventListener('blur', () => {
			if (newInput.value.trim()) {
				additionalStops.push(newInput.value.trim());
				updateSummary();
			}
		});
		
		newInput.addEventListener('keypress', (e) => {
			if (e.key === 'Enter' && newInput.value.trim()) {
				additionalStops.push(newInput.value.trim());
				updateSummary();
				newInput.blur();
			}
		});
	});

	window.removeStop = function(index) {
		// Remove from DOM
		const stops = document.querySelectorAll('.additional-stop');
		if (stops[index]) {
			stops[index].remove();
		}
		
		// Remove from array
		additionalStops.splice(index, 1);
		
		// Update all remove buttons with correct indices
		const remainingStops = document.querySelectorAll('.additional-stop');
		remainingStops.forEach((stop, newIndex) => {
			const removeBtn = stop.querySelector('.remove-stop');
			removeBtn.setAttribute('onclick', `removeStop(${newIndex})`);
		});
		
		updateSummary();
	};

	// Dropdown functionality
	const tariffBtn = document.getElementById('tariff-btn');
	const tariffMenu = document.getElementById('tariff-menu');
	const paymentBtn = document.getElementById('payment-btn');
	const paymentMenu = document.getElementById('payment-menu');

	// Tariff dropdown
	tariffBtn.addEventListener('click', () => {
		tariffMenu.style.display = tariffMenu.style.display === 'none' ? 'block' : 'none';
		tariffBtn.classList.toggle('active');
		paymentMenu.style.display = 'none';
		paymentBtn.classList.remove('active');
	});

	// Payment dropdown
	paymentBtn.addEventListener('click', () => {
		paymentMenu.style.display = paymentMenu.style.display === 'none' ? 'block' : 'none';
		paymentBtn.classList.toggle('active');
		tariffMenu.style.display = 'none';
		tariffBtn.classList.remove('active');
	});

	// Tariff selection
	document.querySelectorAll('[data-tariff]').forEach(item => {
		item.addEventListener('click', () => {
			selectedTariff = item.dataset.tariff;
			const tariffName = item.querySelector('.tariff-name').textContent;
			document.getElementById('selected-tariff-text').textContent = tariffName;
			tariffMenu.style.display = 'none';
			tariffBtn.classList.remove('active');
			updateSummary();
		});
	});

	// Payment selection
	document.querySelectorAll('[data-payment]').forEach(item => {
		item.addEventListener('click', () => {
			selectedPayment = item.dataset.payment;
			const paymentName = item.querySelector('span').textContent;
			document.getElementById('selected-payment-text').textContent = paymentName;
			paymentMenu.style.display = 'none';
			paymentBtn.classList.remove('active');
			updateSummary();
		});
	});

	// Close dropdowns when clicking outside
	document.addEventListener('click', (e) => {
		if (!tariffBtn.contains(e.target) && !tariffMenu.contains(e.target)) {
			tariffMenu.style.display = 'none';
			tariffBtn.classList.remove('active');
		}
		if (!paymentBtn.contains(e.target) && !paymentMenu.contains(e.target)) {
			paymentMenu.style.display = 'none';
			paymentBtn.classList.remove('active');
		}
	});

	// Promo code functionality
	document.getElementById('promo-btn').addEventListener('click', () => {
		const promoInput = document.getElementById('promo-input');
		const promoCode = promoInput.value.trim().toUpperCase();
		const statusDiv = document.getElementById('promo-status');
		
		if (!promoCode) {
			showPromoStatus('Введите промокод', 'error');
			return;
		}
		
		if (userPrefill.usedPromos.includes(promoCode)) {
			showPromoStatus('❌ Этот промокод уже был использован вами ранее', 'error');
		} else if (availablePromos[promoCode]) {
			appliedPromo = promoCode;
			promoDiscount = availablePromos[promoCode].discount;
			showPromoStatus(`✅ Промокод "${promoCode}" применён! Скидка ${promoDiscount}₽`, 'success');
			promoInput.value = '';
			updateSummary();
		} else {
			showPromoStatus('❌ Промокод не найден или неактивен', 'error');
		}
	});
	
	function showPromoStatus(message, type) {
		const statusDiv = document.getElementById('promo-status');
		statusDiv.textContent = message;
		statusDiv.className = `promo-status ${type}`;
		statusDiv.style.display = 'block';
		
		setTimeout(() => {
			statusDiv.style.display = 'none';
		}, 3000);
	}

	function updateSummary() {
		const basePrice = tariffPrices[selectedTariff];
		const stopsPrice = additionalStops.length * 100;
		const totalPrice = Math.max(0, basePrice + stopsPrice - promoDiscount);
		
		const tariffName = tariffNames[selectedTariff];
		const paymentName = paymentNames[selectedPayment];
		
		document.getElementById('selected-tariff').textContent = tariffName;
		document.getElementById('selected-payment').textContent = paymentName;
		document.getElementById('stops-count').textContent = additionalStops.length;
		document.getElementById('total-price').textContent = `${totalPrice} ₽`;
		
		// Show/hide additional rows
		document.getElementById('stops-row').style.display = additionalStops.length > 0 ? 'flex' : 'none';
		document.getElementById('promo-row').style.display = appliedPromo ? 'flex' : 'none';
		
		if (appliedPromo) {
			document.getElementById('promo-discount').textContent = `-${promoDiscount}₽`;
		}
	}

	updateSummary();

	// Order submit with success animation
	document.getElementById('submit-btn').addEventListener('click', (e) => {
		e.preventDefault();
		
		// Check if ordering is allowed at current time (админы могут заказывать в любое время)
		const isAdmin = userPrefill.status === 'Админ' || userPrefill.isAdmin === '1';
		if (!isAdmin) {
			const now = new Date();
			const hour = now.getHours();
			const minute = now.getMinutes();
			
			if (hour < 7 || (hour === 22 && minute > 30) || hour > 22) {
				alert('🚫 Заказы такси принимаются с 7:00 до 22:30 по московскому времени.\n\nПопробуйте заказать такси в рабочее время.');
				return;
			}
		}
		
		// Validate required fields
		if (!fromInput.value.trim() || !toInput.value.trim()) {
			alert('Пожалуйста, заполните адреса отправления и назначения');
			return;
		}
		
		const basePrice = tariffPrices[selectedTariff];
		const stopsPrice = additionalStops.length * 100;
		const totalPrice = Math.max(0, basePrice + stopsPrice - promoDiscount);
		
		const payload = {
			type: 'order',
			from: fromInput.value.trim(),
			to: toInput.value.trim(),
			tariff: selectedTariff,
			payment: selectedPayment,
			price: totalPrice,
			entrance: entranceNumber,
			additionalStops: additionalStops,
			promo_code: appliedPromo || '',
			ts: Date.now()
		};
		
		// Show success animation
		showSuccessAnimation();
		
		// Send data to bot
		if (tg?.sendData) {
			tg.sendData(JSON.stringify(payload));
		}
	});

	function showSuccessAnimation() {
		const overlay = document.getElementById('success-animation');
		overlay.style.display = 'flex';
		
		// Hide after 3 seconds and close WebApp
		setTimeout(() => {
			overlay.style.display = 'none';
			if (tg?.close) {
				tg.close();
			}
		}, 3000);
	}

	// Profile save
	document.getElementById('save-profile').addEventListener('click', (e) => {
		e.preventDefault();
		const payload = {
			type: 'profile_update',
			name: document.getElementById('name').value.trim(),
			phone: document.getElementById('phone').value.trim(),
			ts: Date.now()
		};
		if (tg?.sendData) {
			tg.sendData(JSON.stringify(payload));
			tg.showToast?.('Профиль обновлён');
			
			// Update local data
			userPrefill.name = payload.name;
			userPrefill.phone = payload.phone;
		} else {
			alert('WebApp не инициализирован. Откройте через Telegram.');
		}
	});

	document.getElementById('support').addEventListener('click', () => {
		if (tg?.showPopup) {
			tg.showPopup({title:'Техподдержка', message:'Напишите нам: @your_dispatch_contact', buttons:[{type:'ok'}]});
		}
	});

	const apiBase = qs.get('api') || '';

	function renderHistory(items) {
		const listEl = document.getElementById('history-list');
		listEl.innerHTML = '';
		if (!items || items.length === 0) {
			listEl.innerHTML = '<div class="empty">Пока нет поездок</div>';
			return;
		}
		for (const t of items) {
			const when = (t.created_at_iso || '').replace('T', ' ');
			const status = t.status || '';
			const price = t.price ? `${t.price} ₽` : '';
			const el = document.createElement('div');
			el.className = 'history-item';
			el.innerHTML = `
				<div class="row"><span>Дата/время</span><strong>${when}</strong></div>
				<div class="row"><span>Откуда</span><strong>${t.from_addr || ''}</strong></div>
				<div class="row"><span>Куда</span><strong>${t.to_addr || ''}</strong></div>
				<div class="row"><span>Цена</span><strong>${price}</strong></div>
				<div class="row"><span>Статус</span><strong>${status}</strong></div>
			`;
			listEl.appendChild(el);
		}
	}

	async function fetchHistory(period='all') {
		if (!apiBase || !userPrefill.userId) return;
		try {
			const url = `${apiBase}/api/history?user_id=${encodeURIComponent(userPrefill.userId)}&period=${encodeURIComponent(period)}`;
			console.log('Fetching history, URL:', url);
			const res = await fetch(url);
			const data = await res.json();
			console.log('History response:', data);
			if (data.ok) {
				renderHistory(data.trips);
			}
		} catch (e) {
			console.log('History fetch failed:', e);
		}
	}

	// История: переключатель периодов с загрузкой
	const segBtns = Array.from(document.querySelectorAll('.segmented button'));
	const listEl = document.getElementById('history-list');
	segBtns.forEach(b => b.addEventListener('click', () => {
		segBtns.forEach(x => x.classList.remove('active'));
		b.classList.add('active');
		fetchHistory(b.dataset.period);
	}));

	// Автообновление профиля и истории
	async function refreshProfile() {
		if (!apiBase || !userPrefill.userId) return;
		try {
			const url = `${apiBase}/api/history?user_id=${encodeURIComponent(userPrefill.userId)}&period=all`;
			console.log('Refreshing profile, URL:', url);
			const res = await fetch(url);
			const data = await res.json();
			console.log('Profile refresh response:', data);
			if (data.ok) {
				// Обновляем счётчики на основе истории
				const completedTrips = data.trips.filter(t => t.status === "Выполнено").length;
				const freeRides = Math.floor(completedTrips / 10);
				const ridesToFree = 10 - (completedTrips % 10);
				const progressPercent = ((completedTrips % 10) / 10) * 100;
				
				console.log('Updating counters:', { completedTrips, freeRides, ridesToFree, progressPercent });
				
				// Обновляем UI
				document.getElementById('free-rides').textContent = freeRides;
				document.getElementById('rides-to-free').textContent = ridesToFree;
				document.getElementById('progress-fill').style.width = `${progressPercent}%`;
				
				// Обновляем локальные данные
				userPrefill.totalCompleted = completedTrips;
				userPrefill.sinceFree = completedTrips % 10;
				userPrefill.ridesToFree = ridesToFree;
			}
		} catch (e) {
			console.log('Profile refresh failed:', e);
		}
	}

	// Автообновление истории
	async function refreshHistory() {
		const currentBtn = document.querySelector('.segmented button.active');
		const period = currentBtn ? currentBtn.dataset.period : 'today';
		await fetchHistory(period);
	}

	// Периодическое обновление каждые 5 секунд
	setInterval(() => {
		refreshProfile();
		const historyTabActive = document.querySelector('[data-tab="history"]').classList.contains('active');
		if (historyTabActive) {
			refreshHistory();
		}
	}, 5000);

	// Обновление при переключении вкладок
	navButtons.forEach(btn => btn.addEventListener('click', () => {
		navButtons.forEach(b => b.classList.remove('active'));
		btn.classList.add('active');
		const tab = btn.dataset.tab;
		Object.values(tabs).forEach(s => s.classList.remove('active'));
		tabs[tab].classList.add('active');
		
		// Принудительно обновляем данные при переключении
		if (tab === 'profile') {
			refreshProfile();
		} else if (tab === 'history') {
			refreshHistory();
		}
	}));

	// Обновление при фокусе на окне
	window.addEventListener('focus', () => {
		refreshProfile();
		const historyTabActive = document.querySelector('[data-tab="history"]').classList.contains('active');
		if (historyTabActive) {
			refreshHistory();
		}
	});

	// Обновление при видимости страницы
	document.addEventListener('visibilitychange', () => {
		if (!document.hidden) {
			refreshProfile();
			const historyTabActive = document.querySelector('[data-tab="history"]').classList.contains('active');
			if (historyTabActive) {
				refreshHistory();
			}
		}
	});

	// Кнопка обновления профиля
	document.getElementById('refresh-btn').addEventListener('click', () => {
		refreshProfile();
		// Анимация кнопки
		const btn = document.getElementById('refresh-btn');
		btn.style.transform = 'rotate(360deg)';
		setTimeout(() => {
			btn.style.transform = 'rotate(0deg)';
		}, 500);
	});

	// Кнопка обновления истории
	document.getElementById('history-refresh-btn').addEventListener('click', () => {
		refreshHistory();
		// Анимация кнопки
		const btn = document.getElementById('history-refresh-btn');
		btn.style.transform = 'rotate(360deg)';
		setTimeout(() => {
			btn.style.transform = 'rotate(0deg)';
		}, 500);
	});

	// Первичная загрузка истории при старте
	fetchHistory('today');
	refreshProfile();
})();