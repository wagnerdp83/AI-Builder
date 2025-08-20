import { promises as fs } from 'fs';
import path from 'path';

// Test the enhanced Lucide icon handling system
console.log('🧪 Testing Enhanced Lucide Icon Handling System...');

// Mock the icon mapping and functions from the framework
const LUCIDE_ICON_MAPPING: Record<string, string> = {
  'scissors': 'Scissors',
  'brush': 'Brush',
  'droplet': 'Droplets',
  'hand': 'Hand',
  'message-circle': 'MessageCircle',
  'star': 'Star',
  'user': 'User',
  'phone': 'Phone',
  'mail': 'Mail',
  'map-pin': 'MapPin',
  'home': 'Home',
  'settings': 'Settings',
  'search': 'Search',
  'menu': 'Menu',
  'chevron-down': 'ChevronDown',
  'arrow-right': 'ArrowRight',
  'check': 'Check',
  'x': 'X',
  'heart': 'Heart',
  'eye': 'Eye',
  'lock': 'Lock',
  'shield': 'Shield',
  'users': 'Users',
  'bar-chart': 'BarChart3',
  'camera': 'Camera',
  'code': 'Code',
  'gitlab': 'Gitlab',
  'globe': 'Globe',
  'twitter': 'Twitter',
  'github': 'Github',
  'play': 'Play',
  'play-circle': 'PlayCircle',
  'shopping-cart': 'ShoppingCart',
  'plus': 'Plus',
  'minus': 'Minus',
  'trash': 'Trash',
  'edit': 'Edit',
  'download': 'Download',
  'upload': 'Upload',
  'share': 'Share',
  'bookmark': 'Bookmark',
  'calendar': 'Calendar',
  'clock': 'Clock',
  'tag': 'Tag',
  'folder': 'Folder',
  'file': 'File',
  'image': 'Image',
  'video': 'Video',
  'music': 'Music',
  'volume': 'Volume2',
  'mute': 'VolumeX',
  'wifi': 'Wifi',
  'battery': 'Battery',
  'bluetooth': 'Bluetooth',
  'gift': 'Gift',
  'award': 'Award',
  'trophy': 'Trophy',
  'crown': 'Crown',
  'diamond': 'Diamond',
  'gem': 'Gem',
  'coffee': 'Coffee',
  'wine': 'Wine',
  'pizza': 'Pizza',
  'car': 'Car',
  'plane': 'Plane',
  'train': 'Train',
  'bike': 'Bike',
  'walk': 'Walk',
  'run': 'Run',
  'swim': 'Swim',
  'gym': 'Dumbbell',
  'yoga': 'Activity',
  'meditation': 'Zap',
  'sleep': 'Moon',
  'sun': 'Sun',
  'cloud': 'Cloud',
  'rain': 'CloudRain',
  'snow': 'CloudSnow',
  'wind': 'Wind',
  'fire': 'Flame',
  'leaf': 'Leaf',
  'tree': 'Tree',
  'flower': 'Flower',
  'seedling': 'Sprout',
  'mountain': 'Mountain',
  'beach': 'Umbrella',
  'fish': 'Fish',
  'bird': 'Bird',
  'cat': 'Cat',
  'dog': 'Dog',
  'horse': 'Horse',
  'cow': 'Cow',
  'pig': 'Pig',
  'chicken': 'Chicken',
  'egg': 'Egg',
  'milk': 'Milk',
  'bread': 'Bread',
  'apple': 'Apple',
  'banana': 'Banana',
  'orange': 'Orange',
  'grape': 'Grape',
  'strawberry': 'Strawberry',
  'cherry': 'Cherry',
  'lemon': 'Lemon',
  'lime': 'Lemon',
  'peach': 'Peach',
  'pear': 'Pear',
  'plum': 'Plum',
  'apricot': 'Apricot',
  'mango': 'Mango',
  'pineapple': 'Pineapple',
  'watermelon': 'Watermelon',
  'melon': 'Melon',
  'coconut': 'Coconut',
  'avocado': 'Avocado',
  'tomato': 'Tomato',
  'carrot': 'Carrot',
  'potato': 'Potato',
  'onion': 'Onion',
  'garlic': 'Garlic',
  'ginger': 'Ginger',
  'pepper': 'Pepper',
  'salt': 'Salt',
  'sugar': 'Sugar',
  'honey': 'Honey',
  'oil': 'Oil',
  'vinegar': 'Vinegar',
  'sauce': 'Sauce',
  'ketchup': 'Ketchup',
  'mustard': 'Mustard',
  'mayo': 'Mayo',
  'butter': 'Butter',
  'cheese': 'Cheese',
  'yogurt': 'Yogurt',
  'ice-cream': 'IceCream',
  'cake': 'Cake',
  'cookie': 'Cookie',
  'chocolate': 'Chocolate',
  'candy': 'Candy',
  'lollipop': 'Lollipop',
  'gum': 'Gum',
  'mint': 'Mint',
  'vanilla': 'Vanilla',
  'cinnamon': 'Cinnamon',
  'nutmeg': 'Nutmeg',
  'clove': 'Clove',
  'cardamom': 'Cardamom',
  'saffron': 'Saffron',
  'turmeric': 'Turmeric',
  'paprika': 'Paprika',
  'oregano': 'Oregano',
  'basil': 'Basil',
  'thyme': 'Thyme',
  'rosemary': 'Rosemary',
  'sage': 'Sage',
  'parsley': 'Parsley',
  'cilantro': 'Cilantro',
  'dill': 'Dill',
  'chive': 'Chive',
  'lemon-grass': 'LemonGrass',
  'bay-leaf': 'BayLeaf',
  'curry': 'Curry',
  'chili': 'Chili',
  'jalapeno': 'Jalapeno',
  'habanero': 'Habanero',
  'serrano': 'Serrano',
  'poblano': 'Poblano',
  'anaheim': 'Anaheim',
  'bell-pepper': 'BellPepper'
};

/**
 * Enhanced icon detection and import generation
 */
function detectAndGenerateIconImports(code: string): { imports: string[], iconUsage: string[] } {
  const iconUsage: string[] = [];
  const imports: Set<string> = new Set();
  
  const iconPatterns = [
    /icon:\s*["']([^"']+)["']/g,
    /icon\s*=\s*["']([^"']+)["']/g,
    /name\s*=\s*["']([^"']+)["']/g,
    /<Icon\s+name\s*=\s*["']([^"']+)["']/g
  ];
  
  iconPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const iconName = match[1].toLowerCase();
      if (LUCIDE_ICON_MAPPING[iconName]) {
        const lucideIconName = LUCIDE_ICON_MAPPING[iconName];
        imports.add(lucideIconName);
        iconUsage.push(iconName);
      }
    }
  });
  
  // Also detect icon names in object properties
  const objectPattern = /icon:\s*["']([^"']+)["']/g;
  let objectMatch;
  while ((objectMatch = objectPattern.exec(code)) !== null) {
    const iconName = objectMatch[1].toLowerCase();
    if (LUCIDE_ICON_MAPPING[iconName]) {
      const lucideIconName = LUCIDE_ICON_MAPPING[iconName];
      imports.add(lucideIconName);
      if (!iconUsage.includes(iconName)) {
        iconUsage.push(iconName);
      }
    }
  }
  
  return {
    imports: Array.from(imports),
    iconUsage
  };
}

/**
 * Replace generic Icon usage with specific Lucide icons
 */
function replaceIconUsage(code: string, iconUsage: string[]): string {
  let updatedCode = code;
  
  iconUsage.forEach(iconName => {
    const lucideIconName = LUCIDE_ICON_MAPPING[iconName.toLowerCase()];
    if (lucideIconName) {
      // Replace <Icon name="icon-name" /> with <IconName />
      const iconPattern = new RegExp(`<Icon\\s+name\\s*=\\s*["']${iconName}["'][^>]*>`, 'g');
      updatedCode = updatedCode.replace(iconPattern, `<${lucideIconName} />`);
      
      // Also replace icon: "icon-name" with icon: IconName
      const propPattern = new RegExp(`icon:\\s*["']${iconName}["']`, 'g');
      updatedCode = updatedCode.replace(propPattern, `icon: ${lucideIconName}`);
    }
  });
  
  return updatedCode;
}

// Test functions
function testIconDetection() {
  console.log('🧪 Testing icon detection...');
  
  const testCode = `
---
interface Feature {
  title: string;
  description: string;
  icon: string;
}

const features = [
  {
    title: "Hair Styling",
    description: "Expert haircuts and styling",
    icon: "scissors"
  },
  {
    title: "Makeup",
    description: "Professional makeup services",
    icon: "brush"
  },
  {
    title: "Skincare",
    description: "Custom skincare routines",
    icon: "droplet"
  }
] = Astro.props;

import { Icon } from '@lucide/astro';
---

<section>
  {features.map((feature) => (
    <div>
      <Icon name={feature.icon} class="w-8 h-8" />
      <h3>{feature.title}</h3>
      <p>{feature.description}</p>
    </div>
  ))}
</section>
  `;

  const { imports, iconUsage } = detectAndGenerateIconImports(testCode);
  
  const success = imports.includes('Scissors') && 
                  imports.includes('Brush') && 
                  imports.includes('Droplets') &&
                  imports.length === 3 &&
                  iconUsage.includes('scissors') &&
                  iconUsage.includes('brush') &&
                  iconUsage.includes('droplet') &&
                  iconUsage.length === 3;
  
  console.log(success ? '✅ Icon detection test passed' : '❌ Icon detection test failed');
  return success;
}

function testIconReplacement() {
  console.log('🧪 Testing icon replacement...');
  
  const testCode = `
---
const features = [
  {
    title: "Hair Styling",
    description: "Expert haircuts and styling",
    icon: "scissors"
  },
  {
    title: "Makeup",
    description: "Professional makeup services",
    icon: "brush"
  }
] = Astro.props;
---

<section>
  <div>
    <Icon name="scissors" class="w-8 h-8" />
    <h3>Hair Styling</h3>
  </div>
  <div>
    <Icon name="brush" class="w-8 h-8" />
    <h3>Makeup</h3>
  </div>
</section>
  `;

  const { iconUsage } = detectAndGenerateIconImports(testCode);
  const updatedCode = replaceIconUsage(testCode, iconUsage);
  
  console.log('Original icon usage:', iconUsage);
  console.log('Updated code contains Scissors:', updatedCode.includes('<Scissors'));
  console.log('Updated code contains Brush:', updatedCode.includes('<Brush'));
  console.log('Updated code contains Icon name="scissors":', updatedCode.includes('<Icon name="scissors"'));
  console.log('Updated code contains Icon name="brush":', updatedCode.includes('<Icon name="brush"'));
  
  const success = updatedCode.includes('<Scissors') &&
                  updatedCode.includes('<Brush') &&
                  !updatedCode.includes('<Icon name="scissors"') &&
                  !updatedCode.includes('<Icon name="brush"');
  
  console.log(success ? '✅ Icon replacement test passed' : '❌ Icon replacement test failed');
  return success;
}

function testMultipleIcons() {
  console.log('🧪 Testing multiple icons...');
  
  const testCode = `
---
const features = [
  { title: "Hair", icon: "scissors" },
  { title: "Makeup", icon: "brush" },
  { title: "Skincare", icon: "droplet" },
  { title: "Manicure", icon: "hand" },
  { title: "Consultation", icon: "message-circle" }
] = Astro.props;
---

<section>
  <div>
    <Icon name="scissors" class="w-8 h-8" />
    <h3>Hair</h3>
  </div>
  <div>
    <Icon name="brush" class="w-8 h-8" />
    <h3>Makeup</h3>
  </div>
  <div>
    <Icon name="droplet" class="w-8 h-8" />
    <h3>Skincare</h3>
  </div>
  <div>
    <Icon name="hand" class="w-8 h-8" />
    <h3>Manicure</h3>
  </div>
  <div>
    <Icon name="message-circle" class="w-8 h-8" />
    <h3>Consultation</h3>
  </div>
</section>
  `;

  const { imports, iconUsage } = detectAndGenerateIconImports(testCode);
  const updatedCode = replaceIconUsage(testCode, iconUsage);
  
  console.log('Detected imports:', imports);
  console.log('Detected icon usage:', iconUsage);
  console.log('Updated code contains Scissors:', updatedCode.includes('<Scissors'));
  console.log('Updated code contains Brush:', updatedCode.includes('<Brush'));
  console.log('Updated code contains Droplets:', updatedCode.includes('<Droplets'));
  console.log('Updated code contains Hand:', updatedCode.includes('<Hand'));
  console.log('Updated code contains MessageCircle:', updatedCode.includes('<MessageCircle'));
  
  const success = imports.length === 5 &&
                  imports.includes('Scissors') &&
                  imports.includes('Brush') &&
                  imports.includes('Droplets') &&
                  imports.includes('Hand') &&
                  imports.includes('MessageCircle') &&
                  updatedCode.includes('<Scissors') &&
                  updatedCode.includes('<Brush') &&
                  updatedCode.includes('<Droplets') &&
                  updatedCode.includes('<Hand') &&
                  updatedCode.includes('<MessageCircle');
  
  console.log(success ? '✅ Multiple icons test passed' : '❌ Multiple icons test failed');
  return success;
}

function testCaseInsensitive() {
  console.log('🧪 Testing case-insensitive icon names...');
  
  const testCode = `
---
const features = [
  { title: "Hair", icon: "SCISSORS" },
  { title: "Makeup", icon: "Brush" },
  { title: "Skincare", icon: "DROPLET" }
] = Astro.props;
---

<section>
  {features.map((feature) => (
    <div>
      <Icon name={feature.icon} class="w-8 h-8" />
      <h3>{feature.title}</h3>
    </div>
  ))}
</section>
  `;

  const { imports } = detectAndGenerateIconImports(testCode);
  
  const success = imports.length === 3 &&
                  imports.includes('Scissors') &&
                  imports.includes('Brush') &&
                  imports.includes('Droplets');
  
  console.log(success ? '✅ Case-insensitive test passed' : '❌ Case-insensitive test failed');
  return success;
}

function testUnknownIcons() {
  console.log('🧪 Testing unknown icon handling...');
  
  const testCode = `
---
const features = [
  { title: "Hair", icon: "scissors" },
  { title: "Unknown", icon: "unknown-icon" },
  { title: "Makeup", icon: "brush" }
] = Astro.props;
---

<section>
  {features.map((feature) => (
    <div>
      <Icon name={feature.icon} class="w-8 h-8" />
      <h3>{feature.title}</h3>
    </div>
  ))}
</section>
  `;

  const { imports, iconUsage } = detectAndGenerateIconImports(testCode);
  
  const success = imports.length === 2 &&
                  imports.includes('Scissors') &&
                  imports.includes('Brush') &&
                  !imports.includes('UnknownIcon') &&
                  iconUsage.length === 2 &&
                  iconUsage.includes('scissors') &&
                  iconUsage.includes('brush') &&
                  !iconUsage.includes('unknown-icon');
  
  console.log(success ? '✅ Unknown icons test passed' : '❌ Unknown icons test failed');
  return success;
}

// Run all tests
const tests = [
  testIconDetection,
  testIconReplacement,
  testMultipleIcons,
  testCaseInsensitive,
  testUnknownIcons
];

let passedTests = 0;
let totalTests = tests.length;

tests.forEach(test => {
  if (test()) {
    passedTests++;
  }
});

console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('🎉 All Enhanced Lucide Icon Handling tests passed successfully!');
} else {
  console.log('⚠️ Some tests failed. Please check the implementation.');
} 