/**
 * Lockwood Library Wayfinder - Main Application JavaScript
 * 
 * This file contains all the interactive functionality for the wayfinding kiosk
 * including search, routing, map interaction, and mobile handoff capabilities.
 */

class WayfinderApp {
    constructor() {
        // Application state
        this.state = {
            currentFloor: 1, // Always start on Floor 1 where kiosk is located
            selectedDestination: null,
            currentRoute: null,
            libraryData: null,
            isLoading: true,
            panzoomInstance: null,
            isMobileView: window.innerWidth <= 768
        };
        
        // DOM elements - will be populated in init()
        this.elements = {};
        
        // Configuration
        this.config = {
            apiBaseUrl: 'http://10.84.159.205:8080',
            defaultFloor: 1,
            qrCodeSize: 104, // Larger for better scanning
            searchDelay: 150, // Faster response for better UX
            maxSuggestions: 6
        };
        
        // Bind methods to preserve context
        this.handleSearch = this.debounce(this.handleSearch.bind(this), this.config.searchDelay);
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handleResize = this.debounce(this.handleResize.bind(this), 250);
        
        // Initialize the application
        this.init();
    }
    
    /**
     * Initialize the application
     */
    async init() {
        try {
            await this.cacheElements();
            await this.loadLibraryData();
            await this.loadFloorMaps();
            this.setupEventListeners();
            this.checkUrlParameters();
            this.setupMapInteraction();
            this.hideLoadingScreen();
            
            console.log('Wayfinder app initialized successfully');
        } catch (error) {
            console.error('Failed to initialize wayfinder app:', error);
            this.showErrorScreen();
        }
    }
    
    /**
     * Cache DOM elements for performance
     */
    async cacheElements() {
        const elementIds = [
            'loadingScreen', 'errorScreen', 'retryButton',
            'selectionView', 'directionsView', 'controlsPanel',
            'searchInput', 'searchButton', 'autocompleteSuggestions',
            'backButton', 'routeTitle', 'routeDescription', 'directionsList',
            'mapContainer', 'mapWrapper', 'floor1Btn', 'floor2Btn',
            'zoomInBtn', 'zoomOutBtn', 'qrHeaderSection', 'qrcode'
        ];
        
        elementIds.forEach(id => {
            this.elements[id] = document.getElementById(id);
            if (!this.elements[id]) {
                console.warn(`Element with ID '${id}' not found`);
            }
        });
        
        // Cache category buttons
        this.elements.categoryBtns = document.querySelectorAll('.category-btn');
        this.elements.floorBtns = document.querySelectorAll('.floor-btn');
    }
    
    /**
     * Load library data from JSON file
     */
    async loadLibraryData() {
        try {
            const response = await fetch('./data/library_graph.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.state.libraryData = await response.json();
            console.log('Library data loaded:', this.state.libraryData);
        } catch (error) {
            console.error('Error loading library data:', error);
            throw error;
        }
    }
    
    /**
     * Load SVG floor maps
     */
    async loadFloorMaps() {
        try {
            const floor1Response = await fetch('./assets/floor1.svg');
            const floor2Response = await fetch('./assets/floor2.svg');
            
            if (!floor1Response.ok || !floor2Response.ok) {
                throw new Error('Failed to load floor maps');
            }
            
            const floor1Svg = await floor1Response.text();
            const floor2Svg = await floor2Response.text();
            
            // Store SVG content for later use
            this.floorMaps = {
                1: floor1Svg,
                2: floor2Svg
            };
            
            // Load initial floor (Floor 1 where kiosk is located)
            this.loadFloorMap(1);
            
        } catch (error) {
            console.error('Error loading floor maps:', error);
            throw error;
        }
    }
    
    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Search functionality
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', this.handleSearch);
            this.elements.searchInput.addEventListener('keydown', this.handleKeydown);
            this.elements.searchInput.addEventListener('focus', () => {
                if (this.elements.searchInput.value.trim()) {
                    this.showSuggestions();
                }
            });
        }
        
        if (this.elements.searchButton) {
            this.elements.searchButton.addEventListener('click', () => {
                this.handleSearchSubmit();
            });
        }
        
        // Category buttons
        this.elements.categoryBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.handleCategorySelect(category);
            });
        });
        
        // Floor selection
        this.elements.floorBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const floor = parseInt(e.currentTarget.dataset.floor);
                this.switchFloor(floor);
            });
        });
        
        // Zoom controls
        if (this.elements.zoomInBtn) {
            this.elements.zoomInBtn.addEventListener('click', () => this.zoomIn());
        }
        if (this.elements.zoomOutBtn) {
            this.elements.zoomOutBtn.addEventListener('click', () => this.zoomOut());
        }
        
        // Back button
        if (this.elements.backButton) {
            this.elements.backButton.addEventListener('click', () => {
                this.showSelectionView();
            });
        }
        
        // Retry button
        if (this.elements.retryButton) {
            this.elements.retryButton.addEventListener('click', () => {
                location.reload();
            });
        }
        
        // Window resize
        window.addEventListener('resize', this.handleResize);
        
        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-section')) {
                this.hideSuggestions();
            }
        });
    }
    
    /**
     * Handle search input with autocomplete
     */
    handleSearch(e) {
        const query = e.target.value.trim().toLowerCase();
        
        if (query.length === 0) {
            this.hideSuggestions();
            return;
        }
        
        if (query.length < 1) {
            return; // Wait for at least 1 character
        }
        
        const suggestions = this.searchDestinations(query);
        this.displaySuggestions(suggestions);
    }
    
    /**
     * Handle keyboard navigation in search
     */
    handleKeydown(e) {
        const suggestions = this.elements.autocompleteSuggestions;
        const items = suggestions.querySelectorAll('.suggestion-item');
        const highlighted = suggestions.querySelector('.suggestion-item.highlighted');
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (highlighted) {
                    highlighted.classList.remove('highlighted');
                    const next = highlighted.nextElementSibling || items[0];
                    next.classList.add('highlighted');
                } else if (items.length > 0) {
                    items[0].classList.add('highlighted');
                }
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                if (highlighted) {
                    highlighted.classList.remove('highlighted');
                    const prev = highlighted.previousElementSibling || items[items.length - 1];
                    prev.classList.add('highlighted');
                } else if (items.length > 0) {
                    items[items.length - 1].classList.add('highlighted');
                }
                break;
                
            case 'Enter':
                e.preventDefault();
                if (highlighted) {
                    this.selectDestination(highlighted.dataset.nodeId);
                } else {
                    this.handleSearchSubmit();
                }
                break;
                
            case 'Escape':
                this.hideSuggestions();
                this.elements.searchInput.blur();
                break;
        }
    }
    
    /**
     * Search destinations based on query
     */
    searchDestinations(query) {
        if (!this.state.libraryData) return [];
        
        const results = [];
        const queryLower = query.toLowerCase().trim();
        
        this.state.libraryData.nodes.forEach(node => {
            if (node.type !== 'destination') return;
            
            let score = 0;
            const nameLower = node.name.toLowerCase();
            const nameWords = nameLower.split(/\s+/);
            
            // 1. Exact name match gets highest score
            if (nameLower === queryLower) {
                score = 100;
            }
            // 2. Name starts with query
            else if (nameLower.startsWith(queryLower)) {
                score = 95;
            }
            // 3. Any word in name starts with query
            else if (nameWords.some(word => word.startsWith(queryLower))) {
                score = 90;
            }
            // 4. Name contains query as substring
            else if (nameLower.includes(queryLower)) {
                score = 85;
            }
            // 5. Check for partial word matches (like "2B" in "Room 2B")
            else if (this.hasPartialWordMatch(nameLower, queryLower)) {
                score = 80;
            }
            
            // 6. Check keywords for matches
            if (node.search_keywords) {
                let keywordScore = 0;
                node.search_keywords.forEach(keyword => {
                    const keywordLower = keyword.toLowerCase();
                    if (keywordLower === queryLower) {
                        keywordScore = Math.max(keywordScore, 75);
                    } else if (keywordLower.startsWith(queryLower)) {
                        keywordScore = Math.max(keywordScore, 70);
                    } else if (keywordLower.includes(queryLower)) {
                        keywordScore = Math.max(keywordScore, 65);
                    }
                });
                score = Math.max(score, keywordScore);
            }
            
            // 7. For short queries (1-3 chars), be more permissive with substring matching
            if (queryLower.length <= 3 && score === 0) {
                // Check if any word in the name contains the query
                const wordContainsQuery = nameWords.some(word => word.includes(queryLower));
                if (wordContainsQuery) {
                    score = 75; // Good score for short substring matches
                }
                
                // Also check if the full name contains the query (if not already matched)
                if (score === 0 && nameLower.includes(queryLower)) {
                    score = 70;
                }
            }
            
            // 8. Check for number/letter patterns (like "2B", "1A", etc.)
            if (this.matchesPattern(queryLower)) {
                const patternScore = this.getPatternMatchScore(nameLower, queryLower);
                score = Math.max(score, patternScore);
            }
            
            // 9. Fuzzy matching for slight typos
            if (score === 0 && queryLower.length >= 3) {
                const fuzzyScore = this.getFuzzyMatchScore(nameLower, queryLower);
                score = Math.max(score, fuzzyScore);
            }
            
            if (score > 0) {
                results.push({ node, score, matchInfo: this.getMatchInfo(node, queryLower) });
            }
        });
        
        // Sort by score and limit results
        return results
            .sort((a, b) => {
                // Primary sort by score
                if (b.score !== a.score) return b.score - a.score;
                // Secondary sort by name length (shorter names first for same score)
                return a.node.name.length - b.node.name.length;
            })
            .slice(0, this.config.maxSuggestions)
            .map(result => result.node);
    }
    
    /**
     * Check for partial word matches (handles cases like "2B" matching "Room 2B")
     */
    hasPartialWordMatch(text, query) {
        const words = text.split(/\s+/);
        return words.some(word => {
            // Check if word contains the query as a significant part
            if (word.includes(query)) {
                // If query is short (1-2 chars), it should be at word boundaries
                if (query.length <= 2) {
                    return word.startsWith(query) || word.endsWith(query) || 
                           /\d/.test(query); // Allow number matches anywhere
                }
                // For longer queries, any substring match is valid
                return true;
            }
            return false;
        });
    }
    
    /**
     * Check if query matches common patterns (numbers, room codes, etc.)
     */
    matchesPattern(query) {
        // Match patterns like: 2B, 1A, 214, etc.
        return /^[0-9]+[A-Za-z]*$/.test(query) || /^[A-Za-z]+[0-9]+[A-Za-z]*$/.test(query);
    }
    
    /**
     * Get pattern match score for room codes, numbers, etc.
     */
    getPatternMatchScore(text, query) {
        // Look for exact pattern matches in the text
        const patterns = text.match(/[0-9]+[A-Za-z]*|[A-Za-z]+[0-9]+[A-Za-z]*/g) || [];
        
        for (const pattern of patterns) {
            if (pattern.toLowerCase() === query) {
                return 85; // High score for exact pattern match
            }
            if (pattern.toLowerCase().includes(query)) {
                return 75; // Good score for partial pattern match
            }
        }
        return 0;
    }
    
    /**
     * Simple fuzzy matching for typos
     */
    getFuzzyMatchScore(text, query) {
        // Calculate Levenshtein distance for fuzzy matching
        const words = text.split(/\s+/);
        let bestScore = 0;
        
        words.forEach(word => {
            if (Math.abs(word.length - query.length) <= 2) {
                const distance = this.levenshteinDistance(word, query);
                const maxLength = Math.max(word.length, query.length);
                const similarity = (maxLength - distance) / maxLength;
                
                if (similarity >= 0.7) { // 70% similarity threshold
                    bestScore = Math.max(bestScore, Math.floor(similarity * 60));
                }
            }
        });
        
        return bestScore;
    }
    
    /**
     * Calculate Levenshtein distance between two strings
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    /**
     * Get match information for displaying in suggestions
     */
    getMatchInfo(node, query) {
        const nameLower = node.name.toLowerCase();
        const queryLower = query.toLowerCase();
        
        if (nameLower.includes(queryLower)) {
            return {
                type: 'name',
                matchedText: query
            };
        }
        
        if (node.search_keywords) {
            const matchedKeyword = node.search_keywords.find(keyword => 
                keyword.toLowerCase().includes(queryLower)
            );
            if (matchedKeyword) {
                return {
                    type: 'keyword',
                    matchedText: matchedKeyword
                };
            }
        }
        
        return { type: 'other' };
    }
    
    /**
     * Display search suggestions
     */
    displaySuggestions(suggestions) {
        const container = this.elements.autocompleteSuggestions;
        
        if (suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }
        
        container.innerHTML = '';
        
        suggestions.forEach((node, index) => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.dataset.nodeId = node.id;
            
            // Highlight the search term in the name
            const highlightedName = this.highlightSearchTerm(node.name, this.elements.searchInput.value);
            
            item.innerHTML = `
                <div class="suggestion-content">
                    <div class="suggestion-name">${highlightedName}</div>
                    <div class="suggestion-meta">
                        <span class="suggestion-type">Floor ${node.floor}</span>
                        ${this.getSuggestionBadge(node)}
                    </div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                this.selectDestination(node.id);
            });
            
            container.appendChild(item);
        });
        
        this.showSuggestions();
    }
    
    /**
     * Highlight search term in suggestion name
     */
    highlightSearchTerm(name, searchTerm) {
        if (!searchTerm || searchTerm.length < 1) return name;
        
        const regex = new RegExp(`(${this.escapeRegExp(searchTerm)})`, 'gi');
        return name.replace(regex, '<mark class="search-highlight">$1</mark>');
    }
    
    /**
     * Get suggestion badge based on node type/category
     */
    getSuggestionBadge(node) {
        const keywords = node.search_keywords || [];
        
        if (keywords.includes('restroom') || keywords.includes('bathroom')) {
            return '<span class="suggestion-badge">🚻</span>';
        }
        if (keywords.includes('study') || keywords.includes('group room')) {
            return '<span class="suggestion-badge">📚</span>';
        }
        if (keywords.includes('computer') || keywords.includes('lab')) {
            return '<span class="suggestion-badge">💻</span>';
        }
        if (keywords.includes('special') || keywords.includes('archives')) {
            return '<span class="suggestion-badge">📜</span>';
        }
        
        return '';
    }
    
    /**
     * Escape special regex characters
     */
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    /**
     * Show suggestions dropdown
     */
    showSuggestions() {
        this.elements.autocompleteSuggestions.classList.add('show');
    }
    
    /**
     * Hide suggestions dropdown
     */
    hideSuggestions() {
        this.elements.autocompleteSuggestions.classList.remove('show');
        // Remove all highlighted items
        this.elements.autocompleteSuggestions
            .querySelectorAll('.highlighted')
            .forEach(item => item.classList.remove('highlighted'));
    }
    
    /**
     * Handle search form submission
     */
    handleSearchSubmit() {
        const query = this.elements.searchInput.value.trim();
        if (!query) return;
        
        const suggestions = this.searchDestinations(query);
        if (suggestions.length > 0) {
            this.selectDestination(suggestions[0].id);
        }
    }
    
    /**
     * Handle category selection
     */
    handleCategorySelect(category) {
        if (!this.state.libraryData) return;
        
        const categoryMap = {
            'restroom': ['restroom', 'bathroom', 'wc'],
            'study': ['study', 'group room'],
            'computer': ['computer', 'lab', 'tech', 'printing']
        };
        
        const keywords = categoryMap[category] || [];
        const matchingNodes = this.state.libraryData.nodes.filter(node => {
            if (node.type !== 'destination') return false;
            
            return keywords.some(keyword => 
                node.search_keywords && 
                node.search_keywords.some(sk => 
                    sk.toLowerCase().includes(keyword.toLowerCase())
                ) ||
                node.name.toLowerCase().includes(keyword.toLowerCase())
            );
        });
        
        if (matchingNodes.length === 1) {
            // If only one match, select it directly
            this.selectDestination(matchingNodes[0].id);
        } else if (matchingNodes.length > 1) {
            // Show multiple options
            this.displaySuggestions(matchingNodes);
            this.elements.searchInput.focus();
        }
    }
    
    /**
     * Select a destination and generate route
     */
    selectDestination(nodeId) {
        const destination = this.state.libraryData.nodes.find(node => node.id === nodeId);
        if (!destination) {
            console.error('Destination not found:', nodeId);
            return;
        }
        
        this.state.selectedDestination = destination;
        this.hideSuggestions();
        
        // Generate route
        const route = this.generateRoute('F1_KIOSK_A', nodeId);
        if (route) {
            this.state.currentRoute = route;
            this.displayRoute(route);
            this.showDirectionsView();
        } else {
            console.error('Could not generate route to:', destination.name);
            // Could show an error message to the user here
        }
    }
    
    /**
     * Generate route between two nodes
     */
    generateRoute(startId, endId) {
        if (!this.state.libraryData || !this.state.libraryData.paths) {
            console.error('Library data or paths not available');
            return null;
        }
        
        const routeKey = `${startId}-${endId}`;
        const route = this.state.libraryData.paths[routeKey];
        
        if (!route) {
            console.error('No pre-calculated route found for:', routeKey);
            return null;
        }
        
        return route;
    }
    
    /**
     * Display route directions
     */
    displayRoute(route) {
        const container = this.elements.directionsList;
        const destination = this.state.selectedDestination;
        
        // Update route header
        this.elements.routeTitle.textContent = `Directions to ${destination.name}`;
        this.elements.routeDescription.textContent = 
            `From Main Entrance Kiosk to ${destination.name} (Floor ${destination.floor})`;
        
        // Clear previous directions
        container.innerHTML = '';
        
        // Add each step
        route.forEach((step, index) => {
            const stepElement = this.createDirectionStep(step, index + 1);
            container.appendChild(stepElement);
        });
        
        // Generate QR code for mobile handoff (desktop only)
        if (!this.state.isMobileView) {
            this.generateQRCode();
        }
        
        // Highlight route on map
        this.highlightRouteOnMap(route);
        
        // Setup scroll-based floor switching for mobile
        if (this.state.isMobileView) {
            setTimeout(() => {
                this.setupScrollBasedFloorSwitching();
            }, 100); // Small delay to ensure DOM is ready
        }
    }
    
    /**
     * Create a direction step element
     */
    createDirectionStep(step, number) {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'direction-step';
        stepDiv.dataset.stepNumber = number;
        stepDiv.dataset.floor = step.floor || 1;
        
        if (step.type === 'floor_change') {
            stepDiv.classList.add('floor-change-step');
            stepDiv.dataset.nextFloor = step.next_floor;
            stepDiv.innerHTML = `
                <div class="step-number">${number}</div>
                <div class="step-content">
                    <div class="step-instruction">
                        <span class="floor-change-icon">${step.instruction.includes('up') ? '⬆️' : '⬇️'}</span>
                        ${step.instruction}
                    </div>
                    ${this.state.isMobileView ? `
                        <div class="floor-switch-mobile">
                            <small>📱 Scroll to this step to view Floor ${step.next_floor}</small>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            stepDiv.innerHTML = `
                <div class="step-number">${number}</div>
                <div class="step-content">
                    <div class="step-instruction">${step.instruction}</div>
                    <div class="step-landmark">
                        Placeholder for ${step.landmark_photo || 'landmark photo'}
                    </div>
                </div>
            `;
        }
        
        // Set up scroll-based floor switching observation
        if (this.state.isMobileView && step.floor) {
            stepDiv.dataset.targetFloor = step.next_floor || step.floor;
        }
        
        return stepDiv;
    }
    
    /**
     * Setup scroll-based floor switching using Intersection Observer
     */
    setupScrollBasedFloorSwitching() {
        if (!this.state.isMobileView) return;
        
        // Create intersection observer
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                    const stepElement = entry.target;
                    const targetFloor = parseInt(stepElement.dataset.targetFloor);
                    const stepNumber = parseInt(stepElement.dataset.stepNumber);
                    
                    if (targetFloor && targetFloor !== this.state.currentFloor) {
                        // Add a small delay to prevent rapid switching
                        clearTimeout(this.floorSwitchTimeout);
                        this.floorSwitchTimeout = setTimeout(() => {
                            this.switchFloor(targetFloor);
                            this.showFloorSwitchNotification(targetFloor);
                        }, 200);
                    }
                    
                    // Highlight active step
                    this.highlightActiveStep(stepNumber);
                }
            });
        }, {
            threshold: 0.5,
            rootMargin: '-20% 0px -20% 0px' // Only trigger when step is well within viewport
        });
        
        // Observe all direction steps
        document.querySelectorAll('.direction-step[data-target-floor]').forEach(step => {
            observer.observe(step);
        });
        
        // Store observer for cleanup
        this.scrollObserver = observer;
    }
    
    /**
     * Highlight the active step
     */
    highlightActiveStep(stepNumber) {
        // Remove previous highlights
        document.querySelectorAll('.direction-step.active').forEach(el => {
            el.classList.remove('active');
        });
        
        // Add highlight to clicked step
        const activeStep = document.querySelector(`[data-step-number="${stepNumber}"]`);
        if (activeStep) {
            activeStep.classList.add('active');
        }
    }
    
    /**
     * Show floor switch notification
     */
    showFloorSwitchNotification(floor) {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.className = 'floor-switch-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">🔄</span>
                <span class="notification-text">Switching to Floor ${floor}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 50);
        
        // Remove after 2 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 2000);
    }
    
    /**
     * Switch between floor views
     */
    switchFloor(floor) {
        if (this.state.currentFloor === floor) return;
        
        this.state.currentFloor = floor;
        
        // Update active button
        this.elements.floorBtns.forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.floor) === floor);
        });
        
        // Load floor map
        this.loadFloorMap(floor);
        
        // Re-highlight route if active
        if (this.state.currentRoute) {
            setTimeout(() => {
                this.highlightRouteOnMap(this.state.currentRoute);
            }, 100);
        }
    }
    
    /**
     * Load SVG map for specific floor
     */
    loadFloorMap(floor) {
        if (!this.floorMaps || !this.floorMaps[floor]) {
            console.error('Floor map not available:', floor);
            return;
        }
        
        const wrapper = this.elements.mapWrapper;
        wrapper.innerHTML = this.floorMaps[floor];
        
        const svg = wrapper.querySelector('svg');
        if (svg) {
            svg.classList.add('map-svg');
            // Re-initialize pan/zoom
            setTimeout(() => {
                this.setupMapInteraction();
            }, 50);
        }
    }
    
    /**
     * Setup map pan/zoom interaction
     */
    setupMapInteraction() {
        const svg = this.elements.mapWrapper.querySelector('svg');
        if (!svg || !window.Panzoom) return;
        
        // Destroy existing panzoom instance
        if (this.state.panzoomInstance) {
            this.state.panzoomInstance.destroy();
        }
        
        // Create new panzoom instance
        this.state.panzoomInstance = Panzoom(svg, {
            maxScale: 3,
            minScale: 0.5,
            contain: 'outside',
            cursor: 'grab'
        });
        
        // Enable mouse wheel zooming
        svg.parentElement.addEventListener('wheel', (e) => {
            if (!e.ctrlKey) return;
            e.preventDefault();
            this.state.panzoomInstance.zoomWithWheel(e);
        });
    }
    
    /**
     * Zoom in on map
     */
    zoomIn() {
        if (this.state.panzoomInstance) {
            this.state.panzoomInstance.zoomIn();
        }
    }
    
    /**
     * Zoom out on map
     */
    zoomOut() {
        if (this.state.panzoomInstance) {
            this.state.panzoomInstance.zoomOut();
        }
    }
    
    /**
     * Highlight route on the map
     */
    highlightRouteOnMap(route) {
        const svg = this.elements.mapWrapper.querySelector('svg');
        if (!svg) return;
        
        // First, clear any existing route highlights
        this.clearRouteHighlights();
        
        // Filter steps for current floor only
        const currentFloorSteps = route.filter(step => {
            // Show floor change steps on their starting floor, other steps on their designated floor
            const stepFloor = step.type === 'floor_change' ? step.floor : (step.floor || 1);
            return stepFloor === this.state.currentFloor;
        });
        
        if (currentFloorSteps.length === 0) return;
        
        console.log('Highlighting route on floor', this.state.currentFloor, 'with steps:', currentFloorSteps);
        
        // Highlight each path segment
        currentFloorSteps.forEach((step, index) => {
            if (step.path_id) {
                const pathElement = svg.querySelector(`#${step.path_id}`);
                if (pathElement) {
                    // Make the path visible and styled
                    pathElement.classList.add('route-path');
                    pathElement.style.stroke = '#fbbf24'; // Gold color
                    pathElement.style.strokeWidth = '8';
                    pathElement.style.strokeDasharray = '12,6';
                    pathElement.style.strokeLinecap = 'round';
                    pathElement.style.strokeLinejoin = 'round';
                    pathElement.style.opacity = '0.9';
                    pathElement.style.fill = 'none';
                    
                    // Add animation
                    pathElement.style.animation = 'dash 3s linear infinite';
                    
                    console.log('Highlighted path:', step.path_id);
                } else {
                    console.warn('Path not found:', step.path_id);
                }
            }
        });
        
        // Add start and end markers
        this.addRouteMarkers(route);
    }
    
    /**
     * Add start and end markers to the route
     */
    addRouteMarkers(route) {
        const svg = this.elements.mapWrapper.querySelector('svg');
        if (!svg) return;
        
        // Find start and end positions (simplified - using known kiosk and destination positions)
        const startMarker = svg.querySelector('#F1_KIOSK_A');
        if (startMarker) {
            const marker = startMarker.cloneNode(true);
            marker.id = 'route-start-marker';
            marker.classList.add('route-start');
            marker.style.fill = '#06d6a0';
            marker.style.stroke = '#ffffff';
            marker.style.strokeWidth = '3';
            marker.style.animation = 'pulse 2s infinite';
            svg.appendChild(marker);
        }
        
        // Add end marker if on the destination floor
        const destination = this.state.selectedDestination;
        if (destination && destination.floor === this.state.currentFloor) {
            const endMarker = svg.querySelector(`#F${destination.floor}_${destination.id.split('_').slice(1).join('_')}_DEST`);
            if (endMarker) {
                const marker = endMarker.cloneNode(true);
                marker.id = 'route-end-marker';
                marker.classList.add('route-end');
                marker.style.fill = '#f59e0b';
                marker.style.stroke = '#ffffff';
                marker.style.strokeWidth = '3';
                marker.style.animation = 'pulse 2s infinite alternate';
                svg.appendChild(marker);
            }
        }
    }
    
    /**
     * Generate QR code for mobile handoff
     */
    generateQRCode() {
        if (!window.QRCode || !this.elements.qrcode) return;
        
        const destination = this.state.selectedDestination;
        if (!destination) return;
        
        const url = `${this.config.apiBaseUrl}${window.location.pathname}?start=F1_KIOSK_A&end=${destination.id}`;
        
        // Clear previous QR code
        this.elements.qrcode.innerHTML = '';
        
        try {
            // Generate new QR code using QRCode.js
            const qrcode = new QRCode(this.elements.qrcode, {
                text: url,
                width: this.config.qrCodeSize,
                height: this.config.qrCodeSize,
                colorDark: '#1e3a8a',  // Navy blue
                colorLight: '#ffffff', // White
                correctLevel: QRCode.CorrectLevel.H
            });
            
            console.log('QR code generated successfully for URL:', url);
        } catch (error) {
            console.error('QR code generation failed:', error);
            
            // Fallback: display the URL as text
            this.elements.qrcode.innerHTML = `
                <div style="padding: 20px; text-align: center; font-size: 12px; word-break: break-all;">
                    <p>QR Code generation failed</p>
                    <p><strong>URL:</strong><br>${url}</p>
                </div>
            `;
        }
    }
    
    /**
     * Check URL parameters for mobile handoff
     */
    checkUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const startId = urlParams.get('start');
        const endId = urlParams.get('end');
        
        if (startId && endId) {
            // This is a mobile handoff - show directions immediately
            this.selectDestination(endId);
        }
    }
    
    /**
     * Show selection view
     */
    showSelectionView() {
        this.elements.selectionView.style.display = 'block';
        this.elements.directionsView.style.display = 'none';
        
        // Clear search
        this.elements.searchInput.value = '';
        this.hideSuggestions();
        
        // Clear route state
        this.state.selectedDestination = null;
        this.state.currentRoute = null;
        
        // Remove route highlights
        this.clearRouteHighlights();
        
        // Always return to Floor 1 (where "You are here" kiosk is located)
        if (this.state.currentFloor !== 1) {
            this.switchFloor(1);
        }
        
        // Cleanup scroll observer
        if (this.scrollObserver) {
            this.scrollObserver.disconnect();
            this.scrollObserver = null;
        }
        
        // Clear any pending floor switch timeout
        if (this.floorSwitchTimeout) {
            clearTimeout(this.floorSwitchTimeout);
        }
    }
    
    /**
     * Show directions view
     */
    showDirectionsView() {
        this.elements.selectionView.style.display = 'none';
        this.elements.directionsView.style.display = 'block';
    }
    
    /**
     * Clear route highlights from map
     */
    clearRouteHighlights() {
        const svg = this.elements.mapWrapper.querySelector('svg');
        if (svg) {
            // Remove route styling from paths
            svg.querySelectorAll('.route-path').forEach(el => {
                el.classList.remove('route-path');
                el.style.stroke = 'transparent';
                el.style.strokeWidth = '';
                el.style.strokeDasharray = '';
                el.style.opacity = '';
                el.style.animation = '';
            });
            
            // Remove route markers
            svg.querySelectorAll('#route-start-marker, #route-end-marker').forEach(el => el.remove());
            svg.querySelectorAll('.route-start, .route-end').forEach(el => el.remove());
        }
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        const wasMobile = this.state.isMobileView;
        this.state.isMobileView = window.innerWidth <= 768;
        
        // Re-setup map interaction if layout changed
        if (wasMobile !== this.state.isMobileView) {
            setTimeout(() => {
                this.setupMapInteraction();
            }, 100);
        }
    }
    
    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.style.display = 'none';
        }
        this.state.isLoading = false;
    }
    
    /**
     * Show error screen
     */
    showErrorScreen() {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.style.display = 'none';
        }
        if (this.elements.errorScreen) {
            this.elements.errorScreen.style.display = 'flex';
        }
    }
    
    /**
     * Utility: Debounce function calls
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.wayfinderApp = new WayfinderApp();
});

// Expose app to global scope for debugging
window.WayfinderApp = WayfinderApp;
