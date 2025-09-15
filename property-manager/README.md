# 🏢 Property Management System

A modern, full-stack property management application built with React, TypeScript, and Supabase. Features comprehensive tenant management, meter readings, billing, and multi-role authentication.

## ✨ Features

### 🔐 Authentication & Security
- **Email-first authentication** with Magic Links and OTP
- **Google OAuth** integration
- **Passkey support** (WebAuthn)
- **Role-based access control** (RBAC)
- **Rate limiting** and security protections

### 👥 User Management
- **Multi-role system**: Admin, Landlord, Property Manager, Tenant, Maintenance
- **Profile management** with Google account linking
- **Organization-based access control**

### 🏠 Property Management
- **Property listings** with detailed information
- **Address management** with geocoding
- **Apartment/unit management**
- **Tenant assignments** and relationships

### 📊 Meter Management
- **Individual apartment meters** with inheritance system
- **Communal meter configurations**
- **Photo requirements** for meter readings
- **Cost calculations** and billing
- **Meter reading history**

### 💰 Billing & Invoices
- **Automated billing** based on meter readings
- **Invoice generation** and management
- **Payment tracking**

### 📱 Modern UI/UX
- **Responsive design** with Tailwind CSS
- **Performance optimized** with lazy loading
- **Real-time updates** and notifications
- **Accessibility compliant**

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm 8+
- Supabase account

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd property-manager
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
```bash
# Copy environment template
cp .env.example .env.local

# Add your Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Database setup**
```bash
# Run the database setup script
# See SUPABASE_AUTH_SETUP.md for detailed instructions
```

5. **Start development server**
```bash
npm start
```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components
│   ├── meters/         # Meter-related components
│   ├── properties/     # Property management components
│   └── tenant/         # Tenant-specific components
├── pages/              # Application pages/routes
├── hooks/              # Custom React hooks
├── context/            # React context providers
├── lib/                # API and database utilities
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── styles/             # Global styles and CSS
```

## 🔧 Configuration

### Supabase Setup
See `SUPABASE_AUTH_SETUP.md` for detailed database configuration.

### Email Configuration
- **SMTP**: Configured with Postmark
- **Domain**: `auth.nuomoria.lt`
- **Sender**: `login@auth.nuomoria.lt`

### Authentication
- **Magic Links**: Email-based authentication
- **OTP**: One-time password verification
- **Google OAuth**: Social login integration
- **Passkeys**: WebAuthn support

## 📚 Documentation

- [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) - Production deployment instructions
- [`SUPABASE_AUTH_SETUP.md`](./SUPABASE_AUTH_SETUP.md) - Database and authentication setup
- [`IMPLEMENTATION_GUIDE.md`](./IMPLEMENTATION_GUIDE.md) - Implementation details
- [`RBAC_SYSTEM_COMPLETE.md`](./RBAC_SYSTEM_COMPLETE.md) - Role-based access control

## 🛠️ Development

### Available Scripts

```bash
npm start          # Start development server
npm run build      # Build for production
npm test           # Run tests
npm run lint       # Run ESLint
npm run type-check # TypeScript type checking
```

### Performance Optimization

The application includes several performance optimizations:
- **Lazy loading** of components and routes
- **Virtual scrolling** for large lists
- **Image optimization** with WebP/AVIF support
- **Bundle splitting** and code optimization
- **Core Web Vitals** monitoring

## 🔒 Security

- **Row Level Security (RLS)** enabled on all tables
- **Rate limiting** on authentication endpoints
- **Input validation** with Zod schemas
- **Secure headers** and CORS configuration
- **Environment variable** protection

## 🌐 Deployment

### Production Deployment
1. Configure environment variables
2. Set up Supabase project
3. Configure email SMTP settings
4. Deploy to your hosting provider
5. Set up custom domain

See `DEPLOYMENT_GUIDE.md` for detailed instructions.

## 📊 Monitoring

- **Performance monitoring** with Web Vitals
- **Error tracking** and logging
- **User analytics** and usage metrics
- **Database performance** monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- **Email**: owner@nuomoria.lt
- **Documentation**: Check the documentation files in the repository
- **Issues**: Create an issue in the repository

---

**Built with ❤️ using React, TypeScript, and Supabase**