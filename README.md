# Micro Tasks & Rewards Web Application

A full-featured modern web application for micro task completion and rewards management with admin dashboard.

## Features

### User Features
- 🔐 **Secure Authentication System**
  - Registration with email/phone verification
  - Login with multiple failed attempt protection
  - Password reset via email/SMS OTP
  - Account unlock system with OTP verification
  - Referral system integration
  - One device per user restriction

- 💰 **Dual Wallet System**
  - Points wallet for task rewards
  - INR wallet for real money
  - 100 points = 1 Rupee conversion
  - Razorpay integration for deposits/withdrawals
  - Minimum deposit: ₹50, Minimum withdrawal: ₹50
  - 5% withdrawal tax with plan-based discounts

- 📋 **Micro Tasks System**
  - 15 daily tasks for free users
  - Task progress tracking
  - Multiple task types (surveys, data entry, social media, etc.)
  - Plan-based task limit increases
  - Task approval/rejection system

- 🎯 **Subscription Plans**
  - Baby Plan: ₹50 (requires referral, +10 tasks/day)
  - Basic Plan: ₹100 (+20 tasks/day, 15% bonus)
  - Gold Plan: ₹200 (+40 tasks/day, 25% bonus)
  - Star Plan: ₹300 (+60 tasks/day, 50% bonus)
  - 30-day validity with auto-expiry

- 👥 **Referral System**
  - Unique referral codes and links
  - ₹500 signup bonus for referred users
  - ₹500 bonus for referrer
  - 10% commission on referral earnings
  - Referral network management

- 🔔 **Notification System**
  - Real-time in-app notifications
  - Email and SMS notifications
  - Push notifications support
  - Notification preferences

- 👤 **Profile & KYC System**
  - Email and phone verification
  - Aadhar and PAN verification
  - Liveness test for advanced KYC
  - Bank details verification
  - Profile image upload

- 📱 **Responsive Design**
  - Mobile-first responsive design
  - PWA support
  - Works on all devices

- 📝 **Blog System**
  - Full-featured blog with admin panel
  - Social media sharing (FB, Instagram, X, WhatsApp, Telegram)
  - Copy link functionality
  - SEO optimized

### Admin Features
- 📊 **Admin Dashboard**
- 👥 **User Management**
- 📋 **Task Management**
- 💰 **Transaction Management**
- 🔔 **Notification Management**
- 📝 **Blog Management**
- 📈 **Analytics & Reports**

## Technology Stack

### Backend
- **Node.js** with **Express.js**
- **MongoDB** with **Mongoose**
- **JWT** for authentication
- **Socket.IO** for real-time features
- **Razorpay** for payments
- **Twilio** for SMS
- **Nodemailer** for emails
- **Cloudinary** for image storage
- **Cron** for scheduled tasks

### Frontend
- **Vanilla JavaScript** (SPA architecture)
- **HTML5** with semantic markup
- **CSS3** with modern features
- **Font Awesome** for icons
- **Socket.IO Client** for real-time updates

### Security
- **Helmet.js** for security headers
- **Rate limiting** for API protection
- **Input validation** with express-validator
- **Password hashing** with bcrypt
- **CORS** protection
- **Session management**

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- Redis (optional, for session storage)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd micro-tasks-rewards-app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory and copy the contents from `.env.example`:

```bash
cp .env.example .env
```

Edit the `.env` file with your actual configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/micro-tasks-app

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Email Configuration (Gmail)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Session Secret
SESSION_SECRET=your_session_secret_key

# Other configurations...
```

### 4. Database Setup
Start MongoDB service and create the database:

```bash
# Start MongoDB (varies by OS)
sudo systemctl start mongod  # Linux
brew services start mongodb  # macOS

# The database will be created automatically when the app starts
```

### 5. Start the Application

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

The application will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/verify-phone` - Phone verification
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/upload-avatar` - Upload profile picture
- `POST /api/users/kyc` - Submit KYC documents

### Wallet
- `GET /api/wallet` - Get wallet details
- `POST /api/wallet/deposit` - Create deposit order
- `POST /api/wallet/withdraw` - Request withdrawal
- `POST /api/wallet/convert` - Convert points to INR or vice versa
- `GET /api/wallet/transactions` - Get transaction history

### Tasks
- `GET /api/tasks` - Get available tasks
- `POST /api/tasks/:id/start` - Start a task
- `POST /api/tasks/:id/submit` - Submit task completion
- `GET /api/tasks/my-tasks` - Get user's task history

### Plans
- `GET /api/plans` - Get available plans
- `POST /api/plans/:id/purchase` - Purchase a plan

### Referral
- `GET /api/referral` - Get referral information
- `POST /api/referral/generate-link` - Generate referral link

### Blog
- `GET /api/blog/posts` - Get blog posts
- `GET /api/blog/posts/:slug` - Get single blog post
- `POST /api/blog/posts/:id/share` - Track social shares

### Admin (Protected)
- `GET /api/admin/dashboard` - Admin dashboard data
- `GET /api/admin/users` - Manage users
- `GET /api/admin/tasks` - Manage tasks
- `GET /api/admin/transactions` - Manage transactions

## Project Structure

```
micro-tasks-rewards-app/
├── models/           # MongoDB models
├── routes/           # API routes
├── middleware/       # Custom middleware
├── utils/            # Utility functions
├── public/           # Static frontend files
│   ├── css/         # Stylesheets
│   ├── js/          # JavaScript files
│   └── images/      # Images and assets
├── uploads/          # File uploads
├── server.js         # Main server file
├── package.json      # Dependencies
├── .env.example      # Environment template
└── README.md         # This file
```

## Key Features Implementation

### 1. Referral System
- Automatic referral code generation
- Signup bonuses for both referrer and referee
- 10% commission on all referral earnings
- Baby plan restriction (requires referral)

### 2. Security Features
- Device-based account restrictions
- Multiple login attempt protection
- Account locking with OTP unlock
- JWT token authentication
- Password hashing with bcrypt

### 3. Payment Integration
- Razorpay for deposits and withdrawals
- Dual wallet system (Points + INR)
- Automatic conversion rates
- Withdrawal tax calculations
- Plan-based fee discounts

### 4. Task Management
- Daily task limits with plan upgrades
- Task progress tracking
- Automatic daily reset (cron job)
- Plan-based bonus multipliers

### 5. Notification System
- Real-time Socket.IO notifications
- Email notifications with templates
- SMS notifications via Twilio
- In-app notification center

## Deployment

### Environment Variables for Production
Make sure to set all environment variables in your production environment.

### Database
Ensure MongoDB is properly configured with appropriate indexes and backups.

### Security Considerations
- Use HTTPS in production
- Set secure environment variables
- Configure proper CORS settings
- Set up rate limiting
- Enable MongoDB authentication

### Performance Optimization
- Enable MongoDB indexes
- Use Redis for session storage (optional)
- Implement caching for frequently accessed data
- Optimize images and assets

## Cron Jobs

The application includes several automated tasks:
- Daily task reset (midnight IST)
- Plan expiry checks (hourly)
- Expired notification cleanup (daily)
- User statistics updates (daily)
- OTP and token cleanup (every 30 minutes)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Email: support@microtasks.com
- Documentation: [Link to detailed docs]
- Issues: [GitHub Issues](link-to-issues)

## Roadmap

- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] API for third-party integrations
- [ ] Multi-language support
- [ ] Advanced fraud detection
- [ ] Gamification features