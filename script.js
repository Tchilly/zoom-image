class FullscreenImageZoom {
    constructor() {
        this.imageElement = document.querySelector('.image-container img');
        this.container = document.querySelector('.image-container');
        
        // Configuration
        this.minZoom = 0.5;
        this.maxZoom = 5;
        this.zoomStep = 0.5;
        
        // State
        this.currentZoom = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.initialScale = 1;
        
        // Touch/drag state
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.lastTouchDistance = 0;
        this.touchStartX = 0;
        this.touchStartY = 0;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.calculateInitialScale();
        this.updateTransform();
        this.updateButtons();
    }
    
    /**
     * Determines the initial scale needed to make the image cover the entire viewport.
     * Works by comparing container and image dimensions, then picking the larger scale
     * factor to ensure no empty space around the image. This creates a "cover" effect
     * rather than "contain" which would leave black bars.
     */
    calculateInitialScale() {
        const containerRect = this.container.getBoundingClientRect();
        const imgRect = this.imageElement.getBoundingClientRect();
        
        const scaleX = containerRect.width / imgRect.width;
        const scaleY = containerRect.height / imgRect.height;
        
        // Use the larger scale to cover the screen
        this.initialScale = Math.max(scaleX, scaleY);
        this.currentZoom = this.initialScale;
    }
      /**
     * Hooks up all the event listeners for desktop and mobile interactions.
     * We're using event delegation and capturing patterns to handle everything from
     * button clicks to complex touch gestures. The key here is attaching mouse events
     * to the document level so we can track drags even when the cursor leaves the container.
     */
    setupEventListeners() {
        const zoomInBtn = document.querySelector('.zoom-controls .zoom-btn:first-child');
        const zoomOutBtn = document.querySelector('.zoom-controls .zoom-btn:nth-child(2)');
        const resetBtn = document.querySelector('.reset-btn');
        const closeBtn = document.querySelector('.close-btn');
        
        zoomInBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.zoomIn();
        });
        zoomOutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.zoomOut();
        });
        resetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.reset();
        });
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.close();
        });
        
        // Mouse events for desktop - attach to container, not image
        this.container.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', (e) => this.endDrag(e));
        
        this.container.addEventListener('wheel', (e) => this.handleWheel(e));
        
        this.container.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.container.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.container.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // Prevent context menu
        this.container.addEventListener('contextmenu', (e) => e.preventDefault());
        
        this.preventBrowserZoom();
    }
      /**
     * Blocks browser-level zoom commands that would interfere with our custom zoom.
     * We intercept both keyboard shortcuts (Ctrl+/-/0) and wheel+modifier combos.
     * The passive:false is crucial here - without it, preventDefault won't work on wheel events.
     */
    preventBrowserZoom() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '0')) {
                e.preventDefault();
            }
        });
        
        document.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
            }
        }, { passive: false });
    }
      /**
     * Initiates mouse drag for desktop panning. We calculate the offset between cursor
     * position and current translation to maintain smooth dragging regardless of where
     * you click on the image. Uses element event delegation to avoid button conflicts.
     * @param {MouseEvent} e - The mousedown event
     */
    startDrag(e) {
        // Don't start drag if clicking on buttons
        if (e.target.closest('.close-btn') || e.target.closest('.zoom-controls')) {
            return;
        }
        
        e.preventDefault();
        this.isDragging = true;
        this.startX = e.clientX - this.translateX;
        this.startY = e.clientY - this.translateY;
        
        this.imageElement.classList.add('dragging');
        document.body.style.cursor = 'grabbing';
    }
    
    /**
     * Handles mouse movement during drag operation. The math here subtracts the
     * initial click offset to make dragging feel natural - as if you grabbed the
     * exact spot you clicked on and it sticks to your cursor.
     * @param {MouseEvent} e - The mousemove event
     */
    drag(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        this.translateX = e.clientX - this.startX;
        this.translateY = e.clientY - this.startY;
        this.updateTransform();
    }
    
    endDrag(e) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.imageElement.classList.remove('dragging');
        document.body.style.cursor = '';
    }
      /**
     * Mouse wheel zoom handler that translates wheel movement into zoom changes.
     * We invert the deltaY because wheel down should zoom out (negative delta = zoom out).
     * The zoom happens at the cursor position for intuitive zooming behavior.
     * @param {WheelEvent} e - The wheel event
     */
    handleWheel(e) {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? -this.zoomStep : this.zoomStep;
        this.zoomToPoint(e.clientX, e.clientY, delta);
    }
      /**
     * Handles the start of touch interactions on mobile devices. Single finger initiates
     * panning, while two fingers start a pinch gesture. We store the midpoint between
     * fingers and initial distance to calculate scaling during movement.
     * @param {TouchEvent} e - The touchstart event
     */
    handleTouchStart(e) {
        // Don't handle touch on buttons
        if (e.target.closest('.close-btn') || e.target.closest('.zoom-controls')) {
            return;
        }
        
        if (e.touches.length === 1) {
            // Single touch - start panning
            this.isDragging = true;
            this.startX = e.touches[0].clientX - this.translateX;
            this.startY = e.touches[0].clientY - this.translateY;
            this.imageElement.classList.add('dragging');
        } else if (e.touches.length === 2) {
            // Two finger pinch
            e.preventDefault();
            this.isDragging = false;
            this.imageElement.classList.remove('dragging');
            
            this.touchStartX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            this.touchStartY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            this.lastTouchDistance = this.getTouchDistance(e);
        }
    }
    
    /**
     * Processes touch movement for either panning or pinch-to-zoom. For pinching,
     * we continuously calculate the distance ratio between fingers to determine
     * zoom level, and use the midpoint between fingers as the zoom origin.
     * @param {TouchEvent} e - The touchmove event
     */
    handleTouchMove(e) {
        if (e.touches.length === 1 && this.isDragging) {
            // Single touch - pan
            e.preventDefault();
            this.translateX = e.touches[0].clientX - this.startX;
            this.translateY = e.touches[0].clientY - this.startY;
            this.updateTransform();
        } else if (e.touches.length === 2) {
            // Two finger pinch
            e.preventDefault();
            
            const currentDistance = this.getTouchDistance(e);
            const scale = currentDistance / this.lastTouchDistance;
            
            const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            
            const deltaZoom = (scale - 1) * this.currentZoom;
            this.zoomToPoint(centerX, centerY, deltaZoom);
            
            this.lastTouchDistance = currentDistance;
        }
    }
    
    handleTouchEnd(e) {
        this.isDragging = false;
        this.imageElement.classList.remove('dragging');
    }
    
    getTouchDistance(e) {
        return Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
    }
    
    // Zoom functions
    zoomIn() {
        const newZoom = Math.min(this.currentZoom + this.zoomStep, this.maxZoom);
        this.setZoom(newZoom);
    }
    
    zoomOut() {
        const newZoom = Math.max(this.currentZoom - this.zoomStep, this.minZoom);
        this.setZoom(newZoom);
    }
    
    setZoom(zoom) {
        this.currentZoom = zoom;
        this.updateTransform();
        this.updateButtons();
    }
      /**
     * This is where the zoom-to-point magic happens. We calculate the offset from
     * the zoom point to the center, then adjust our translation to keep that point
     * visually stable during zoom. It's like pinning a spot on the image while
     * everything else scales around it.
     * @param {number} clientX - X coordinate of zoom origin (screen space)
     * @param {number} clientY - Y coordinate of zoom origin (screen space)
     * @param {number} deltaZoom - Amount to zoom in/out
     */
    zoomToPoint(clientX, clientY, deltaZoom) {
        const rect = this.container.getBoundingClientRect();
        const x = clientX - rect.left - rect.width / 2;
        const y = clientY - rect.top - rect.height / 2;
        
        const newZoom = Math.min(Math.max(this.currentZoom + deltaZoom, this.minZoom), this.maxZoom);
        const zoomRatio = newZoom / this.currentZoom;
        
        this.translateX = this.translateX - (x * (zoomRatio - 1));
        this.translateY = this.translateY - (y * (zoomRatio - 1));
        
        this.currentZoom = newZoom;
        this.updateTransform();
        this.updateButtons();
    }
    
    reset() {
        this.currentZoom = this.initialScale;
        this.translateX = 0;
        this.translateY = 0;
        this.updateTransform();
        this.updateButtons();
    }
    
    close() {
        // You can implement close functionality here
        // For example, redirect to another page or hide the viewer
        console.log('Close fullscreen');
    }
    
    updateTransform() {
        const transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.currentZoom})`;
        this.imageElement.style.transform = transform;
    }
    
    updateButtons() {
        const zoomInBtn = document.querySelector('.zoom-controls .zoom-btn:first-child');
        const zoomOutBtn = document.querySelector('.zoom-controls .zoom-btn:nth-child(2)');
        
        zoomInBtn.disabled = this.currentZoom >= this.maxZoom;
        zoomOutBtn.disabled = this.currentZoom <= this.minZoom;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FullscreenImageZoom();
});