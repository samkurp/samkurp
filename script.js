class PatrolMap {
    constructor() {
        this.map = null;
        this.markers = new Map();
        this.dataUrl = 'https://raw.githubusercontent.com/samkurp/samkurp/main/patrols_data.json';
        this.autoRefreshInterval = null;
        
        this.initMap();
        this.setupEventListeners();
        this.loadData();
    }
    
    initMap() {
        // Инициализация карты с центром в Москве
        this.map = L.map('map').setView([55.7558, 37.6173], 10);
        
        // Добавление слоя OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);
    }
    
    setupEventListeners() {
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.loadData();
        });
        
        document.getElementById('auto-refresh').addEventListener('change', (e) => {
            this.toggleAutoRefresh(e.target.checked);
        });
    }
    
    async loadData() {
        try {
            // Добавляем timestamp для избежания кеширования
            const response = await fetch(`${this.dataUrl}?t=${Date.now()}`);
            
            if (!response.ok) {
                throw new Error('Ошибка загрузки данных');
            }
            
            const patrols = await response.json();
            this.updateMap(patrols);
            this.updateInfoPanel(patrols);
            
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Не удалось загрузить данные. Проверьте URL и доступ к GitHub.');
        }
    }
    
    updateMap(patrols) {
        // Очищаем старые маркеры
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers.clear();
        
        // Добавляем новые маркеры
        patrols.forEach(patrol => {
            const marker = L.circleMarker([patrol.latitude, patrol.longitude], {
                radius: 8,
                fillColor: '#e74c3c',
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(this.map);
            
            // Всплывающая подсказка
            const popupContent = `
                <div class="popup-content">
                    <strong>Патруль ДПС</strong><br>
                    Пользователь: ${patrol.username}<br>
                    Время: ${patrol.date}<br>
                    Координаты: ${patrol.latitude.toFixed(6)}, ${patrol.longitude.toFixed(6)}
                </div>
            `;
            
            marker.bindPopup(popupContent);
            
            // Сохраняем маркер
            this.markers.set(`${patrol.latitude}-${patrol.longitude}-${patrol.timestamp}`, marker);
        });
        
        // Автоматическое изменение зума если есть маркеры
        if (patrols.length > 0) {
            const group = new L.featureGroup(Array.from(this.markers.values()));
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }
    
    updateInfoPanel(patrols) {
        const updatesList = document.getElementById('updates-list');
        updatesList.innerHTML = '';
        
        // Сортируем по времени (новые сверху)
        const sortedPatrols = [...patrols].sort((a, b) => b.timestamp - a.timestamp);
        
        sortedPatrols.slice(0, 10).forEach(patrol => {
            const item = document.createElement('div');
            item.className = 'update-item';
            item.innerHTML = `
                <strong>${patrol.username}</strong>: 
                ${patrol.date} - 
                ${patrol.latitude.toFixed(4)}, ${patrol.longitude.toFixed(4)}
            `;
            updatesList.appendChild(item);
        });
    }
    
    toggleAutoRefresh(enabled) {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
        
        if (enabled) {
            this.autoRefreshInterval = setInterval(() => {
                this.loadData();
            }, 30000); // 30 секунд
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new PatrolMap();
});
