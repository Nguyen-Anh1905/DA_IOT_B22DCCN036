// Profile page functionality

function openReport() {
    // Open PDF report from Google Drive in new tab
    window.open('https://drive.google.com/file/d/1FXJn_yYombacwM9hvU2rdctPG4xJE6uh/preview', '_blank');
}

// Initialize profile page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Profile page loaded');
});