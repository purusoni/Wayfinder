/**
 * Map Controller for Wayfinder Application
 */

export class MapController {
    constructor(elements) {
        this.elements = elements;
        this.panzoomInstance = null;
        this.floorMaps = {};
    }

    async loadFloorMaps() {
        try {
            const floor1Response = await fetch('./assets/floor1.svg');
            const floor2Response = await fetch('./assets/floor2.svg');

            if (!floor1Response.ok || !floor2Response.ok) {
                throw new Error('Failed to load floor maps');
            }

            this.floorMaps[1] = await floor1Response.text();
            this.floorMaps[2] = await floor2Response.text();
        } catch (error) {
            console.error('Error loading floor maps:', error);
            throw error;
        }
    }

    renderFloor(floor) {
        if (!this.floorMaps[floor]) {
            console.error('Floor map not available:', floor);
            return;
        }

        const wrapper = this.elements.mapWrapper;
        wrapper.innerHTML = this.floorMaps[floor];

        const svg = wrapper.querySelector('svg');
        if (svg) {
            svg.classList.add('map-svg');
            setTimeout(() => this.setupInteraction(), 50);
        }
    }

    setupInteraction() {
        const svg = this.elements.mapWrapper.querySelector('svg');
        if (!svg || !window.Panzoom) return;

        if (this.panzoomInstance) {
            this.panzoomInstance.destroy();
        }

        this.panzoomInstance = Panzoom(svg, {
            maxScale: 3,
            minScale: 0.5,
            contain: 'outside',
            cursor: 'grab'
        });

        svg.parentElement.addEventListener('wheel', (e) => {
            if (!e.ctrlKey) return;
            e.preventDefault();
            this.panzoomInstance.zoomWithWheel(e);
        });
    }

    zoomIn() {
        if (this.panzoomInstance) this.panzoomInstance.zoomIn();
    }

    zoomOut() {
        if (this.panzoomInstance) this.panzoomInstance.zoomOut();
    }

    highlightRoute(route, currentFloor) {
        const svg = this.elements.mapWrapper.querySelector('svg');
        if (!svg) return;

        this.clearRouteHighlights();

        const currentFloorSteps = route.filter(step => {
            const stepFloor = step.type === 'floor_change' ? step.floor : (step.floor || 1);
            return stepFloor === currentFloor;
        });

        if (currentFloorSteps.length === 0) return;

        currentFloorSteps.forEach(step => {
            if (step.path_id) {
                const pathElement = svg.querySelector(`#${step.path_id}`);
                if (pathElement) {
                    this.stylePathElement(pathElement);
                }
            }
        });

        // Markers logic would be passed here or handled by separate marker manager
    }

    stylePathElement(pathElement) {
        pathElement.classList.add('route-path');
        // Solar Strand (Gold)
        pathElement.style.stroke = '#ffc72c';
        pathElement.style.strokeWidth = '8';
        pathElement.style.strokeDasharray = '12,6';
        pathElement.style.strokeLinecap = 'round';
        pathElement.style.strokeLinejoin = 'round';
        pathElement.style.opacity = '0.9';
        pathElement.style.fill = 'none';
        pathElement.style.animation = 'dash 3s linear infinite';
    }

    addMarkers(startId, endId, currentFloor, destinationFloor) {
        const svg = this.elements.mapWrapper.querySelector('svg');
        if (!svg) return;

        // Kiosk Marker (Start) - Lake LaSalle (Teal)
        const startMarker = svg.querySelector(`#${startId}`);
        if (startMarker && currentFloor === 1) { // Assuming Kiosk is on F1
            this.cloneAndStyleMarker(svg, startMarker, 'route-start-marker', '#00a69c');
        }

        // Destination Marker (End) - UB Blue
        if (currentFloor === destinationFloor && endId) {
            const endMarker = svg.querySelector(`#${endId}`);
            if (endMarker) {
                this.cloneAndStyleMarker(svg, endMarker, 'route-end-marker', '#005bbb');
            }
        }
    }

    cloneAndStyleMarker(svg, original, newId, color) {
        const marker = original.cloneNode(true);
        marker.id = newId;
        marker.classList.add(newId.includes('start') ? 'route-start' : 'route-end');
        marker.style.fill = color;
        marker.style.stroke = '#ffffff';
        marker.style.strokeWidth = '3';
        marker.style.animation = 'pulse 2s infinite alternate';
        svg.appendChild(marker);
    }

    clearRouteHighlights() {
        const svg = this.elements.mapWrapper.querySelector('svg');
        if (svg) {
            svg.querySelectorAll('.route-path').forEach(el => {
                el.classList.remove('route-path');
                el.style.stroke = 'transparent';
                el.style.strokeWidth = '';
                el.style.animation = '';
            });
            svg.querySelectorAll('#route-start-marker, #route-end-marker').forEach(el => el.remove());
        }
    }
}
