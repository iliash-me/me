export const PROFILE = {
  name: "Iliash Hosain",
  handle: "iliash-me",
  domain: "iliash.me",
  role: "Front-End Developer & UI Engineer",
  tagline: "I build fast, tactile web interfaces.",
  summary:
    "I focus on clean design systems, fluid layouts, and high-performance front-end engineering.",
  email: "iliashhosain@gmail.com",
  avatar: "https://avatars.githubusercontent.com/u/6237937?v=4",
  timezone: "Asia/Dhaka",
  timezoneLabel: "UTC+06:00",
  socials: [
    {
      id: "social-github",
      label: "GitHub",
      handle: "@iliash-me",
      url: "https://github.com/iliash-me"
    },
    {
      id: "social-facebook",
      label: "Facebook",
      handle: "/iliashhosain",
      url: "https://www.facebook.com/iliashhosain"
    },
    {
      id: "social-email",
      label: "Email",
      handle: "iliashhosain@gmail.com",
      url: "mailto:iliashhosain@gmail.com"
    }
  ],
  metrics: [
    { label: "Core Focus", value: "Design Systems & Interactive Web" },
    { label: "Performance Target", value: "100 / 100 Lighthouse" },
    { label: "Primary Stack", value: "React · TypeScript · Three.js · CSS" }
  ]
};

export const PROJECTS = [
  {
    id: "img2threejs",
    index: "01",
    title: "img2threejs",
    subtitle: "Procedural Image-to-3D Three.js Pipeline",
    category: "3D & Creative",
    year: "2026",
    description:
      "Rebuilds reference objects from a single image into code-only, procedural, quality-gated, animation-ready Three.js models. Engineered for token efficiency, clean scene hierarchies, and deterministic geometry output.",
    highlights: [
      "Code-only procedural mesh synthesis without heavy external GLTF payloads",
      "Automated visual quality gating with multi-angle camera inspection",
      "Animation-ready pivot hierarchies and material token controls"
    ],
    stack: ["Three.js", "WebGL", "Procedural Geometry", "JavaScript"],
    liveUrl: "https://img2threejs.io",
    repoUrl: "https://github.com/iliash-me/img2threejs",
    previewType: "wireframe-3d"
  },
  {
    id: "showcase-suite",
    index: "02",
    title: "Multi-Theme Product Showcase Suite",
    subtitle: "Zero-Dependency Design System & 6 SaaS Architecture Variations",
    category: "Design Systems",
    year: "2026",
    description:
      "A unified front-end architecture powering six distinct commercial product experiences (Nexora, Vantage, Aurelia, Quillo, Stockly, Replyo) from a single token-driven stylesheet and interactive customizer engine.",
    highlights: [
      "Live runtime theme & layout customizer (Light, Dark, Semi-Dark, Brand Tint)",
      "Zero external runtime dependencies — 100% vanilla CSS custom properties & JS",
      "Accessible keyboard navigation, reduced-motion support, and 320px+ fluidity"
    ],
    stack: ["CSS Custom Properties", "Design Tokens", "Vanilla JS", "HTML5"],
    liveUrl: "https://github.com/iliash-me/Showcase",
    repoUrl: "https://github.com/iliash-me/Showcase",
    previewType: "theme-matrix"
  },
  {
    id: "mario-kart-3js",
    index: "03",
    title: "Mario-Kart-3.js",
    subtitle: "Real-Time WebGL Browser Racing Engine",
    category: "3D & Creative",
    year: "2025",
    description:
      "High-frame-rate 3D racing experience running natively in the browser. Combines reactive state management with custom drift physics, particle systems, and spatial camera interpolation.",
    highlights: [
      "60fps WebGL rendering pipeline with custom shader effects",
      "Responsive arcade vehicle physics, drift boosts, and camera spring dynamics",
      "Deployed for instant browser play with streamlined asset loading"
    ],
    stack: ["React", "Three.js", "React Three Fiber", "GLSL Shaders"],
    liveUrl: "https://mario-kart-3-js.vercel.app",
    repoUrl: "https://github.com/iliash-me/Mario-Kart-3.js",
    previewType: "telemetry-hud"
  },
  {
    id: "uinames",
    index: "04",
    title: "uinames",
    subtitle: "Localized Identity & Mockup Data Generator",
    category: "Developer Tools",
    year: "2024",
    description:
      "A lightweight utility built for UI designers and front-end engineers to populate wireframes, prototypes, and automated tests with realistic, culturally diverse user names and metadata.",
    highlights: [
      "Instant region-aware persona synthesis for UI mockups",
      "Clean API & copy-ready formats for Figma and React prototypes",
      "Zero-friction keyboard workflow for rapid design iteration"
    ],
    stack: ["JavaScript", "REST API", "UI Tooling", "CSS3"],
    liveUrl: "https://uinames.com",
    repoUrl: "https://github.com/iliash-me/uinames",
    previewType: "identity-generator"
  },
  {
    id: "awesome-ai-tools",
    index: "05",
    title: "Awesome AI Tools Index",
    subtitle: "Curated Directory of Practical AI Engineering Workflows",
    category: "Developer Tools",
    year: "2025",
    description:
      "A structured open-source taxonomy cataloging high-signal AI tools across code generation, procedural 3D, design systems, and developer productivity.",
    highlights: [
      "Categorized by real developer & designer workflows",
      "Community-friendly markdown specification and fast lookup structure",
      "Focused on practical production tooling over hype"
    ],
    stack: ["Open Source", "Information Architecture", "Markdown"],
    liveUrl: "https://github.com/iliash-me/awesome-ai-tools",
    repoUrl: "https://github.com/iliash-me/awesome-ai-tools",
    previewType: "directory-index"
  }
];

export const DISCIPLINES = [
  {
    number: "01",
    title: "Component Architecture & React",
    summary:
      "Building predictable, composable component hierarchies with clean state boundaries, keyboard accessibility, and zero unnecessary re-renders.",
    tags: ["React 19", "TypeScript", "Vite", "State Machines", "ARIA Primitives"]
  },
  {
    number: "02",
    title: "Design Systems & Token Engines",
    summary:
      "Architecting scalable CSS systems powered by semantic HSL tokens, fluid clamp() typography, and adaptive multi-theme surfaces without stylesheet bloat.",
    tags: ["Modern Vanilla CSS", "CSS Grid & Subgrid", "Design Tokens", "Fluid Typography"]
  },
  {
    number: "03",
    title: "Interactive 3D & Procedural Web",
    summary:
      "Bringing spatial depth to the browser through procedural Three.js geometry, custom shaders, and physics-backed micro-interactions that stay silky at 60fps.",
    tags: ["Three.js", "WebGL", "React Three Fiber", "Procedural Meshes", "Canvas 2D"]
  },
  {
    number: "04",
    title: "Performance & Production Polish",
    summary:
      "Obsessing over the final 5%: instant First Contentful Paint, zero cumulative layout shift, semantic SEO metadata, and tactile feedback on every interaction.",
    tags: ["Core Web Vitals", "Semantic HTML5", "View Transitions", "GitHub Actions CI/CD"]
  }
];
