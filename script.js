// Инициализация переменных
let map;
let markers = [];
let userMarker = null;

// Иконка для маркеров ДПС
const dpsIcon = L.divIcon({
    className: 'dps-marker',
    html: '🚔',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
});

// Иконка для пользователя
const userIcon = L.divIcon({
    className: 'user-marker',
    html: '📍',
    iconSize: [25, 25],
    iconAnchor: [12, 12]
});

// Инициализация карты
function initMap() {
    map = L.map('map').setView([55.7558, 37.6173], 12);
    
    // Добавляем слой OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Инициализация Telegram Web App
    const tg = window.Telegram.WebApp;
    tg.expand();
    tg.enableClosingConfirmation();
    
    // Загружаем данные
    loadDpsData();
    
    // Настраиваем кнопки
    setupButtons();
    
    // Пытаемся получить местоположение пользователя
    getUserLocation();
}

// Загрузка данных ДПС
async function loadDpsData() {
    try {
        const statsElement = document.getElementById('stats');
        statsElement.innerHTML = '⏳ Загрузка данных...';
        
        // Симуляция загрузки данных (замените на реальный API)
        const response = await fetch('/api/dps-data');
        const data = await response.json();
        
        // Очищаем старые маркеры
        clearMarkers();
        
        // Добавляем новые маркеры
        data.locations.forEach(location => {
            const marker = L.marker([location.lat, location.lon], { icon: dpsIcon })
                .addTo(map)
                .bindPopup(createPopupContent(location));
            
            markers.push(marker);
        });
        
        // Обновляем статистику
        statsElement.innerHTML = `📊 Экипажей: ${data.locations.length} | ⏰ ${new Date().toLocaleTimeString()}`;
        
        // Центрируем карту если есть точки
        if (data.locations.length > 0 && data.center) {
            map.setView([data.center.lat, data.center.lon], data.zoom || 12);
        }
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        document.getElementById('stats').innerHTML = '❌ Ошибка загрузки';
    }
}

// Создание содержимого попапа
function createPopupContent(location) {
    return `
        <div class="dps-popup">
            <h3>🚔 ДПС Экипаж</h3>
            <p><strong>📍:</strong> ${location.comment}</p>
            <p><strong>👤:</strong> ${location.username}</p>
            <p class="time"><strong>⏰:</strong> ${location.time}</p>
        </div>
    `;
}

// Очистка маркеров
function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

// Настройка кнопок
function setupButtons() {
    document.getElementById('refreshBtn').addEventListener('click', loadDpsData);
    
    document.getElementById('myLocationBtn').addEventListener('click', () => {
        if (userMarker) {
            map.setView(userMarker.getLatLng(), 15);
        } else {
            getUserLocation();
        }
    });
}

// Получение местоположения пользователя
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                // Убираем старый маркер
                if (userMarker) {
                    map.removeLayer(userMarker);
                }
                
                // Добавляем новый маркер
                userMarker = L.marker([lat, lon], { icon: userIcon })
                    .addTo(map)
                    .bindPopup('📍 Ваше местоположение');
                
                // Центрируем карту на пользователе
                map.setView([lat, lon], 15);
            },
            error => {
                console.log('Не удалось получить местоположение:', error);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', initMap);