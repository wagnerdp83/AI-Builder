export const SITE = {
  title: "AI Beta Landing Page",
  description:
    "A modern landing page for an AI Beta project, built with Astro and Tailwind CSS, focusing on performance and SEO.",
  url: "https://ai-beta-landing-page.netlify.app", // Your production URL
  author: "Your Name or Company",
  logo: "/favicon.svg", // Path to your logo
  ogImage: "/og-image.jpg", // Path to your default OG image
};

export const SEO = {
  title: SITE.title,
  description: SITE.description,
  openGraph: {
    type: "website",
    url: SITE.url,
    title: SITE.title,
    description: SITE.description,
    image: SITE.ogImage,
    site_name: SITE.title,
  },
  twitter: {
    card: "summary_large_image",
    site: "@YourTwitterHandle", // Optional: your Twitter handle
    creator: "@YourTwitterHandle", // Optional: content creator's Twitter handle
    title: SITE.title,
    description: SITE.description,
    image: SITE.ogImage,
  },
};

// You can add more constants here as needed, e.g., for navigation links, social media links etc.
