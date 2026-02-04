/**
 * main.js - Orchestrator
 */
import { SearchEngine } from './js/search.js';
import { MapController } from './js/map.js';
import { debounce } from './js/utils.js';

class WayfinderApp {
    constructor() {
        this.config = {
            apiBaseUrl: 'http://10.84.119.18:3000', // Auto-configured by launch script
            defaultFloor: 1,
            qrCodeSize: 104,
            searchDelay: 150,
            maxSuggestions: 6
        };

        this.state = {
            currentFloor: 1,
            selectedDestination: null,
            currentRoute: null,
            libraryData: null,
            isLoading: true,
            isMobileView: window.innerWidth <= 768
        };

        this.elements = {};
        this.searchEngine = new SearchEngine(this.config);
        this.mapController = null; // Init after elements cached

        // Bindings
        this.handleSearch = debounce(this.handleSearch.bind(this), this.config.searchDelay);
        this.handleResize = debounce(this.handleResize.bind(this), 250);

        this.init();
    }

    async init() {
        try {
            this.cacheElements();
            this.mapController = new MapController(this.elements);

            await this.loadLibraryData();
            await this.mapController.loadFloorMaps();

            this.setupEventListeners();
            this.mapController.renderFloor(1);

            this.checkUrlParameters();
            this.hideLoadingScreen();
            console.log('Wayfinder initialized (Modular)');
        } catch (error) {
            console.error('Initialization failed:', error);
            this.showErrorScreen();
        }
    }

    cacheElements() {
        const ids = [
            'loadingScreen', 'errorScreen', 'retryButton', 'selectionView', 'directionsView',
            'controlsPanel', 'searchInput', 'searchButton', 'autocompleteSuggestions',
            'backButton', 'routeTitle', 'routeDescription', 'directionsList',
            'mapContainer', 'mapWrapper', 'floor1Btn', 'floor2Btn',
            'zoomInBtn', 'zoomOutBtn', 'qrHeaderSection', 'qrcode'
        ];
        ids.forEach(id => this.elements[id] = document.getElementById(id));
        this.elements.categoryBtns = document.querySelectorAll('.category-btn');
        this.elements.floorBtns = document.querySelectorAll('.floor-btn');
    }

    async loadLibraryData() {
        const response = await fetch('./data/library_graph.json');
        this.state.libraryData = await response.json();
    }

    setupEventListeners() {
        // Search
        this.elements.searchInput.addEventListener('input', this.handleSearch);
        this.elements.searchInput.addEventListener('focus', () => {
            if (this.elements.searchInput.value.trim()) this.showSuggestions();
        });

        // Map Controls
        this.elements.floorBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchFloor(parseInt(e.currentTarget.dataset.floor)));
        });
        this.elements.zoomInBtn.addEventListener('click', () => this.mapController.zoomIn());
        this.elements.zoomOutBtn.addEventListener('click', () => this.mapController.zoomOut());

        // Categories
        this.elements.categoryBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleCategorySelect(e.currentTarget.dataset.category));
        });

        // Basic nav
        this.elements.backButton.addEventListener('click', () => this.showSelectionView());

        // Suggestions click outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-section')) this.hideSuggestions();
        });
    }

    handleSearch(e) {
        const query = e.target.value;
        if (!query) return this.hideSuggestions();

        const suggestions = this.searchEngine.searchDestinations(query, this.state.libraryData);
        this.displaySuggestions(suggestions);
    }

    displaySuggestions(suggestions) {
        const container = this.elements.autocompleteSuggestions;
        container.innerHTML = '';
        if (suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }

        suggestions.forEach(node => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            const nameHtml = this.searchEngine.highlightSearchTerm(node.name, this.elements.searchInput.value);
            item.innerHTML = `
                <div class="suggestion-content">
                    <div class="suggestion-name">${nameHtml}</div>
                    <div class="suggestion-meta"><span class="suggestion-type">Floor ${node.floor}</span></div>
                </div>`;
            item.addEventListener('click', () => this.selectDestination(node.id));
            container.appendChild(item);
        });
        this.showSuggestions();
    }

    showSuggestions() { this.elements.autocompleteSuggestions.classList.add('show'); }
    hideSuggestions() { this.elements.autocompleteSuggestions.classList.remove('show'); }

    handleCategorySelect(category) {
        const categoryMap = {
            'restroom': ['restroom', 'bathroom'],
            'study': ['study', 'group room'],
            'computer': ['computer', 'lab']
        };
        const keywords = categoryMap[category] || [];
        const matches = this.state.libraryData.nodes.filter(node =>
            node.type === 'destination' && keywords.some(k =>
                node.name.toLowerCase().includes(k) || (node.search_keywords && node.search_keywords.some(sk => sk.includes(k)))
            )
        );

        if (matches.length === 1) this.selectDestination(matches[0].id);
        else if (matches.length > 1) {
            this.displaySuggestions(matches);
            this.elements.searchInput.focus();
        }
    }

    selectDestination(nodeId) {
        const destination = this.state.libraryData.nodes.find(n => n.id === nodeId);
        if (!destination) return;

        this.state.selectedDestination = destination;
        this.hideSuggestions();

        const route = this.state.libraryData.paths[`F1_KIOSK_A-${nodeId}`];
        if (route) {
            this.state.currentRoute = route;
            this.displayRoute(route);
            this.showDirectionsView();
        }
    }

    displayRoute(route) {
        // UI updates
        const dest = this.state.selectedDestination;
        this.elements.routeTitle.textContent = `Directions to ${dest.name}`;
        this.elements.routeDescription.textContent = `From Kiosk to ${dest.name} (Floor ${dest.floor})`;

        this.elements.directionsList.innerHTML = '';
        route.forEach((step, i) => {
            const el = document.createElement('div');
            el.className = 'direction-step';
            el.innerHTML = `
                <div class="step-number">${i + 1}</div>
                <div class="step-content">
                    <div class="step-instruction">${step.instruction}</div>
                    ${step.landmark_photo ? `<div class="step-landmark">Placeholder for ${step.landmark_photo}</div>` : ''}
                </div>`;
            this.elements.directionsList.appendChild(el);
        });

        // Map updates
        this.mapController.highlightRoute(route, this.state.currentFloor);
        // Correctly handling ID reconstruction for markers if complex, but using simplified ID passing here
        // Note: Actual app.js had complex ID logic for end markers: `F${destination.floor}_${destination.id.split('_').slice(1).join('_')}_DEST`
        // We will replicate that in map.js or pass exact ID here
        const endMarkerId = `F${dest.floor}_${dest.id.split('_').slice(1).join('_')}_DEST`;
        this.mapController.addMarkers('F1_KIOSK_A', endMarkerId, this.state.currentFloor, dest.floor);

        this.generateQRCode();
    }

    switchFloor(floor) {
        if (this.state.currentFloor === floor) return;
        this.state.currentFloor = floor;

        this.elements.floorBtns.forEach(btn =>
            btn.classList.toggle('active', parseInt(btn.dataset.floor) === floor)
        );
        this.mapController.renderFloor(floor);

        if (this.state.currentRoute) {
            const dest = this.state.selectedDestination;
            const endMarkerId = `F${dest.floor}_${dest.id.split('_').slice(1).join('_')}_DEST`;
            setTimeout(() => {
                this.mapController.highlightRoute(this.state.currentRoute, floor);
                this.mapController.addMarkers('F1_KIOSK_A', endMarkerId, floor, dest.floor);
            }, 100);
        }
    }

    showSelectionView() {
        this.elements.selectionView.style.display = 'block';
        this.elements.directionsView.style.display = 'none';
        this.mapController.clearRouteHighlights();
        this.state.selectedDestination = null;
        this.state.currentRoute = null;
        if (this.state.currentFloor !== 1) this.switchFloor(1);
    }

    showDirectionsView() {
        this.elements.selectionView.style.display = 'none';
        this.elements.directionsView.style.display = 'block';
    }

    generateQRCode() {
        // ... simplified QR logic wrapper
        if (!window.QRCode || !this.elements.qrcode) return;
        this.elements.qrcode.innerHTML = '';
        const url = `${this.config.apiBaseUrl}?dest=${this.state.selectedDestination.id}`;
        new QRCode(this.elements.qrcode, {
            text: url, width: 104, height: 104
        });
    }

    checkUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);

        // Handle new simple format (?dest=ID)
        const destId = urlParams.get('dest');
        if (destId) {
            console.log('Mobile handoff detected for destination:', destId);
            // Small delay to ensure data is loaded
            setTimeout(() => this.selectDestination(destId), 500);
            return;
        }

        // Handle legacy format (?start=X&end=Y)
        const startId = urlParams.get('start');
        const endId = urlParams.get('end');
        if (startId && endId) {
            console.log('Legacy mobile handoff detected:', endId);
            setTimeout(() => this.selectDestination(endId), 500);
        }
    }

    handleResize() {
        this.state.isMobileView = window.innerWidth <= 768;
        this.mapController.setupInteraction();
    }

    hideLoadingScreen() { this.elements.loadingScreen.style.display = 'none'; }
    showErrorScreen() {
        this.elements.loadingScreen.style.display = 'none';
        this.elements.errorScreen.style.display = 'flex';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.wayfinderApp = new WayfinderApp();
});
