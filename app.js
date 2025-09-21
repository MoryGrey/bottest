// Telegram WebApp initialization
if (window.Telegram && Telegram.WebApp) {
	Telegram.WebApp.expand();
	Telegram.WebApp.enableClosingConfirmation();
}

// Global variables
let selectedTariff = 'econom';
let selectedPayment = 'cash';
let currentPrices = {
	econom: 150,
	student: 100,
	kids: 200,
	business: 0 // +50% от базового тарифа
};

// DOM elements
const fromInput = document.getElementById('from-input');
const toInput = document.getElementById('to-input');
const locationBtn = document.querySelector('.location-btn');
const addStopBtn = document.querySelector('.add-stop-btn');
const tariffOptions = document.querySelectorAll('.tariff-option');
const paymentBtn = document.getElementById('payment-btn');
const paymentModal = document.getElementById('payment-modal');
const paymentMethod = document.getElementById('payment-method');
const paymentOptions = document.querySelectorAll('.payment-option');
const promoInput = document.getElementById('promo-input');
const promoBtn = document.getElementById('promo-btn');
const orderBtn = document.getElementById('order-btn');
const successOverlay = document.getElementById('success-overlay');
const freeOption = document.getElementById('free-option');
const profileBtn = document.querySelector('.profile-btn');
const profilePage = document.getElementById('profile-page');
const backToMainBtn = document.querySelector('.back-to-main-btn');
const editProfileBtn = document.getElementById('edit-profile');
const supportBtn = document.getElementById('support-btn');
const saveProfileBtn = document.getElementById('save-profile');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
	initializeApp();
	setupEventListeners();
	updateOrderButton();
	
	// Listen for data updates from Telegram
	if (window.Telegram && Telegram.WebApp) {
		Telegram.WebApp.onEvent('mainButtonClicked', function() {
			// This will be called when main button is clicked
		});
		
		// Listen for data updates
		window.addEventListener('message', function(event) {
			if (event.data && event.data.type === 'updateUserData') {
				updateUserDataFromTelegram(event.data);
			}
		});
		
		// Auto-refresh data when MiniApp is opened
		Telegram.WebApp.onEvent('viewportChanged', function() {
			// Refresh data when viewport changes (MiniApp opened)
			refreshUserData();
		});
	}
});

function initializeApp() {
	// Get user data from URL parameters
	const urlParams = new URLSearchParams(window.location.search);
	const userName = urlParams.get('name') || 'Пользователь';
	const userPhone = urlParams.get('phone') || '';
	const isAdmin = urlParams.get('is_admin') === '1';
	
	// Update prices if provided
	const economPrice = urlParams.get('econom_price');
	const studentPrice = urlParams.get('student_price');
	const kidsPrice = urlParams.get('kids_price');
	
	if (economPrice) currentPrices.econom = parseInt(economPrice);
	if (studentPrice) currentPrices.student = parseInt(studentPrice);
	if (kidsPrice) currentPrices.kids = parseInt(kidsPrice);
	
	// Update tariff prices in UI
	updateTariffPrices();
	
	// Check for free rides
	const availableFreeRides = parseInt(urlParams.get('free_rides') || '0');
	if (availableFreeRides > 0) {
		freeOption.style.display = 'flex';
		// Set free payment as default if available
		selectedPayment = 'free';
		paymentMethod.textContent = 'Бесплатная поездка';
	}
}

function setupEventListeners() {
	// Location button
	locationBtn.addEventListener('click', getCurrentLocation);
	
	// Add stop button
	addStopBtn.addEventListener('click', addStop);
	
	// Tariff selection
	tariffOptions.forEach(option => {
		option.addEventListener('click', () => selectTariff(option));
	});
	
	// Payment modal
	paymentBtn.addEventListener('click', () => showPaymentModal());
	document.querySelector('.close-btn').addEventListener('click', hidePaymentModal);
	paymentModal.addEventListener('click', (e) => {
		if (e.target === paymentModal) hidePaymentModal();
	});
	
	// Payment options
	paymentOptions.forEach(option => {
		option.addEventListener('click', () => selectPayment(option));
	});
	
	// Promo code
	promoBtn.addEventListener('click', applyPromoCode);
	promoInput.addEventListener('keypress', (e) => {
		if (e.key === 'Enter') applyPromoCode();
	});
	
	// Order button
	orderBtn.addEventListener('click', submitOrder);
	
	// Profile button
	profileBtn.addEventListener('click', showProfilePage);
	
	// Back to main button
	backToMainBtn.addEventListener('click', hideProfilePage);
	
	// Profile actions
	editProfileBtn.addEventListener('click', editProfile);
	supportBtn.addEventListener('click', showSupport);
	saveProfileBtn.addEventListener('click', saveProfile);
}

function getCurrentLocation() {
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
}

function addStop() {
	const stopAddress = prompt('Введите адрес дополнительной остановки:');
	if (stopAddress && stopAddress.trim()) {
		// Create stop element
		const stopElement = document.createElement('div');
		stopElement.className = 'additional-stop';
		stopElement.innerHTML = `
			<div class="point-dot"></div>
			<div class="point-content">
				<input type="text" value="${stopAddress.trim()}" readonly />
				<button class="remove-stop-btn">×</button>
			</div>
		`;
		
		// Insert before the "to" point
		const toPoint = document.querySelector('.route-point.to');
		toPoint.parentNode.insertBefore(stopElement, toPoint);
		
		// Add remove functionality
		stopElement.querySelector('.remove-stop-btn').addEventListener('click', () => {
			stopElement.remove();
		});
		
		// Update order button to show additional cost
		updateOrderButtonWithStops();
	}
}

function updateOrderButtonWithStops() {
	const stopsCount = document.querySelectorAll('.additional-stop').length;
	if (stopsCount > 0) {
		const additionalCost = stopsCount * 100;
		const tariffNames = {
			econom: 'ЭКОНОМ',
			student: 'СТУДЕНТ',
			kids: 'С ДЕТЬМИ',
			business: 'БИЗНЕС'
		};
		
		const tariffName = tariffNames[selectedTariff] || 'ЭКОНОМ';
		orderBtn.textContent = `ПОДТВЕРДИТЬ ${tariffName} (+${additionalCost}₽)`;
	} else {
		updateOrderButton();
	}
}

function selectTariff(option) {
	// Remove active class from all options
	tariffOptions.forEach(opt => opt.classList.remove('active'));
	
	// Add active class to selected option
	option.classList.add('active');
	
	// Update selected tariff
	selectedTariff = option.dataset.tariff;
	
	// Update order button text
	updateOrderButtonWithStops();
}

function showPaymentModal() {
	paymentModal.classList.add('show');
}

function hidePaymentModal() {
	paymentModal.classList.remove('show');
}

function selectPayment(option) {
	// Remove selected class from all options
	paymentOptions.forEach(opt => opt.classList.remove('selected'));
	
	// Add selected class to clicked option
	option.classList.add('selected');
	
	// Update selected payment
	selectedPayment = option.dataset.payment;
	
	// Update payment method display
	const paymentText = option.querySelector('span').textContent;
	paymentMethod.textContent = paymentText;
	
	// Hide modal
	hidePaymentModal();
	
	// Update order button
	updateOrderButtonWithStops();
}

function applyPromoCode() {
		const promoCode = promoInput.value.trim().toUpperCase();
		
		if (!promoCode) {
		alert('Введите промокод');
			return;
		}
		
	// Simulate promo code validation
	if (promoCode === 'WELCOME' || promoCode === 'FIRST') {
		alert('Промокод применён! Скидка 50₽');
		// Here you would apply the discount logic
		} else {
		alert('Промокод не найден или неактивен');
	}
	
	promoInput.value = '';
}

function updateOrderButton() {
	const tariffNames = {
		econom: 'ЭКОНОМ',
		student: 'СТУДЕНТ',
		kids: 'С ДЕТЬМИ',
		business: 'БИЗНЕС'
	};
	
	const tariffName = tariffNames[selectedTariff] || 'ЭКОНОМ';
	orderBtn.textContent = `ПОДТВЕРДИТЬ ${tariffName}`;
}

function updateTariffPrices() {
	tariffOptions.forEach(option => {
		const tariff = option.dataset.tariff;
		const priceElement = option.querySelector('.tariff-price');
		
		if (tariff && currentPrices[tariff] !== undefined) {
			if (tariff === 'business') {
				priceElement.textContent = '+50%';
			} else {
				priceElement.textContent = `${currentPrices[tariff]}₽`;
			}
		}
	});
}

function submitOrder() {
	const from = fromInput.value.trim();
	const to = toInput.value.trim();
	
	if (!from || !to) {
		alert('Укажите адреса отправления и назначения');
				return;
		}
		
	if (from === to) {
		alert('Адреса отправления и назначения не могут совпадать');
			return;
		}
		
	// Show loading state
	orderBtn.textContent = 'Обработка...';
	orderBtn.disabled = true;
	
	// Calculate price
	let price = currentPrices[selectedTariff];
	if (selectedTariff === 'business') {
		price = Math.round(currentPrices.econom * 1.5); // +50% от эконома
	}
	
	// Add additional stop cost if needed
	let additionalStops = 0;
	const stopsCount = document.querySelectorAll('.additional-stop').length;
	if (stopsCount > 0) {
		additionalStops = stopsCount * 100; // +100₽ за каждую дополнительную остановку
	}
	
	const totalPrice = price + additionalStops;
	
	// Prepare order data
	const orderData = {
			type: 'order',
		from: from,
		to: to,
			tariff: selectedTariff,
			payment: selectedPayment,
			price: totalPrice,
		additional_stops: additionalStops,
		promo_code: promoInput.value.trim()
	};
	
	// Send data to Telegram WebApp
	if (window.Telegram && Telegram.WebApp) {
		Telegram.WebApp.sendData(JSON.stringify(orderData));
	}
		
		// Show success animation
	setTimeout(() => {
		showSuccessAnimation();
	}, 1000);
		}

	function showSuccessAnimation() {
	successOverlay.style.display = 'flex';
		
	// Hide success animation after 3 seconds
		setTimeout(() => {
		successOverlay.style.display = 'none';
		
	// Reset form
	fromInput.value = '';
	toInput.value = '';
	promoInput.value = '';
	
	// Reset order button
	orderBtn.textContent = 'ПОДТВЕРДИТЬ ЭКОНОМ';
	orderBtn.disabled = false;
	
	// Update loyalty counter if free ride was used
	if (selectedPayment === 'free') {
		updateLoyaltyCounter();
	}
		
		// Close WebApp
		if (window.Telegram && Telegram.WebApp) {
			Telegram.WebApp.close();
			}
		}, 3000);
	}

// Profile functions
function showProfilePage() {
	profilePage.style.display = 'block';
	loadProfileData();
}

function hideProfilePage() {
	profilePage.style.display = 'none';
}

function loadProfileData() {
	// Get user data from URL parameters
	const urlParams = new URLSearchParams(window.location.search);
	const userName = urlParams.get('name') || 'Пользователь';
	const userPhone = urlParams.get('phone') || '+7 (999) 123-45-67';
	const userStatus = urlParams.get('status') || 'Клиент';
	const freeRides = urlParams.get('used_free_rides') || '0';
	const ridesToFree = urlParams.get('rides_to_free') || '10';
	
	// Update profile info
	document.getElementById('profile-name').textContent = userName;
	document.getElementById('profile-phone').textContent = userPhone;
	document.getElementById('profile-status').textContent = userStatus;
	document.getElementById('free-rides').textContent = freeRides;
				document.getElementById('rides-to-free').textContent = ridesToFree;
	
	// Update progress bar
	const progress = ((10 - parseInt(ridesToFree)) / 10) * 100;
	document.getElementById('progress-fill').style.width = `${progress}%`;
}

function editProfile() {
	const newName = prompt('Введите новое имя:', document.getElementById('profile-name').textContent);
	if (newName && newName.trim()) {
		document.getElementById('profile-name').textContent = newName.trim();
	}
	
	const newPhone = prompt('Введите новый телефон:', document.getElementById('profile-phone').textContent);
	if (newPhone && newPhone.trim()) {
		document.getElementById('profile-phone').textContent = newPhone.trim();
	}
}

function showSupport() {
	alert('Для связи с техподдержкой напишите в Telegram: @prestige_support');
}

function saveProfile() {
	// Get updated profile data
	const profileData = {
		type: 'profile_update',
		name: document.getElementById('profile-name').textContent,
		phone: document.getElementById('profile-phone').textContent
	};
	
	// Send data to Telegram WebApp
	if (window.Telegram && Telegram.WebApp) {
		Telegram.WebApp.sendData(JSON.stringify(profileData));
	}
	
	alert('Профиль сохранён!');
}

function updateLoyaltyCounter() {
	// Get current counter values
	const freeRidesElement = document.getElementById('free-rides');
	const ridesToFreeElement = document.getElementById('rides-to-free');
	const progressFill = document.getElementById('progress-fill');
	
	if (freeRidesElement && ridesToFreeElement && progressFill) {
		// Update counters - если использовали бесплатную поездку, то уменьшаем их количество
		const currentFreeRides = Math.max(0, parseInt(freeRidesElement.textContent) - 1);
		// Счётчик до следующей бесплатной поездки не изменяется при использовании бесплатной
		const currentRidesToFree = parseInt(ridesToFreeElement.textContent);
		
		freeRidesElement.textContent = currentFreeRides;
		
		// Update progress bar
		const progress = ((10 - currentRidesToFree) / 10) * 100;
		progressFill.style.width = `${progress}%`;
		
		// Update free rides availability
		updateFreeRidesAvailability(currentFreeRides);
		
		// Show updated message
		setTimeout(() => {
			alert('Данные обновлены! Количество бесплатных поездок уменьшено на 1.');
		}, 1000);
	}
}

function updateFreeRidesAvailability(availableFreeRides) {
	const freeOption = document.querySelector('.payment-option[data-payment="free"]');
	
	if (availableFreeRides > 0) {
		freeOption.style.display = 'flex';
		// If no payment method is selected, set free as default
		if (!selectedPayment || selectedPayment === '') {
			selectedPayment = 'free';
			paymentMethod.textContent = 'Бесплатная поездка';
		}
	} else {
		freeOption.style.display = 'none';
		// If free was selected but no longer available, switch to cash
		if (selectedPayment === 'free') {
			selectedPayment = 'cash';
			paymentMethod.textContent = 'Наличные';
		}
	}
}

function refreshUserData() {
	// Reload user data from URL parameters
	const urlParams = new URLSearchParams(window.location.search);
	const availableFreeRides = parseInt(urlParams.get('free_rides') || '0');
	const ridesToFree = parseInt(urlParams.get('rides_to_free') || '10');
	
	// Update free rides count
	const freeRidesElement = document.getElementById('free-rides');
	if (freeRidesElement) {
		freeRidesElement.textContent = availableFreeRides;
	}
	updateFreeRidesAvailability(availableFreeRides);
	
	// Update rides to free count
	const ridesToFreeElement = document.getElementById('rides-to-free');
	const progressFill = document.getElementById('progress-fill');
	if (ridesToFreeElement) {
		ridesToFreeElement.textContent = ridesToFree;
	}
	if (progressFill) {
		const progress = ((10 - ridesToFree) / 10) * 100;
		progressFill.style.width = `${progress}%`;
	}
}

function updateUserDataFromTelegram(data) {
	// Update free rides count
	if (data.free_rides !== undefined) {
		const freeRidesElement = document.getElementById('free-rides');
		if (freeRidesElement) {
			freeRidesElement.textContent = data.free_rides;
		}
		updateFreeRidesAvailability(data.free_rides);
	}
	
	// Update rides to free count
	if (data.rides_to_free !== undefined) {
		const ridesToFreeElement = document.getElementById('rides-to-free');
		const progressFill = document.getElementById('progress-fill');
		if (ridesToFreeElement) {
			ridesToFreeElement.textContent = data.rides_to_free;
		}
		if (progressFill) {
			const progress = ((10 - data.rides_to_free) / 10) * 100;
			progressFill.style.width = `${progress}%`;
		}
	}
}

// Handle keyboard events
document.addEventListener('keydown', function(e) {
	if (e.key === 'Escape') {
		hidePaymentModal();
	}
});

// Prevent zoom on input focus (iOS)
document.addEventListener('touchstart', function(e) {
	if (e.touches.length > 1) {
		e.preventDefault();
	}
});

let lastTouchEnd = 0;
document.addEventListener('touchend', function(e) {
	const now = (new Date()).getTime();
	if (now - lastTouchEnd <= 300) {
		e.preventDefault();
	}
	lastTouchEnd = now;
}, false);