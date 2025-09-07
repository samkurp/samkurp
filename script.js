class PatrolMap {
    constructor() {
        this.map = null;
        this.markers = new Map();
        this.dataUrl = 'https://raw.githubusercontent.com/samkurp/samkurp/main/patrols_data.json';
        this.autoRefreshInterval = null;
        this.lastUpdateHash = '';
        
        this.initMap();
        this.setupEventListeners();
        this.loadData(true); // Первая загрузка
    }
    
    initMap() {
        this.map = L.map('map').setView([55.7558, 37.6173], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);
    }
    
    setupEventListeners() {
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.loadData(true); // Принудительное обновление
        });
        
        document.getElementById('auto-refresh').addEventListener('change', (e) => {
            this.toggleAutoRefresh(e.target.checked);
        });
    }
    
    async loadData(forceRefresh = false) {
        try {
            // Создаем уникальный URL для обхода кеша
            const url = forceRefresh 
                ? `${this.dataUrl}?t=${Date.now()}&force=true`
                : `${this.dataUrl}?t=${Math.floor(Date.now() / 30000) * 30000}`; // Обновляем каждые 30 сек
            
            const response = await fetch(url, {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                cache: 'no-store'
            });
            
            if (!response.ok) {
                throw new Error('Ошибка загрузки данных');
            }
            
            const patrols = await response.json();
            
            // Проверяем, изменились ли данные
            const currentHash = this.generateDataHash(patrols);
            if (currentHash !== this.lastUpdateHash || forceRefresh) {
                this.lastUpdateHash = currentHash;
                this.updateMap(patrols);
                this.updateInfoPanel(patrols);
                this.updateLastUpdateTime();
            }
            
        } catch (error) {
            console.error('Ошибка:', error);
            // Не показываем alert при каждой ошибке
        }
    }
    
    generateDataHash(data) {
        // Создаем простой хэш для проверки изменений
        if (data.length === 0) return 'empty';
        const lastPoint = data[data.length - 1];
        return `${lastPoint.timestamp}-${data.length}`;
    }
    
    updateLastUpdateTime() {
        const timeElement = document.getElementById('last-update-time');
        if (timeElement) {
            timeElement.textContent = new Date().toLocaleTimeString();
        }
    }
    
    updateMap(patrols) {
        // Очищаем старые маркеры
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers.clear();
        
        // Группируем точки по координатам для кластеризации
        const pointGroups = {};
        
        patrols.forEach(patrol => {
            const key = `${patrol.latitude.toFixed(6)}-${patrol.longitude.toFixed(6)}`;
            if (!pointGroups[key]) {
                pointGroups[key] = [];
            }
            pointGroups[key].push(patrol);
        });
        
        // Создаем маркеры для каждой группы
        Object.values(pointGroups).forEach(group => {
            const firstPoint = group[0];
            const count = group.length;
            
            const marker = L.circleMarker([firstPoint.latitude, firstPoint.longitude], {
                radius: Math.min(8 + Math.log(count) * 2, 20), // Размер зависит от количества точек
                fillColor: count > 1 ? '#e67e22' : '#e74c3c', // Оранжевый для множественных точек
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(this.map);
            
            // Всплывающая подсказка
            let popupContent = `<div class="popup-content"><strong>Патруль ДПС</strong><br>`;
            
            if (count > 1) {
                popupContent += `Количество наблюдений: ${count}<br>`;
                const lastSeen = group[group.length - 1];
                popupContent += `Последний раз: ${lastSeen.date}<br>`;
            } else {
                popupContent += `Время: ${firstPoint.date}<br>`;
            }
            
            popupContent += `Координаты: ${firstPoint.latitude.toFixed(6)}, ${firstPoint.longitude.toFixed(6)}<br>`;
            popupContent += `</div>`;
            
            marker.bindPopup(popupContent);
            
            const markerKey = `${firstPoint.latitude}-${firstPoint.longitude}`;
            this.markers.set(markerKey, marker);
        });
        
        // Автоматическое изменение зума
        if (patrols.length > 0) {
            const group = new L.featureGroup(Array.from(this.markers.values()));
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }
    
    updateInfoPanel(patrols) {
        const updatesList = document.getElementById('updates-list');
        updatesList.innerHTML = '';
        
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
            }, 10000); // Уменьшили до 10 секунд
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new PatrolMap();
});
