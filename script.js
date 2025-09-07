class PatrolMap {
    constructor() {
        this.map = null;
        this.markers = new Map();
        this.dataUrl = 'https://raw.githubusercontent.com/samkurp/samkurp/main/patrols_data.json';
        this.autoRefreshInterval = null;
        
        this.initMap();
        this.loadData();
        this.startAutoRefresh();
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
    
    createCustomIcon() {
        return L.divIcon({
            className: 'patrol-marker',
            html: '<div class="marker-icon"></div>',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
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
            
        } catch (error) {
            console.error('Ошибка:', error);
        }
    }
    
    updateMap(patrols) {
        // Очищаем старые маркеры
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers.clear();
        
        // Добавляем новые маркеры с кастомными иконками
        patrols.forEach(patrol => {
            const customIcon = this.createCustomIcon();
            
            const marker = L.marker([patrol.latitude, patrol.longitude], {
                icon: customIcon
            }).addTo(this.map);
            
            // Всплывающая подсказка
            const popupContent = `
                <div class="popup-content">
                    <strong>🚓 Патруль ДПС</strong><br>
                    👤 ${patrol.username}<br>
                    🕐 ${patrol.date}<br>
                    📍 ${patrol.latitude.toFixed(6)}, ${patrol.longitude.toFixed(6)}
                </div>
            `;
            
            marker.bindPopup(popupContent, {
                className: 'custom-popup',
                maxWidth: 300
            });
            
            // Сохраняем маркер
            this.markers.set(`${patrol.latitude}-${patrol.longitude}-${patrol.timestamp}`, marker);
        });
        
        // Автоматическое изменение зума если есть маркеры
        if (patrols.length > 0) {
            const group = new L.featureGroup(Array.from(this.markers.values()));
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }
    
    startAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        
        this.autoRefreshInterval = setInterval(() => {
            this.loadData();
        }, 30000); // 30 секунд
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new PatrolMap();
});
