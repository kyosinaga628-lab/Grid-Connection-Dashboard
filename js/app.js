/**
 * 系統接続検討状況 ダッシュボード (Leaflet version)
 * Grid Connection Dashboard App
 */

// ============================================
// Configuration
// ============================================
const CONFIG = {
    map: {
        center: [36.5, 137.5],
        zoom: 5.5,
        minZoom: 4,
        maxZoom: 10,
        tileUrl: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    },
    bubble: {
        maxRadius: 90
    },
    data: {
        battery: 'data/battery-data.json'
    }
};

// ============================================
// State
// ============================================
let state = {
    batteryData: null,
    map: null,
    markers: {},
    activeRegionId: null
};

// ============================================
// Init
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadData();
        initMap();
        initDashboard();
    } catch (error) {
        console.error('Initialization error:', error);
    }
});

// ============================================
// Data
// ============================================
async function loadData() {
    const response = await fetch(CONFIG.data.battery);
    state.batteryData = await response.json();
}

function initDashboard() {
    renderAreaCards();
    updateNationalStats();
    initTimelineChart();
}

// ============================================
// Map Logic
// ============================================
function initMap() {
    state.map = L.map('japan-map', {
        center: CONFIG.map.center,
        zoom: CONFIG.map.zoom,
        zoomControl: false,
        background: '#0a0a1a'
    });

    L.tileLayer(CONFIG.map.tileUrl, {
        attribution: CONFIG.map.attribution,
        maxZoom: 20
    }).addTo(state.map);

    L.control.zoom({ position: 'bottomright' }).addTo(state.map);

    drawMapElements();
}

function drawMapElements() {
    const regions = state.batteryData.regions;

    const maxCapacity = d3.max(regions, d => d.underReview);
    const radiusScale = d3.scaleSqrt()
        .domain([0, maxCapacity])
        .range([0, CONFIG.bubble.maxRadius]);

    regions.forEach(region => {
        const center = [region.center[1], region.center[0]];

        const statuses = [
            { type: 'under-review', value: region.underReview, zIndex: 10 },
            { type: 'contracted', value: region.contracted, zIndex: 20 },
            { type: 'connected', value: region.connected, zIndex: 30 }
        ];

        statuses.forEach(status => {
            const radius = radiusScale(status.value);
            if (radius <= 0) return;

            const icon = L.divIcon({
                className: 'custom-marker-icon',
                html: `<div class="map-bubble map-bubble-${status.type}" style="width:${radius * 2}px; height:${radius * 2}px;"></div>`,
                iconSize: [radius * 2, radius * 2],
                iconAnchor: [radius, radius]
            });

            const marker = L.marker(center, {
                icon: icon,
                zIndexOffset: status.zIndex,
                interactive: status.type === 'under-review'
            }).addTo(state.map);

            if (status.type === 'under-review') {
                marker.on('click', () => selectRegion(region.id));
                state.markers[region.id] = marker;
            }
        });

        // Label
        const labelIcon = L.divIcon({
            className: 'custom-label-icon',
            html: `<div class="map-label"><span class="map-label-name">${region.name}</span></div>`,
            iconSize: [60, 30],
            iconAnchor: [30, -radiusScale(region.underReview) - 5]
        });
        L.marker(center, { icon: labelIcon, zIndexOffset: 1000, interactive: false }).addTo(state.map);
    });
}

// ============================================
// Dashboard Logic
// ============================================
function renderAreaCards() {
    const container = document.getElementById('area-card-list');
    container.innerHTML = '';

    state.batteryData.regions.forEach(region => {
        const card = document.createElement('div');
        card.className = 'area-card';
        card.dataset.id = region.id;

        // Multi-status content with VRE
        card.innerHTML = `
            <div class="area-card-name">${region.name}</div>
            <div class="card-stat-row">
                <span class="card-stat-label">変動電源</span>
                <span class="card-stat-val val-vre">${region.vreRatio}%</span>
            </div>
            <div class="card-stat-row" title="蓄電池接続検討申込中 (万kW)">
                <span class="card-stat-label">🔴申込</span>
                <span class="card-stat-val val-review">${Math.round(region.underReview).toLocaleString()}</span>
            </div>
            <div class="card-stat-row" title="蓄電池接続契約済 (万kW)">
                <span class="card-stat-label">🟠契約</span>
                <span class="card-stat-val val-contract">${Math.round(region.contracted).toLocaleString()}</span>
            </div>
            <div class="card-stat-row" title="蓄電池運転中 (万kW)">
                <span class="card-stat-label">🟢運転</span>
                <span class="card-stat-val val-connect">${Math.round(region.connected).toLocaleString()}</span>
            </div>
        `;

        card.addEventListener('click', () => selectRegion(region.id));
        container.appendChild(card);
    });
}

function selectRegion(id) {
    state.activeRegionId = id;

    document.querySelectorAll('.area-card').forEach(c => c.classList.remove('active'));
    const activeCard = document.querySelector(`.area-card[data-id="${id}"]`);
    if (activeCard) {
        activeCard.classList.add('active');
        activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    const region = state.batteryData.regions.find(r => r.id === id);
    if (region) {
        state.map.flyTo([region.center[1], region.center[0]], CONFIG.map.zoom, { duration: 1.5 });
    }

    updateRegionDetail(region);
}

function updateNationalStats() {
    const summary = state.batteryData.summary;
    document.getElementById('total-under-review').textContent = summary.totalUnderReview.toLocaleString();
    document.getElementById('total-contracted').textContent = summary.totalContracted.toLocaleString();
    document.getElementById('total-connected').textContent = summary.totalConnected.toLocaleString();
}

function updateRegionDetail(region) {
    const container = document.getElementById('region-detail');

    if (!region) {
        container.innerHTML = '<p class="placeholder-text">地図上のエリアまたはカードを選択してください</p>';
        return;
    }

    const total = region.underReview + region.contracted + region.connected;
    const totalRenewable = region.solarApplications + region.windApplications;

    container.innerHTML = `
        <div class="region-info">
            <h3>${region.name}エリア</h3>
            
            <!-- VRE & Curtailment -->
            <div class="region-stats highlight-stats">
                <div class="region-stat vre-stat">
                    <span class="region-stat-label">変動電源比率 (VRE)</span>
                    <div class="region-stat-value" style="color: #a5b4fc; font-size: 1.4rem;">
                        ${region.vreRatio}%
                    </div>
                </div>
                <div class="region-stat curtail-stat">
                    <span class="region-stat-label">出力制御率</span>
                    <div class="region-stat-value" style="color: ${region.curtailmentRate > 3 ? '#ff6b6b' : '#aaa'}; font-size: 1.4rem;">
                        ${region.curtailmentRate}%
                    </div>
                </div>
            </div>

            <!-- Battery Status -->
            <h4 style="margin-top: 12px; color: var(--text-muted); font-size: 0.85rem;">🔋 蓄電池の系統接続状況 (万kW)</h4>
            <div class="region-stats">
                <div class="region-stat">
                    <span class="region-stat-label">🔴 接続検討申込中</span>
                    <div class="region-stat-value" style="color: var(--color-under-review)">
                        ${region.underReview.toLocaleString()}
                    </div>
                </div>
                <div class="region-stat">
                    <span class="region-stat-label">🟠 接続契約済</span>
                    <div class="region-stat-value" style="color: var(--color-contracted)">
                        ${region.contracted.toLocaleString()}
                    </div>
                </div>
                 <div class="region-stat">
                    <span class="region-stat-label">🟢 運転中</span>
                    <div class="region-stat-value" style="color: var(--color-connected)">
                        ${region.connected.toLocaleString()}
                    </div>
                </div>
            </div>

            <div class="comparison-bar-container" style="margin-top: 8px;">
                <div class="comparison-bar bar-under-review" style="width: ${(region.underReview / total * 100)}%"></div>
                <div class="comparison-bar bar-contracted" style="width: ${(region.contracted / total * 100)}%"></div>
                <div class="comparison-bar bar-connected" style="width: ${(region.connected / total * 100)}%"></div>
            </div>

            <!-- Renewable Applications -->
            <h4 style="margin-top: 16px; color: var(--text-muted); font-size: 0.85rem;">再エネ申込 (件数, 2024Q2)</h4>
            <div class="region-stats">
                <div class="region-stat">
                    <span class="region-stat-label">太陽光</span>
                    <div class="region-stat-value" style="color: #fcd34d">
                        ${region.solarApplications.toLocaleString()}
                    </div>
                </div>
                <div class="region-stat">
                    <span class="region-stat-label">風力</span>
                    <div class="region-stat-value" style="color: #7dd3fc">
                        ${region.windApplications.toLocaleString()}
                    </div>
                </div>
            </div>
            
            <div class="region-characteristics">
                <strong>地域特性:</strong><br>
                ${region.characteristics}
            </div>
        </div>
    `;
}

// ============================================
// D3 Chart (Timeline)
// ============================================
function initTimelineChart() {
    const data = state.batteryData.timeline;
    const container = document.getElementById('timeline-chart');
    if (!container) return;
    container.innerHTML = '';

    const margin = { top: 10, right: 30, bottom: 20, left: 40 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;

    const svg = d3.select('#timeline-chart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint().domain(data.labels).range([0, width]);
    svg.append('g').attr('transform', `translate(0,${height})`).attr('class', 'timeline-axis').call(d3.axisBottom(x).tickSize(0).tickPadding(10));

    const y = d3.scaleLinear().domain([0, d3.max(data.totalUnderReview) * 1.1]).range([height, 0]);
    svg.append('g').attr('class', 'timeline-axis').call(d3.axisLeft(y).ticks(5).tickFormat(d => d / 1000 + 'k'));

    const line = d3.line().x((d, i) => x(data.labels[i])).y(d => y(d)).curve(d3.curveMonotoneX);

    svg.append('path').datum(data.totalUnderReview).attr('class', 'timeline-line timeline-line-under-review').attr('d', line);
    svg.selectAll('.dot').data(data.totalUnderReview).enter().append('circle').attr('class', 'timeline-dot timeline-dot-under-review').attr('cx', (d, i) => x(data.labels[i])).attr('cy', d => y(d)).attr('r', 4);
}
