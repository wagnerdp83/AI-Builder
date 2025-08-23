# AI Landing Page Builder - Beta V3

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Astro](https://img.shields.io/badge/Astro-4.4-blue)](https://astro.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

> **Revolutionary AI-powered landing page builder** that combines Next.js intelligence with Astro performance to create lightning-fast, SEO-optimized websites through natural language prompts.

## 🚀 Overview

The AI Landing Page Builder is a cutting-edge system that revolutionizes web development by combining:

- **🤖 AI-Powered Interface** (Next.js) - Intelligent component generation using Mistral AI
- **⚡ Ultra-Fast Rendering** (Astro) - Static site generation with Core Web Vitals optimization
- **🧠 Multi-Agent RAG System** - Advanced AI orchestration for complex tasks
- **🎨 Dynamic Component Creation** - Natural language to code conversion

### What Makes This Special?

- **100% AI-Driven**: No hard-coded patterns or rigid logic
- **Real-time Preview**: See changes instantly across all viewports
- **Performance First**: Built for Core Web Vitals and Lighthouse scores
- **Enterprise Ready**: Scalable architecture with continuous learning

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Landing Page Builder                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │   Next.js       │    │           Astro                 │ │
│  │   Interface     │◄──►│        Rendering Engine         │ │
│  │                 │    │                                 │ │
│  │ • AI Agents     │    │ • Static Site Generation        │ │
│  │ • Mistral AI    │    │ • Performance Optimization      │ │
│  │ • Component     │    │ • SEO Management                │ │
│  │   Generation    │    │ • Netlify Deployment            │ │
│  │ • Real-time     │    │ • Core Web Vitals               │ │
│  │   Preview       │    │ • Responsive Design             │ │
│  └─────────────────┘    └─────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
AI Page Builder - Beta v3/
├── interface/                 # Next.js AI Interface
│   ├── app/                  # App Router & API routes
│   ├── lib/                  # AI agents & services
│   │   ├── agents/          # Multi-agent RAG system
│   │   ├── services/        # AI services & knowledge base
│   │   └── tools/           # Component generation tools
│   ├── components/          # React UI components
│   └── test/                # Testing infrastructure
│
├── rendering/                # Astro Rendering Engine
│   ├── src/                 # Astro source files
│   │   ├── layouts/         # BaseLayout & SectionWrapper
│   │   ├── pages/           # Landing pages
│   │   └── components/      # Generated components
│   ├── public/              # Static assets
│   └── scripts/             # Build & optimization
│
├── docs/                    # Comprehensive documentation
├── templates/               # Preline UI templates
└── README.md               # This file
```

## 🎯 Key Features

### 🤖 AI-Powered Interface (Next.js)
- **Natural Language Processing**: Create components with simple prompts
- **Multi-Agent RAG System**: Intelligent task orchestration
- **Real-time Preview**: Instant visual feedback across viewports
- **Component Knowledge Base**: Continuous learning and improvement
- **Visual Creation**: Generate components from image uploads

### ⚡ Ultra-Fast Rendering (Astro)
- **Static Site Generation**: Maximum performance and SEO
- **Core Web Vitals**: Built for 90+ Lighthouse scores
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **SectionWrapper System**: Consistent component styling
- **Performance Optimization**: Critical CSS, lazy loading, image optimization

### 🧠 Advanced AI Techniques
- **LLM Orchestration**: Mistral AI for intelligent decision making
- **RAG Implementation**: Retrieval-augmented generation for context
- **Multi-Agent System**: Specialized agents for different tasks
- **Continuous Learning**: Pattern recognition and improvement
- **Dynamic Intent Detection**: AI-driven understanding of user requests

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** and npm
- **Mistral API Key** for AI functionality
- **Git** for version control

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd "AI Page Builder - Beta v3"
```

### 2. Install Dependencies

```bash
# Install Next.js interface dependencies
cd interface
npm install

# Install Astro rendering dependencies
cd ../rendering
npm install

# Return to root
cd ..
```

### 3. Environment Setup

Create `.env.local` in the `interface/` directory:

```bash
cd interface
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Mistral AI Configuration
MISTRAL_API_KEY=your_mistral_api_key_here
MISTRAL_MODEL=codestral:latest

# Development URLs
NEXT_PUBLIC_ASTRO_URL=http://localhost:4321
INTERFACE_URL=http://localhost:3000

# Optional: Enable debugging
DEBUG_AGENT=true
```

### 4. Start Development Servers

**Terminal 1 - Next.js Interface:**
```bash
cd interface
npm run dev
# Server starts at http://localhost:3000
```

**Terminal 2 - Astro Rendering:**
```bash
cd rendering
npm run dev
# Server starts at http://localhost:4321
```

### 5. Open Your Browser

- **Interface**: http://localhost:3000 (AI-powered builder)
- **Preview**: http://localhost:4321 (Generated landing page)

## 🎨 How to Use

### 1. Create Components with Natural Language

Simply describe what you want:

```
"Create a hero section with a headline, subtitle, and CTA button"
"Add a testimonials section with 3 customer reviews"
"Create a pricing section with 3 plans"
```

### 2. Edit Existing Components

Modify components through natural language:

```
"Change the hero headline to 'Welcome to Our Platform'"
"Update the button color to blue"
"Make the testimonials section background light gray"
```

### 3. Visual Component Creation

Upload an image and let AI generate the component:

```
"Create a component that looks like this image"
"Generate a hero section based on this design"
```

### 4. Real-time Preview

- See changes instantly across all viewports
- Test mobile, tablet, and desktop layouts
- Monitor performance metrics in real-time

## 🏗️ Technical Architecture

### Multi-Agent RAG System

The system uses a sophisticated multi-agent architecture:

```typescript
// Orchestrator Agent - Coordinates all operations
const orchestrator = new OrchestratorAgent();
const plan = await orchestrator.createOrchestrationPlan(userRequest);

// RAG Agent - Retrieves relevant patterns
const ragAgent = new RAGAgent();
const patterns = await ragAgent.retrieveSimilarPatterns(userRequest);

// Requirements Agent - Parses user requirements
const requirementsAgent = new RequirementsAgent();
const requirements = await requirementsAgent.parseRequirements(userRequest);

// Code Generation Agent - Creates components
const codeGenAgent = new CodeGenerationAgent();
const component = await codeGenAgent.generateComponent(requirements);

// Learning Agent - Improves future generations
const learningAgent = new LearningAgent();
await learningAgent.learnFromGeneration(userRequest, component);
```

### Component Generation Pipeline

1. **Intent Detection**: AI analyzes user request
2. **Pattern Retrieval**: RAG system finds similar components
3. **Requirements Parsing**: LLM extracts specific requirements
4. **Code Generation**: AI creates Astro component
5. **Validation**: Auto-fix and lint-free generation
6. **Integration**: Component added to landing page
7. **Learning**: Pattern stored for future improvements

### Performance Optimization

- **Critical CSS Inlining**: Above-the-fold styles for instant rendering
- **Deferred JavaScript**: Non-critical scripts load after page load
- **Image Optimization**: WebP/AVIF conversion with Sharp
- **Lazy Loading**: Below-the-fold content on demand
- **Resource Hints**: DNS prefetch and preload optimization

## 🔧 Development

### Available Scripts

**Interface (Next.js):**
```bash
cd interface
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

**Rendering (Astro):**
```bash
cd rendering
npm run dev          # Start development server
npm run build        # Build for production
npm run build:perf   # Performance-optimized build
npm run perf:test    # Run performance tests
npm run templates:test # Test individual templates
```

### Testing

```bash
# Run all tests
cd interface
npm test

# Performance testing
cd rendering
npm run perf:test

# Template testing
npm run templates:test
```

### Code Quality

- **TypeScript**: Full type safety across the project
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Performance**: Lighthouse CI integration

## 📊 Performance Metrics

### Core Web Vitals Targets
- **LCP (Largest Contentful Paint)**: < 2.5s ✅
- **FID (First Input Delay)**: < 100ms ✅
- **CLS (Cumulative Layout Shift)**: < 0.1 ✅
- **INP (Interaction to Next Paint)**: < 200ms ✅

### Current Performance
- **Agent Decision Time**: ~3s (target: <2s)
- **Tool Selection Accuracy**: 90-95%
- **AST Transformation Success**: 95%+
- **UI Response Time**: <500ms
- **Code Modification Safety**: 100%

## 🚀 Deployment

### Netlify (Recommended)

The Astro project is configured for automatic Netlify deployment:

1. **Connect Repository**: Link your Git repository to Netlify
2. **Build Settings**: 
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Environment Variables**: Set `MISTRAL_API_KEY`
4. **Auto-deploy**: Every push triggers automatic deployment

### Manual Deployment

```bash
# Build Astro project
cd rendering
npm run build

# Deploy dist/ folder to your hosting provider
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Standards
- **TypeScript**: Use strict type checking
- **Performance**: Maintain Core Web Vitals targets
- **Accessibility**: WCAG AA compliance
- **Testing**: Include tests for new features

### Areas for Contribution
- **AI Agents**: Improve agent decision making
- **Performance**: Optimize rendering and build processes
- **UI/UX**: Enhance the builder interface
- **Documentation**: Improve guides and examples

## 📚 Documentation

- **[Interface Documentation](docs/README.md)** - Next.js AI interface details
- **[Rendering Documentation](rendering/README.md)** - Astro rendering engine
- **[Create Method Pipeline](docs/Create-Method-Pipeline.md)** - Component generation
- **[Multi-Agent RAG](docs/Multi-agent-RAG-implementation.md)** - AI architecture
- **[Performance Testing](rendering/PERFORMANCE-TESTING.md)** - Optimization guide

## 🆘 Support

### Getting Help
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Documentation**: Check the `docs/` folder

### Common Issues

**Performance Problems**
- Run `npm run perf:test` for analysis
- Check Core Web Vitals in Chrome DevTools
- Verify script loading order

**Build Errors**
- Clear build cache: `rm -rf dist .astro`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check TypeScript compilation

**AI Generation Issues**
- Verify Mistral API key is set
- Check agent reasoning in the interface
- Use more specific prompts

## 🗺️ Roadmap

### Phase 1: Core Infrastructure ✅
- [x] Multi-agent RAG system
- [x] Component generation pipeline
- [x] Real-time preview system
- [x] Performance optimization

### Phase 2: Advanced Features 🚧
- [ ] Enhanced AI models integration
- [ ] Advanced component patterns
- [ ] Performance monitoring dashboard
- [ ] A/B testing capabilities

### Phase 3: Enterprise Features 📋
- [ ] Team collaboration tools
- [ ] Version control integration
- [ ] Advanced analytics
- [ ] Custom AI model training

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Mistral AI** for providing the Codestral model
- **Astro** team for the amazing static site generator
- **Next.js** team for the React framework
- **Tailwind CSS** for the utility-first CSS framework
- **Preline** for the UI components

---

**Built with ❤️ using Next.js, Astro, and AI-powered component generation**

*For questions, issues, or contributions, please open an issue or discussion on GitHub.*
