class FullscreenImageZoom {
    constructor() {
        this.imageElement = document.querySelector('.image-container img');
        this.container = document.querySelector('.image-container');
        
        // Configuration
        this.minZoom = 0.5;
        this.maxZoom = 5;
        this.zoomStep = 0.5;
        this.absoluteMinZoom = 0.25; // Hard minimum to prevent extreme zoom out
        
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
          // Pinch gesture state
        this.initialPinchCenter = { x: 0, y: 0 };
        this.initialPinchImagePercent = { x: 0.5, y: 0.5 };
        this.initialPinchZoom = 1;
        this.initialPinchTranslate = { x: 0, y: 0 };
        
        this.init();
    }
      init() {
        this.setupEventListeners();
        
        // Wait for image to load before calculating scale
        if (this.imageElement.complete) {
            this.calculateInitialScale();
            this.updateTransform();
            this.updateButtons();
        } else {
            this.imageElement.addEventListener('load', () => {
                this.calculateInitialScale();
                this.updateTransform();
                this.updateButtons();
            });
        }
    }
    
    /**
     * Determines the initial scale needed to make the image cover the entire viewport.
     * Works by comparing container and image dimensions, then picking the larger scale
     * factor to ensure no empty space around the image. This creates a "cover" effect
     * rather than "contain" which would leave black bars.
     */
    calculateInitialScale() {
        // Use window dimensions for more reliable mobile viewport
        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight;
        
        // Get natural image dimensions
        const imgWidth = this.imageElement.naturalWidth;
        const imgHeight = this.imageElement.naturalHeight;
        
        if (imgWidth === 0 || imgHeight === 0) {
            // Image not loaded yet, set a fallback
            this.initialScale = 1;
            this.currentZoom = 1;
            return;
        }
        
        const scaleX = containerWidth / imgWidth;
        const scaleY = containerHeight / imgHeight;
        
        // Use the larger scale to cover the screen
        this.initialScale = Math.max(scaleX, scaleY);
        this.currentZoom = this.initialScale;
        
        // Adjust minZoom to ensure we can always zoom from initial scale
        // Use the smaller of: configured minZoom or initialScale, but never below absoluteMinZoom
        this.minZoom = Math.max(Math.min(0.5, this.initialScale), this.absoluteMinZoom);
        
        console.log('Initial scale calculated:', {
            containerWidth,
            containerHeight,
            imgWidth,
            imgHeight,
            scaleX,
            scaleY,
            initialScale: this.initialScale,
            adjustedMinZoom: this.minZoom
        });
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
        
        // Keyboard navigation support
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
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
        
        // Handle viewport changes on mobile
        window.addEventListener('resize', () => {
            this.calculateInitialScale();
            this.reset();
        });
        
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
     * Handles keyboard navigation and shortcuts for accessibility.
     * Supports standard zoom shortcuts and navigation keys.
     * @param {KeyboardEvent} e - The keyboard event
     */
    handleKeyboard(e) {
        switch(e.key) {
            case '+':
            case '=':
                e.preventDefault();
                this.zoomIn();
                break;
            case '-':
                e.preventDefault();
                this.zoomOut();
                break;
            case '0':
                e.preventDefault();
                this.reset();
                break;
            case 'Escape':
                e.preventDefault();
                this.close();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.translateX += 50;
                this.updateTransform();
                this.announcePosition();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.translateX -= 50;
                this.updateTransform();
                this.announcePosition();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.translateY += 50;
                this.updateTransform();
                this.announcePosition();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.translateY -= 50;
                this.updateTransform();
                this.announcePosition();
                break;
        }
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
            this.imageElement.classList.add('dragging');        } else if (e.touches.length === 2) {
            // Two finger pinch - initialize pinch state
            e.preventDefault();
            this.isDragging = false;
            this.imageElement.classList.remove('dragging');
            
            // Store initial pinch center as screen coordinates
            const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            
            // Convert to image percentage coordinates
            const imagePercent = this.screenToImagePercent(centerX, centerY);
            
            this.initialPinchCenter = { x: centerX, y: centerY };
            this.initialPinchImagePercent = imagePercent;
            this.initialPinchZoom = this.currentZoom;
            this.initialPinchTranslate = { x: this.translateX, y: this.translateY };
            this.lastTouchDistance = this.getTouchDistance(e);
        }
    }    
    
    /**
     * Processes touch movement for either panning or pinch-to-zoom. For pinching,
     * we use the initial pinch state to maintain consistent zoom center throughout
     * the entire gesture, similar to how iPhone handles pinch-to-zoom.
     * @param {TouchEvent} e - The touchmove event
     */
    handleTouchMove(e) {
        if (e.touches.length === 1 && this.isDragging) {
            // Single touch - pan
            e.preventDefault();
            this.translateX = e.touches[0].clientX - this.startX;
            this.translateY = e.touches[0].clientY - this.startY;
            this.updateTransform();        } else if (e.touches.length === 2) {
            // Two finger pinch
            e.preventDefault();
            
            const currentDistance = this.getTouchDistance(e);
            
            // Only process if we have a valid initial distance
            if (this.lastTouchDistance === 0) {
                return;
            }
            
            // Calculate scale factor from initial pinch distance
            const scaleFromInitial = currentDistance / this.lastTouchDistance;
            
            // Calculate new zoom level from initial state
            const newZoom = Math.min(Math.max(this.initialPinchZoom * scaleFromInitial, this.minZoom), this.maxZoom);
            
            // Get container bounds for screen coordinate calculation
            const rect = this.container.getBoundingClientRect();
            const targetScreenX = this.initialPinchCenter.x - rect.left - rect.width / 2;
            const targetScreenY = this.initialPinchCenter.y - rect.top - rect.height / 2;
            
            // Calculate where the pinched image point should be positioned
            const imgWidth = this.imageElement.naturalWidth;
            const imgHeight = this.imageElement.naturalHeight;
            
            const imageX = (this.initialPinchImagePercent.x - 0.5) * imgWidth;
            const imageY = (this.initialPinchImagePercent.y - 0.5) * imgHeight;
            
            // Calculate translation to keep the pinched point under fingers
            this.translateX = targetScreenX - (imageX * newZoom);
            this.translateY = targetScreenY - (imageY * newZoom);
            this.currentZoom = newZoom;
            
            this.updateTransform();
            this.updateButtons();
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
        this.announceZoom();
    }
    
    zoomOut() {
        const newZoom = Math.max(this.currentZoom - this.zoomStep, this.minZoom);
        this.setZoom(newZoom);
        this.announceZoom();
    }
    
    setZoom(zoom) {
        this.currentZoom = zoom;
        this.updateTransform();
        this.updateButtons();
    }    
    
    /**
     * Converts screen coordinates to image-relative coordinates (0-1 range).
     * This accounts for current zoom and translation to find what percentage 
     * of the image the user is pointing at.
     * @param {number} clientX - Screen X coordinate
     * @param {number} clientY - Screen Y coordinate
     * @returns {Object} - {x, y} as percentages (0-1) of image dimensions
     */
    screenToImagePercent(clientX, clientY) {
        const rect = this.container.getBoundingClientRect();
        
        // Get screen coordinates relative to container center
        const screenX = clientX - rect.left - rect.width / 2;
        const screenY = clientY - rect.top - rect.height / 2;
        
        // Convert to image coordinates by accounting for current transform
        const imageX = (screenX - this.translateX) / this.currentZoom;
        const imageY = (screenY - this.translateY) / this.currentZoom;
        
        // Convert to percentage of image size
        const imgWidth = this.imageElement.naturalWidth;
        const imgHeight = this.imageElement.naturalHeight;
        
        const percentX = (imageX / imgWidth) + 0.5; // +0.5 because image center is at 0,0
        const percentY = (imageY / imgHeight) + 0.5;
        
        return { x: percentX, y: percentY };
    }
    
    /**
     * Converts image percentage coordinates back to screen coordinates.
     * @param {number} percentX - X percentage (0-1) of image
     * @param {number} percentY - Y percentage (0-1) of image
     * @param {number} zoom - Zoom level to use for calculation
     * @param {number} translateX - Translation X to use
     * @param {number} translateY - Translation Y to use
     * @returns {Object} - {x, y} screen coordinates relative to container center
     */
    imagePercentToScreen(percentX, percentY, zoom, translateX, translateY) {
        const imgWidth = this.imageElement.naturalWidth;
        const imgHeight = this.imageElement.naturalHeight;
        
        // Convert percentage to image coordinates
        const imageX = (percentX - 0.5) * imgWidth;
        const imageY = (percentY - 0.5) * imgHeight;
        
        // Convert to screen coordinates
        const screenX = (imageX * zoom) + translateX;
        const screenY = (imageY * zoom) + translateY;
        
        return { x: screenX, y: screenY };
    }

    /**
     * This is where the zoom-to-point magic happens. We calculate the image percentage
     * that the user is pointing at, then adjust zoom and translation to keep that
     * exact spot under their pointer/finger.
     * @param {number} clientX - X coordinate of zoom origin (screen space)
     * @param {number} clientY - Y coordinate of zoom origin (screen space)
     * @param {number} deltaZoom - Amount to zoom in/out
     */
    zoomToPoint(clientX, clientY, deltaZoom) {
        // Convert screen coordinates to image percentage
        const imagePercent = this.screenToImagePercent(clientX, clientY);
        
        const oldZoom = this.currentZoom;
        const newZoom = Math.min(Math.max(this.currentZoom + deltaZoom, this.minZoom), this.maxZoom);
        
        // Only proceed if zoom actually changed
        if (newZoom === oldZoom) {
            return;
        }
        
        // Calculate where this image point should be on screen after zoom
        const rect = this.container.getBoundingClientRect();
        const targetScreenX = clientX - rect.left - rect.width / 2;
        const targetScreenY = clientY - rect.top - rect.height / 2;
        
        // Calculate what translation would put the image point at the target screen position
        const imgWidth = this.imageElement.naturalWidth;
        const imgHeight = this.imageElement.naturalHeight;
        
        const imageX = (imagePercent.x - 0.5) * imgWidth;
        const imageY = (imagePercent.y - 0.5) * imgHeight;
        
        this.translateX = targetScreenX - (imageX * newZoom);
        this.translateY = targetScreenY - (imageY * newZoom);
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
        this.announceZoom();
    }
    
    close() {
        // This closes the fullscreen view.
        window.close();
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
    
    /**
     * Announces zoom level changes to screen readers for accessibility.
     * Converts the zoom value to a percentage and announces it in Swedish.
     */
    announceZoom() {
        const announcer = document.getElementById('zoom-announcer');
        const percentage = Math.round((this.currentZoom / this.initialScale) * 100);
        announcer.textContent = `Zoom: ${percentage}%`;
    }
    
    /**
     * Announces position changes when navigating with arrow keys.
     * Provides feedback for keyboard users about image position.
     */
    announcePosition() {
        const announcer = document.getElementById('zoom-announcer');
        announcer.textContent = 'Bildposition ändrad';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FullscreenImageZoom();
});