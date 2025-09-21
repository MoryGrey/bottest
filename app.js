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
	const availableFreeRides = parseInt(urlParams.get('available_free_rides') || '0');
	if (availableFreeRides > 0) {
		freeOption.style.display = 'flex';
	}
}

function setupEventListeners() {
	// Location button
	locationBtn.addEventListener('click', getCurrentLocation);
	
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

function selectTariff(option) {
	// Remove active class from all options
	tariffOptions.forEach(opt => opt.classList.remove('active'));
	
	// Add active class to selected option
	option.classList.add('active');
	
	// Update selected tariff
	selectedTariff = option.dataset.tariff;
	
	// Update order button text
	updateOrderButton();
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
	updateOrderButton();
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
	
	// Prepare order data
	const orderData = {
		type: 'order',
		from: from,
		to: to,
		tariff: selectedTariff,
		payment: selectedPayment,
		price: price,
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