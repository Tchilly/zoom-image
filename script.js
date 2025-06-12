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
    
    calculateInitialScale() {
        // Calculate scale to fit/cover the screen
        const containerRect = this.container.getBoundingClientRect();
        const imgRect = this.imageElement.getBoundingClientRect();
        
        const scaleX = containerRect.width / imgRect.width;
        const scaleY = containerRect.height / imgRect.height;
        
        // Use the larger scale to cover the screen
        this.initialScale = Math.max(scaleX, scaleY);
        this.currentZoom = this.initialScale;
    }
    
    setupEventListeners() {
        // Button events
        const zoomInBtn = document.querySelector('.zoom-controls .zoom-btn:first-child');
        const zoomOutBtn = document.querySelector('.zoom-controls .zoom-btn:nth-child(2)');
        const resetBtn = document.querySelector('.reset-btn');
        const closeBtn = document.querySelector('.close-btn');
        
        zoomInBtn.addEventListener('click', () => this.zoomIn());
        zoomOutBtn.addEventListener('click', () => this.zoomOut());
        resetBtn.addEventListener('click', () => this.reset());
        closeBtn.addEventListener('click', () => this.close());
        
        // Mouse events for desktop
        this.imageElement.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.endDrag());
        
        // Wheel zoom for desktop
        this.container.addEventListener('wheel', (e) => this.handleWheel(e));
        
        // Touch events for mobile
        this.imageElement.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.imageElement.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.imageElement.addEventListener('touchend', () => this.handleTouchEnd());
        
        // Prevent context menu
        this.imageElement.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Prevent browser zoom
        this.preventBrowserZoom();
    }
    
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
    
    // Desktop mouse drag
    startDrag(e) {
        this.isDragging = true;
        this.startX = e.clientX - this.translateX;
        this.startY = e.clientY - this.translateY;
        this.imageElement.style.transition = 'none';
    }
    
    drag(e) {
        if (!this.isDragging) return;
        
        this.translateX = e.clientX - this.startX;
        this.translateY = e.clientY - this.startY;
        this.updateTransform();
    }
    
    endDrag() {
        this.isDragging = false;
        this.imageElement.style.transition = 'transform 0.2s ease-out';
    }
    
    // Desktop wheel zoom
    handleWheel(e) {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? -this.zoomStep : this.zoomStep;
        this.zoomToPoint(e.clientX, e.clientY, delta);
    }
    
    // Touch events for mobile
    handleTouchStart(e) {
        if (e.touches.length === 1) {
            // Single touch - start panning
            this.isDragging = true;
            this.startX = e.touches[0].clientX - this.translateX;
            this.startY = e.touches[0].clientY - this.translateY;
            this.imageElement.style.transition = 'none';
        } else if (e.touches.length === 2) {
            // Two finger pinch
            e.preventDefault();
            this.isDragging = false;
            
            this.touchStartX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            this.touchStartY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            this.lastTouchDistance = this.getTouchDistance(e);
        }
    }
    
    handleTouchMove(e) {
        if (e.touches.length === 1 && this.isDragging) {
            // Single touch - pan
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
    
    handleTouchEnd() {
        this.isDragging = false;
        this.imageElement.style.transition = 'transform 0.2s ease-out';
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