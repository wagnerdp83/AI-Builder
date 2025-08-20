import { runEditTest } from './edit-test-runner';

async function main() {
  const prompts = [
    'edit hero headline to The new era of web design',
    'update contact button background colour to theme colour',
    'change culture sub headline to Our values and mission',
    'modify hero link to /new-demo-page',
    'edit pricing section title to Our new plans',
    'change testimonials author name to Jane Doe',
  ];

  for (const prompt of prompts) {
    await runEditTest(prompt);
    console.log('\n' + '='.repeat(40) + '\n');
  }
}

main().catch(error => {
  console.error('An unexpected error occurred:', error);
}); 