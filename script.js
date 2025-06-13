/**
 * FullscreenImageZoom provides intuitive image zoom and pan functionality
 * with support for both desktop and mobile interactions.
 */
class FullscreenImageZoom {
    /**
     * Create a new fullscreen image zoom instance.
     * 
     * Initializes the zoom component with Swedish design system styling
     * and sets up all necessary state for desktop and mobile interactions.
     * 
     * @constructor
     */
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

    /**
     * Initialize the zoom component.
     * 
     * Sets up event listeners and calculates the initial image scale
     * to ensure proper display across different screen sizes.
     * 
     * @return {void}
     */
    init() {        
        this.setupEventListeners();
        
        // Initialize once image is ready
        this.initializeImageScale();
    }

    /**
     * Initialize image scale once the image is ready.
     * 
     * Handles both already-loaded images and images that need to load,
     * then performs the initial setup sequence in a single elegant flow.
     * 
     * @return {void}
     */
    initializeImageScale() {
        const setupImage = () => {
            this.calculateInitialScale();
            this.updateTransform();
            this.updateButtons();
        };

        this.imageElement.complete ? setupImage() : this.imageElement.addEventListener('load', setupImage);
    }
      
    /**
     * Calculate the initial scale to make image cover viewport.
     * 
     * Determines the scale factor needed to ensure the image fills
     * the entire viewport without letterboxing (black bars).
     * Uses the larger of width/height scale ratios.
     * 
     * @return {void}
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
        
    }
    
    /**
     * Set up all event listeners for desktop and mobile interactions.
     * 
     * Configures button clicks, keyboard shortcuts, mouse events,
     * touch gestures, and accessibility features. Mouse events are
     * attached at document level to track drags outside container.
     * 
     * @return {void}
     */      
    setupEventListeners() {
        const zoomInBtn = document.querySelector('[data-action="zoom-in"]');
        const zoomOutBtn = document.querySelector('[data-action="zoom-out"]');
        const resetBtn = document.querySelector('[data-action="reset"]');
        const closeBtn = document.querySelector('[data-action="close"]');
        
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
     * Prevent browser zoom shortcuts from interfering.
     * 
     * Blocks Ctrl+/-/0 keyboard shortcuts and Ctrl+wheel events
     * to prevent browser zoom from conflicting with custom zoom.
     * Uses passive:false to enable preventDefault on wheel events.
     * 
     * @return {void}
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
     * Handle keyboard navigation and accessibility shortcuts.
     * 
     * Supports zoom shortcuts (+, -, 0), navigation arrows,
     * and escape key. Provides screen reader announcements
     * for accessibility compliance.
     * 
     * @param {KeyboardEvent} e - The keyboard event object
     * @return {void}
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
     * Initiate mouse drag for desktop panning.
     * 
     * Calculates the offset between cursor position and current
     * translation to maintain smooth dragging behavior regardless
     * of click position. Excludes button elements from drag events.
     * 
     * @param {MouseEvent} e - The mouse down event object
     * @return {void}
     */    
    startDrag(e) {
        // Don't start drag if clicking on buttons
        if (e.target.closest('[data-action]') || e.target.closest('.zoom-controls')) {
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
     * Handle mouse movement during drag operation.
     * 
     * Updates image translation based on cursor movement while
     * maintaining the initial click offset for natural dragging feel.
     * 
     * @param {MouseEvent} e - The mouse move event object
     * @return {void}
     */
    drag(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        this.translateX = e.clientX - this.startX;
        this.translateY = e.clientY - this.startY;
        this.updateTransform();
    }
    
    /**
     * End mouse drag operation.
     * 
     * Cleans up drag state, removes visual indicators,
     * and restores default cursor.
     * 
     * @param {MouseEvent} e - The mouse up event object
     * @return {void}
     */
    endDrag(e) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.imageElement.classList.remove('dragging');
        document.body.style.cursor = '';
    }
    
    /**
     * Handle mouse wheel zoom with cursor tracking.
     * 
     * Translates wheel movement into zoom changes, with zoom
     * occurring at the cursor position for intuitive behavior.
     * Inverts deltaY so wheel down zooms out.
     * 
     * @param {WheelEvent} e - The wheel event object
     * @return {void}
     */
    handleWheel(e) {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? -this.zoomStep : this.zoomStep;
        this.zoomToPoint(e.clientX, e.clientY, delta);
    }
    
    /**
     * Handle touch start for mobile panning and pinch gestures.
     * 
     * Single finger initiates panning, two fingers start pinch-to-zoom.
     * Stores initial touch state and converts pinch center to image
     * percentage coordinates for accurate zoom tracking.
     * 
     * @param {TouchEvent} e - The touch start event object
     * @return {void}
     */    
    handleTouchStart(e) {
        // Don't handle touch on buttons
        if (e.target.closest('[data-action]') || e.target.closest('.zoom-controls')) {
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
     * Handle touch movement for panning and pinch-to-zoom.
     * 
     * Processes single-finger panning or two-finger pinch gestures.
     * Uses initial pinch state to maintain consistent zoom center
     * throughout the gesture, similar to iPhone behavior.
     * 
     * @param {TouchEvent} e - The touch move event object
     * @return {void}
     */
    handleTouchMove(e) {
        // Single touch - pan
        if (e.touches.length === 1 && this.isDragging) {
            e.preventDefault();
            this.translateX = e.touches[0].clientX - this.startX;
            this.translateY = e.touches[0].clientY - this.startY;
            this.updateTransform();       
            
        // Two finger pinch    
        } else if (e.touches.length === 2) {
            
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
    
    /**
     * End touch interaction and clean up state.
     * 
     * Resets drag state and removes visual indicators
     * when touch interaction completes.
     * 
     * @param {TouchEvent} e - The touch end event object
     * @return {void}
     */
    handleTouchEnd(e) {
        this.isDragging = false;
        this.imageElement.classList.remove('dragging');
    }
    
    /**
     * Calculate distance between two touch points.
     * 
     * Uses Pythagorean theorem to determine the distance
     * between two fingers for pinch gesture scaling.
     * 
     * @param {TouchEvent} e - Touch event with at least 2 touches
     * @return {number} Distance between touch points in pixels
     */
    getTouchDistance(e) {
        return Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
    }
      
    /**
     * Zoom in by configured step amount.
     * 
     * Increases zoom level by zoomStep while respecting
     * maximum zoom limits. Zooms toward the center of the viewport.
     * Announces change for accessibility.
     * 
     * @return {void}
     */

    zoomIn() {
        // Calculate viewport center coordinates
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        // Use zoomToPoint to zoom toward viewport center
        this.zoomToPoint(centerX, centerY, this.zoomStep);
        this.announceZoom();
    }
    
    /**
     * Zoom out by configured step amount.
     * 
     * Decreases zoom level by zoomStep while respecting
     * minimum zoom limits. Zooms away from the center of the viewport.
     * Announces change for accessibility.
     * 
     * @return {void}
     */
    zoomOut() {
        // Calculate viewport center coordinates
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        // Use zoomToPoint to zoom away from viewport center
        this.zoomToPoint(centerX, centerY, -this.zoomStep);
        this.announceZoom();
    }
    
    /**
     * Set zoom level to specific value.
     * 
     * Updates the current zoom level and refreshes
     * the transform and button states accordingly.
     * 
     * @param {number} zoom - The target zoom level
     * @return {void}
     */
    setZoom(zoom) {
        this.currentZoom = zoom;
        this.updateTransform();
        this.updateButtons();
    }    
    
    /**
     * Convert screen coordinates to image percentage coordinates.
     * 
     * Transforms screen-space coordinates to image-relative percentages (0-1)
     * by accounting for current zoom and translation. This enables accurate
     * zoom-to-point functionality regardless of current image state.
     * 
     * @param {number} clientX - Screen X coordinate
     * @param {number} clientY - Screen Y coordinate
     * @return {Object} Coordinates as percentages: {x: number, y: number}
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
     * Convert image percentage coordinates back to screen coordinates.
     * 
     * Transforms image-relative percentages to screen-space coordinates
     * using specified zoom and translation values. Used for positioning
     * calculations during zoom operations.
     * 
     * @param {number} percentX - X percentage (0-1) of image width
     * @param {number} percentY - Y percentage (0-1) of image height
     * @param {number} zoom - Zoom level to use for calculation
     * @param {number} translateX - X translation to apply
     * @param {number} translateY - Y translation to apply
     * @return {Object} Screen coordinates relative to container center: {x: number, y: number}
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
     * Zoom to a specific point with percentage-based coordinate tracking.
     * 
     * Implements precise zoom-to-point functionality by converting screen
     * coordinates to image percentages, applying zoom change, then repositioning
     * to keep the same image area under the cursor/finger.
     * 
     * @param {number} clientX - X coordinate of zoom origin in screen space
     * @param {number} clientY - Y coordinate of zoom origin in screen space
     * @param {number} deltaZoom - Amount to zoom in (+) or out (-)
     * @return {void}
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
    
    /**
     * Reset zoom and position to initial state.
     * 
     * Restores the image to its initial scale and centered position,
     * effectively returning to the default view state.
     * 
     * @return {void}
     */
    reset() {
        this.currentZoom = this.initialScale;
        this.translateX = 0;
        this.translateY = 0;
        this.updateTransform();
        this.updateButtons();
        this.announceZoom();
    }
    
    /**
     * Close the fullscreen image viewer.
     * 
     * Attempts to close the current window/tab. In production,
     * this might trigger a modal close or navigation event.
     * 
     * @return {void}
     */
    close() {
        // This closes the fullscreen view.
        window.close();
    }
      
    /**
     * Calculate the allowed translation bounds based on current zoom level.
     * 
     * Determines the maximum and minimum translation values that will keep
     * at least some part of the image visible within the viewport. For zoom
     * levels below initial scale, constrains to center. For higher zoom levels,
     * allows panning but prevents image from going completely out of bounds.
     * 
     * @return {Object} Bounds object: {minX, maxX, minY, maxY}
     */    
    calculateBounds() {
        // Get container dimensions
        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight;
        
        // Get scaled image dimensions
        const scaledWidth = this.imageElement.naturalWidth * this.currentZoom;
        const scaledHeight = this.imageElement.naturalHeight * this.currentZoom;
        
        let minX, maxX, minY, maxY;
        
        // Always calculate bounds based on whether the scaled image is larger than the container
        // not based on zoom level relative to initial scale
        
        // Ensure at least 100px of image remains visible on each side when panning is allowed
        const minVisibleArea = 100;
        
        // Calculate bounds for X axis
        if (scaledWidth <= containerWidth) {
            // Image is smaller than or equal to container width - center it
            minX = maxX = 0;
        } else {
            // Image is larger than container - allow panning but keep some visible
            const halfScaledWidth = scaledWidth / 2;
            const halfContainerWidth = containerWidth / 2;
            const maxDistanceX = halfScaledWidth - halfContainerWidth;
            const constrainedMaxX = Math.max(maxDistanceX - minVisibleArea, 0);
            
            minX = -constrainedMaxX;
            maxX = constrainedMaxX;
        }
        
        // Calculate bounds for Y axis
        if (scaledHeight <= containerHeight) {
            // Image is smaller than or equal to container height - center it
            minY = maxY = 0;
        } else {
            // Image is larger than container - allow panning but keep some visible
            const halfScaledHeight = scaledHeight / 2;
            const halfContainerHeight = containerHeight / 2;
            const maxDistanceY = halfScaledHeight - halfContainerHeight;
            const constrainedMaxY = Math.max(maxDistanceY - minVisibleArea, 0);
            
            minY = -constrainedMaxY;
            maxY = constrainedMaxY;
        }
        
        return { minX, maxX, minY, maxY };
    }
    
    /**
     * Constrain translation values to stay within calculated bounds.
     * 
     * Applies bounds checking to current translateX and translateY values
     * to ensure the image doesn't go completely out of view. Updates
     * the instance translation properties with constrained values.
     * 
     * @return {void}
     */
    constrainTranslation() {
        const bounds = this.calculateBounds();
        
        this.translateX = Math.max(bounds.minX, Math.min(bounds.maxX, this.translateX));
        this.translateY = Math.max(bounds.minY, Math.min(bounds.maxY, this.translateY));
    }
    
    /**
     * Apply current zoom and translation to image element.
     * 
     * Updates the CSS transform property with current translation
     * and scale values to visually update the image position.
     * Applies bounds checking before updating transform.
     * 
     * @return {void}
     */
    updateTransform() {
        // Apply bounds checking to prevent image from going out of bounds
        this.constrainTranslation();
        
        const transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.currentZoom})`;
        this.imageElement.style.transform = transform;
    }
    
    /**
     * Update zoom control button states.
     * 
     * Enables/disables zoom in and zoom out buttons based on
     * current zoom level relative to min/max limits.
     * 
     * @return {void}
     */    
    updateButtons() {
        const zoomInBtn = document.querySelector('[data-action="zoom-in"]');
        const zoomOutBtn = document.querySelector('[data-action="zoom-out"]');
        
        zoomInBtn.disabled = this.currentZoom >= this.maxZoom;
        zoomOutBtn.disabled = this.currentZoom <= this.minZoom;
    }
    
    /**
     * Announce zoom level changes for screen readers.
     * 
     * Converts current zoom to percentage relative to initial scale
     * and announces it in Swedish for accessibility compliance.
     * 
     * @return {void}
     */
    announceZoom() {
        const announcer = document.getElementById('zoom-announcer');
        const percentage = Math.round((this.currentZoom / this.initialScale) * 100);
        announcer.textContent = `Zoom: ${percentage}%`;
    }
    
    /**
     * Announce position changes for keyboard navigation.
     * 
     * Provides Swedish language feedback to screen readers
     * when users navigate with arrow keys for accessibility.
     * 
     * @return {void}
     */
    announcePosition() {
        const announcer = document.getElementById('zoom-announcer');
        announcer.textContent = 'Bildposition ändrad';
    }
}

/**
 * Initialize the fullscreen image zoom when DOM is ready.
 * 
 * Creates a new FullscreenImageZoom instance once the document
 * has finished loading to ensure all elements are available.
 */
document.addEventListener('DOMContentLoaded', () => {
    new FullscreenImageZoom();
});