// Test avatar replacement functionality
console.log('🧪 Testing Avatar Replacement...');

// Test case: Testimonials component with Unsplash avatar URLs
const testimonialsCode = `
---
const testimonials = [
  {
    name: "John Doe",
    role: "Homeowner",
    content: "This platform made finding my dream home a breeze.",
    avatar: "https://images.unsplash.com/photo-1567320743368-9db24e12ebf0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NjU0MzV8MHwxfHNlYXJjaHwyfHxyZWFsJTIwZXN0YXRlJTIwYWdlbnR8ZW58MHwyfHx8MTc1MzgxMzI4OHww&ixlib=rb-4.1.0&q=80&w=1080"
  },
  {
    name: "Jane Smith",
    role: "Investor",
    content: "I found the best investment property through this site.",
    avatar: "https://images.unsplash.com/photo-1567320743368-9db24e12ebf0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NjU0MzV8MHwxfHNlYXJjaHwyfHxyZWFsJTIwZXN0YXRlJTIwYWdlbnR8ZW58MHwyfHx8MTc1MzgxMzI4OHww&ixlib=rb-4.1.0&q=80&w=1080"
  }
];
---
<section class="bg-gray-50 py-20">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="text-center">
      <h2 class="text-3xl font-bold text-gray-900">What Our Clients Say</h2>
      <p class="mt-4 text-lg text-gray-600">Hear from our satisfied customers.</p>
    </div>
    <div class="mt-12 grid gap-10 sm:grid-cols-1 md:grid-cols-2">
      {testimonials.map((testimonial, index) => (
        <div key={index} class="bg-white p-6 rounded-lg shadow-lg">
          <div class="flex items-center">
            <img src={testimonial.avatar} alt={testimonial.name} class="w-12 h-12 rounded-full mr-4" />
            <div>
              <h3 class="text-xl font-semibold text-gray-900">{testimonial.name}</h3>
              <p class="text-gray-600">{testimonial.role}</p>
            </div>
          </div>
          <p class="mt-4 text-gray-700">{testimonial.content}</p>
        </div>
      ))}
    </div>
  </div>
</section>
`;

// Simple avatar replacement function (simplified version of what's in SmartImageExtractor)
function replaceAvatarUrls(code, componentName) {
  let processedCode = code;
  
  // Get random avatar from local avatars
  const avatarFiles = [
    'Avatar_man.avif',
    'Avatar_man2.avif',
    'Avatar_man3.avif',
    'Avatar_man4.avif',
    'Avatar_man6.avif',
    'Avatar_man7.avif',
    'Avatar_woman.avif',
    'Avatar_woman2.avif',
    'Avatar_woman3.avif',
    'Avatar_woman4.avif',
    'Avatar_woman5.avif'
  ];
  
  const getRandomAvatar = () => {
    const randomAvatar = avatarFiles[Math.floor(Math.random() * avatarFiles.length)];
    return `/images/avatars/${randomAvatar}`;
  };
  
  // Replace Unsplash URLs in avatar fields
  processedCode = processedCode.replace(
    /(avatar)\s*:\s*["']https:\/\/images\.unsplash\.com[^"']+["']/g,
    (match, fieldName) => {
      const avatarUrl = getRandomAvatar();
      console.log(`✅ Replacing Unsplash avatar with local: ${avatarUrl}`);
      return `${fieldName}: "${avatarUrl}"`;
    }
  );
  
  // Replace Unsplash URLs in avatar src attributes
  processedCode = processedCode.replace(
    /src\s*=\s*["']https:\/\/images\.unsplash\.com[^"']+["']/g,
    (match) => {
      const avatarUrl = getRandomAvatar();
      console.log(`✅ Replacing Unsplash src with local avatar: ${avatarUrl}`);
      return `src = "${avatarUrl}"`;
    }
  );
  
  return processedCode;
}

console.log('🧪 Test: Avatar replacement in Testimonials component');
const originalAvatarCount = (testimonialsCode.match(/https:\/\/images\.unsplash\.com[^"'\s]+/g) || []).length;
console.log(`📊 Original Unsplash URLs found: ${originalAvatarCount}`);

const processedCode = replaceAvatarUrls(testimonialsCode, 'Testimonials');

const remainingUnsplashCount = (processedCode.match(/https:\/\/images\.unsplash\.com[^"'\s]+/g) || []).length;
const localAvatarCount = (processedCode.match(/\/images\/avatars\/[^"'\s]+/g) || []).length;

console.log(`📊 Remaining Unsplash URLs: ${remainingUnsplashCount}`);
console.log(`📊 Local avatar URLs: ${localAvatarCount}`);

if (remainingUnsplashCount === 0 && localAvatarCount > 0) {
  console.log('✅ SUCCESS: All Unsplash avatar URLs replaced with local avatars!');
} else {
  console.log('❌ FAILED: Some Unsplash URLs remain or no local avatars found');
}

console.log('🎉 Avatar replacement test completed!'); 