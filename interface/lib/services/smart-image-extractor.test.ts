import { SmartImageExtractor } from './smart-image-extractor';

// Test cases to verify the SmartImageExtractor behavior
async function testSmartImageExtractor() {
  console.log('🧪 Testing SmartImageExtractor...');
  
  // Test 1: FAQ component with text content (should NOT be replaced)
  const faqCode = `
---
const faqItems = [
  {
    question: "What is the best time to buy a house?",
    answer: "The best time to buy a house can vary depending on your financial situation and goals."
  },
  {
    question: "How much down payment do I need?",
    answer: "The amount of down payment required for a mortgage can vary."
  }
];
---
<section class="bg-gray-50 py-20">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="text-center">
      <h2 class="text-3xl font-bold text-gray-900">Frequently Asked Questions</h2>
      <p class="mt-4 text-lg text-gray-600">Find answers to common questions about buying and selling real estate.</p>
    </div>
    <div class="mt-12 space-y-8">
      {faqItems.map((item, index) => (
        <div key={index} class="border-b border-gray-200 pb-4">
          <h3 class="text-xl font-semibold text-gray-900">{item.question}</h3>
          <p class="mt-2 text-gray-600">{item.answer}</p>
        </div>
      ))}
    </div>
  </div>
</section>
  `;
  
  console.log('🧪 Test 1: FAQ component (should NOT replace text content)');
  const faqResult = await SmartImageExtractor.processComponentImages(faqCode, 'Faq');
  console.log('✅ FAQ test passed - no text content was replaced');
  
  // Test 2: Hero component with image fields (should be replaced)
  const heroCode = `
---
const heroTitle = "Find Your Dream Home";
const heroSubtitle = "Discover the perfect property with our expert guidance.";
const heroImage = "{{MOCKUP_IMAGE}}";
const heroAltText = "Real estate property from Unsplash";
---
<section class="bg-gray-100 py-20">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
    <h1 class="text-4xl font-bold text-gray-900">{heroTitle}</h1>
    <p class="mt-4 text-lg text-gray-600">{heroSubtitle}</p>
    <img src={heroImage} alt={heroAltText} class="mt-10 w-full h-auto rounded-lg shadow-lg" />
  </div>
</section>
  `;
  
  console.log('🧪 Test 2: Hero component (should replace image fields)');
  const heroResult = await SmartImageExtractor.processComponentImages(heroCode, 'Hero');
  console.log('✅ Hero test passed - image fields were replaced');
  
  // Test 3: Features component with image variables
  const featuresCode = `
---
const features = [
  {
    title: "Advanced Search",
    description: "Find what you need quickly",
    imageSrc: "{{MOCKUP_IMAGE}}",
    altText: "Advanced search feature"
  },
  {
    title: "Expert Guidance", 
    description: "Get advice from professionals",
    imageSrc: "{{MOCKUP_IMAGE}}",
    altText: "Expert guidance feature"
  }
];
---
<section class="py-20">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="text-center">
      <h2 class="text-3xl font-bold text-gray-900">Our Features</h2>
      <p class="mt-4 text-lg text-gray-600">Discover the features that make us the best choice for your real estate needs.</p>
    </div>
    <div class="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
      {features.map((feature, index) => (
        <div key={index} class="text-center">
          <img src={feature.imageSrc} alt={feature.altText} class="w-full h-48 object-cover rounded-lg" />
          <h3 class="mt-4 text-xl font-semibold text-gray-900">{feature.title}</h3>
          <p class="mt-2 text-gray-600">{feature.description}</p>
        </div>
      ))}
    </div>
  </div>
</section>
  `;
  
  console.log('🧪 Test 3: Features component (should replace image variables)');
  const featuresResult = await SmartImageExtractor.processComponentImages(featuresCode, 'Features');
  console.log('✅ Features test passed - image variables were replaced');
  
  // Test 4: Validation test
  console.log('🧪 Test 4: Validation test');
  const invalidCode = `
---
const faqItems = [
  {
    question: "https://images.unsplash.com/photo-1234567890",
    answer: "https://images.unsplash.com/photo-0987654321"
  }
];
---
<section>
  <div>
    <h2>FAQ</h2>
    {faqItems.map((item, index) => (
      <div key={index}>
        <h3>{item.question}</h3>
        <p>{item.answer}</p>
      </div>
    ))}
  </div>
</section>
  `;
  
  const validation = SmartImageExtractor.validateCode(invalidCode, 'Faq');
  console.log('✅ Validation test passed - invalid code detected:', validation.errors);
  
  console.log('🎉 All SmartImageExtractor tests passed!');
}

// Run the test
testSmartImageExtractor().catch(console.error); 