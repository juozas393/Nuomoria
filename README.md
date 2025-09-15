# Property Management System v2

A comprehensive property management application built with React, TypeScript, and Supabase. This system provides tools for landlords, tenants, and property managers to efficiently manage rental properties, track utilities, handle invoices, and maintain property records.

## 🚀 Features

### For Property Managers/Landlords
- **Dashboard**: Overview of all properties, tenants, and financial metrics
- **Property Management**: Add, edit, and manage multiple properties and addresses
- **Tenant Management**: Track tenant information, lease agreements, and responses
- **Utility Tracking**: Monitor electricity, water, heating, and other utility meters
- **Invoice Generation**: Create and manage rent and utility invoices
- **Analytics**: Financial reports and property performance metrics
- **Maintenance Tracking**: Schedule and track property maintenance tasks

### For Tenants
- **Tenant Dashboard**: View personal property information and lease details
- **Utility Readings**: Submit meter readings and view consumption history
- **Invoice Management**: View and track payment status
- **Communication**: Receive notifications and updates from property managers

### Authentication & Security
- **Multi-role Authentication**: Support for landlords, tenants, and maintenance staff
- **Google OAuth Integration**: Quick sign-in with Google accounts
- **Magic Link Authentication**: Passwordless email-based login
- **OTP Verification**: Secure one-time password verification
- **Session Management**: Persistent sessions with automatic token refresh
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive input sanitization and validation

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Authentication**: Supabase Auth with Google OAuth
- **State Management**: React Context API
- **Routing**: React Router v6
- **UI Components**: Custom components with Tailwind CSS
- **Performance**: Lazy loading, code splitting, image optimization

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account and project

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd PropertyManagmentv2
   ```

2. **Install dependencies**
   ```bash
   cd property-manager
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the `property-manager` directory:
   ```env
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   REACT_APP_APP_URL=http://localhost:3000
   REACT_APP_APP_NAME=Property Manager
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

## 🗄️ Database Schema

The application uses Supabase PostgreSQL with the following main tables:

- **users**: User accounts and profiles
- **properties**: Property information and details
- **addresses**: Building and address management
- **apartments**: Individual apartment units
- **tenants**: Tenant information and lease details
- **meters**: Utility meter configurations
- **meter_readings**: Utility consumption data
- **invoices**: Financial records and billing
- **notifications**: System notifications and alerts

## 🔐 Security Features

- **Environment Variable Protection**: All sensitive data stored in environment variables
- **Production Console Logging Disabled**: No sensitive information logged in production
- **Input Sanitization**: All user inputs are validated and sanitized
- **Rate Limiting**: API endpoints protected against abuse
- **Session Security**: Secure session management with automatic refresh
- **Error Handling**: Generic error messages prevent information disclosure
- **localStorage Security**: Sensitive data masked in browser storage

## 📱 Performance Optimizations

- **Code Splitting**: Lazy loading of components and pages
- **Image Optimization**: WebP/AVIF support with fallbacks
- **Bundle Optimization**: Tree shaking and minification
- **Caching Strategy**: Efficient data caching and state management
- **Loading States**: Smooth loading experiences with fallbacks

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Environment Variables for Production
Ensure all environment variables are properly set in your production environment:
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
- `REACT_APP_APP_URL`
- `REACT_APP_APP_NAME`

## 📊 Project Structure

```
property-manager/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable UI components
│   ├── context/           # React Context providers
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries and configurations
│   ├── pages/             # Page components
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   └── styles/            # CSS and styling files
├── .env.local            # Environment variables (not in git)
├── .gitignore            # Git ignore rules
└── package.json          # Dependencies and scripts
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the code comments for implementation details

## 🔄 Version History

- **v2.0.0**: Complete rewrite with React, TypeScript, and Supabase
- **v1.x**: Legacy version (deprecated)

---

**Note**: This is a production-ready application with comprehensive security measures and performance optimizations. All sensitive data is properly protected and the application follows modern web development best practices.
