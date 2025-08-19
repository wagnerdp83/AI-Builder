// Auto-extracted scripts from HTML

// Embedded script block 1

document.addEventListener('DOMContentLoaded', function() {
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const mobileMenuClose = document.querySelector('.mobile-menu-close');
const mobileMenu = document.querySelector('.mobile-menu');
const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

mobileMenuToggle.addEventListener('click', function() {
mobileMenu.classList.add('active');
document.body.style.overflow = 'hidden';
});

mobileMenuClose.addEventListener('click', function() {
mobileMenu.classList.remove('active');
document.body.style.overflow = '';
});

mobileNavLinks.forEach(link => {
link.addEventListener('click', function() {
mobileMenu.classList.remove('active');
document.body.style.overflow = '';
});
});
});


// Embedded script block 2

document.addEventListener('DOMContentLoaded', () => {
const canvas = document.querySelector('.particle-canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const particles = [];
const numParticles = 100;

class Particle {
constructor() {
this.x = Math.random() * canvas.width;
this.y = Math.random() * canvas.height;
this.size = Math.random() * 2 + 1;
this.speedX = Math.random() * 1 - 0.5;
this.speedY = Math.random() * 1 - 0.5;
this.color = `hsla(210, 100%, 70%, ${Math.random() * 0.5 + 0.2})`;
}
update() {
this.x += this.speedX;
this.y += this.speedY;

if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
}
draw() {
ctx.fillStyle = this.color;
ctx.beginPath();
ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
ctx.closePath();
ctx.fill();
}
}

for (let i = 0; i < numParticles; i++) {
particles.push(new Particle());
}

function animateParticles() {
ctx.clearRect(0, 0, canvas.width, canvas.height);
particles.forEach(particle => {
particle.update();
particle.draw();
});
requestAnimationFrame(animateParticles);
}

animateParticles();

window.addEventListener('resize', () => {
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
});
});


