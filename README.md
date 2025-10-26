# BIC Admin Portal

A React + TypeScript admin portal for Brooklyn Islamic Center.

## Features

- Student management with payment tracking
- Teacher management with payment history
- Expense tracking
- Monthly reports
- Data persistence with localStorage

## Development

### Prerequisites

- Node.js (v18 or higher)
- npm

### Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Open http://localhost:5173 in your browser

### Building for Production

Build the application:
```bash
npm run build
```

The built files will be in the `dist/` folder.

### Deploying to GitHub Pages

#### Option 1: Manual Deployment

1. Build the application: `npm run build`
2. Copy the contents of the `dist/` folder to the root directory or deploy the dist folder

#### Option 2: Using GitHub Actions (Recommended)

A GitHub Actions workflow is provided in `.github/workflows/deploy.yml` that automatically builds and deploys to GitHub Pages on every push to main.

## Project Structure

```
.
├── src/
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # Application entry point
│   └── index.css        # Global styles with Tailwind
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── tailwind.config.js   # Tailwind CSS configuration
```

## Default Login

- **Username**: `nsifat`
- **Password**: `SifatxBIC@admin`

⚠️ **Security Note**: This demo stores credentials client-side. For production use, implement proper server-side authentication with hashed passwords and secure sessions.

## Technologies Used

- React 18
- TypeScript
- Vite
- Tailwind CSS
- LocalStorage for data persistence
