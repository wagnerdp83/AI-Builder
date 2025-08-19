# AI Landing Page Builder

A comprehensive landing page builder with an Astro-based renderer and React/Next.js interface.

## Project Structure

This project consists of two main components:

1. **Rendering Engine** - An Astro-based system for generating and rendering optimized landing pages.
2. **Builder Interface** - A React/Next.js application that provides a UI for building and customizing landing pages.

```
/
├── rendering/ (Astro-based landing page builder)
│   ├── src/ (Astro source files)
│   ├── public/ (Static assets)
│   ├── templates/ (Page section templates)
│   └── ...
│
├── interface/ (React/Next.js UI agent interface)
│   ├── src/ (React components and pages)
│   ├── public/ (Static assets)
│   └── ...
│
└── package.json (Root project management)
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:

   ```bash
   git clone [repository-url]
   cd [repository-directory]
   ```

2. Install dependencies for both projects:
   ```bash
   npm install
   ```

### Development

#### Running the Rendering Engine

```bash
npm run dev:rendering
```

This will start the Astro development server at http://localhost:4321.

#### Running the Interface

```bash
npm run dev:interface
```

This will start the Next.js development server at http://localhost:3000.

### Building for Production

#### Build the Rendering Engine

```bash
npm run build:rendering
```

#### Build the Interface

```bash
npm run build:interface
```

## Features

- Interactive landing page builder interface
- Drag-and-drop template management
- Real-time preview
- Optimized page generation with Astro
- Responsive design
- Performance-optimized output

## Documentation

For more detailed information, see the [Landing Page Builder Documentation](./LANDING_PAGE_BUILDER.md).

## License

This project is licensed under the MIT License.
