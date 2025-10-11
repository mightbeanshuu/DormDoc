# College Dispensary Management System

A comprehensive medical management system for Birla Institute of Technology, Mesra.

## Features

### For Students
- **QR Code Generation**: Unique QR codes for identification
- **Appointment Booking**: Book appointments with doctors
- **Prescription Management**: View and manage prescriptions
- **Leave Application**: Apply for leave using medical prescriptions
- **Emergency SOS**: Emergency contact system
- **Ambulance Booking**: Request ambulance transportation
- **AI Chatbot**: Medical assistance chatbot

### For Doctors
- **Dashboard**: Today's appointments and patient management
- **Prescription Management**: Create and manage prescriptions
- **Patient Chat**: Real-time communication with patients
- **Ambulance Booking**: Book ambulances for patients
- **Limited Access**: Role-based access control

### For Admins
- **Doctor Management**: Manage doctor profiles and schedules
- **Ambulance Management**: Fleet and queue management
- **Analytics**: Comprehensive reporting and statistics
- **Leave Requests**: Approve/reject student leave applications
- **QR Scanner**: Scan student QR codes
- **Inventory Management**: Medical inventory tracking

## Technology Stack

### Frontend
- **React 18** with functional components and hooks
- **Material-UI (MUI)** for modern UI components
- **React Router** for navigation
- **React Query** for data fetching and caching
- **Axios** for HTTP requests
- **React Toastify** for notifications
- **QR Code Library** for QR code generation

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Multer** for file uploads
- **Nodemailer** for email services

## Deployment

### Netlify Deployment

1. **Build the project**:
   ```bash
   cd client
   npm run build
   ```

2. **Deploy to Netlify**:
   - Connect your GitHub repository to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `client/build`
   - Set base directory: `client`

3. **Environment Variables** (if needed):
   ```
   REACT_APP_API_URL=https://your-backend-url.com
   ```

### Manual Deployment Steps

1. **Install dependencies**:
   ```bash
   npm install
   cd client
   npm install
   ```

2. **Build for production**:
   ```bash
   cd client
   npm run build
   ```

3. **Deploy to Netlify**:
   - Drag and drop the `client/build` folder to Netlify
   - Or connect via Git for automatic deployments

## Project Structure

```
college-dispensary/
├── client/                 # React frontend
│   ├── public/            # Static assets
│   ├── src/               # Source code
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   ├── services/      # API services
│   │   └── utils/         # Utility functions
│   ├── package.json       # Frontend dependencies
│   └── build/             # Production build
├── server.js              # Backend server
├── routes/                # API routes
├── models/                # Database models
├── netlify.toml           # Netlify configuration
└── package.json           # Root dependencies
```

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)
- MongoDB (for backend)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd college-dispensary
   ```

2. **Install dependencies**:
   ```bash
   npm install
   cd client
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

### Production Build

```bash
cd client
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team.

---

**Birla Institute of Technology, Mesra**  
*College Dispensary Management System*