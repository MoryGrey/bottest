(function(){
  const qs = new URLSearchParams(location.search);
  const driverId = qs.get('driver_id') || qs.get('driver') || '';
  const tripId = qs.get('trip') || '';
  let lat = parseFloat(qs.get('lat'));
  let lon = parseFloat(qs.get('lon'));

  const info = document.getElementById('info');
  const map = L.map('map', { zoomControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  let marker = null;
  function setMarker(p){
    if(!marker){
      marker = L.marker(p).addTo(map);
    } else {
      marker.setLatLng(p);
    }
  }

  function fit(p){
    map.setView(p, 15);
  }

  if(Number.isFinite(lat) && Number.isFinite(lon)){
    const p = [lat, lon];
    setMarker(p);
    fit(p);
    info.textContent = 'Показана последняя координата водителя';
  }

  // В этой версии нет серверного API. Если нужно онлайн-обновление —
  // можно периодически опрашивать ваш backend по driver_id/tripId.
  // Заглушка: просто оставляем карту и последнюю точку, если передана.
  if(!Number.isFinite(lat) || !Number.isFinite(lon)){
    info.textContent = 'Ожидаем первую координату. Перейдите по ссылке ещё раз чуть позже.';
  }
})();


