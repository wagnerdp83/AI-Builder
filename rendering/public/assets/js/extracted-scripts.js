// Auto-extracted scripts from HTML

// Embedded script block 1

document.addEventListener('DOMContentLoaded', function() {
const mobileMenuButton = document.getElementById('mobile-menu-button');
const closeMenuButton = document.getElementById('close-menu');
const mobileMenu = document.getElementById('mobile-menu');

mobileMenuButton.addEventListener('click', function() {
mobileMenu.classList.remove('translate-x-full');
mobileMenu.classList.add('translate-x-0');
document.body.style.overflow = 'hidden';
});

closeMenuButton.addEventListener('click', function() {
mobileMenu.classList.remove('translate-x-0');
mobileMenu.classList.add('translate-x-full');
document.body.style.overflow = '';
});

const mobileMenuLinks = mobileMenu.querySelectorAll('a');
mobileMenuLinks.forEach(link => {
link.addEventListener('click', function() {
mobileMenu.classList.remove('translate-x-0');
mobileMenu.classList.add('translate-x-full');
document.body.style.overflow = '';
});
});

const navbar = document.getElementById('navbar');
window.addEventListener('scroll', function() {
if (window.scrollY > 100) {
navbar.classList.add('bg-white/80');
navbar.classList.remove('bg-white/10');
navbar.classList.add('shadow-md');
} else {
navbar.classList.remove('bg-white/80');
navbar.classList.add('bg-white/10');
navbar.classList.remove('shadow-md');
}
});


const backToTopButton = document.getElementById('back-to-top');

window.addEventListener('scroll', () => {
if (window.scrollY > 500) {
backToTopButton.classList.remove('opacity-0', 'invisible');
backToTopButton.classList.add('opacity-100', 'visible');
} else {
backToTopButton.classList.add('opacity-0', 'invisible');
backToTopButton.classList.remove('opacity-100', 'visible');
}
});

backToTopButton.addEventListener('click', () => {
window.scrollTo({
top: 0,
behavior: 'smooth'
});
});

const animateOnScroll = () => {
const elements = document.querySelectorAll('.animate-fade-in');

elements.forEach(element => {
const elementTop = element.getBoundingClientRect().top;
const elementHeight = element.offsetHeight;
const windowHeight = window.innerHeight;

if (elementTop < windowHeight - elementHeight / 4) {
element.style.opacity = '1';
element.style.transform = 'translateY(0)';
}
});
};

animateOnScroll();
window.addEventListener('scroll', animateOnScroll);

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
anchor.addEventListener('click', function(e) {
e.preventDefault();

const targetId = this.getAttribute('href');
if (targetId === '#') return;

const targetElement = document.querySelector(targetId);
if (targetElement) {
const navbarHeight = 117;
const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navbarHeight;

window.scrollTo({
top: targetPosition,
behavior: 'smooth'
});
}
});
});

const lazyLoadImages = () => {
const images = document.querySelectorAll('img');

images.forEach(img => {
if (!img.src) {
img.src = 'https://picsum.photos/' +
(img.width || 400) + '/' +
(img.height || 400) +
'?random=' + Math.floor(Math.random() * 1000);
}
});
};

lazyLoadImages();
});


