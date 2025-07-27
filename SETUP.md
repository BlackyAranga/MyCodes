# Quick Setup Guide

This guide will help you get the Micro Tasks & Rewards Web Application up and running quickly.

## Prerequisites

Make sure you have the following installed:
- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (v4.4 or higher) - [Download here](https://www.mongodb.com/try/download/community)
- **Git** - [Download here](https://git-scm.com/)

## Quick Start (5 minutes)

1. **Clone and Install**
   ```bash
   git clone <your-repo-url>
   cd micro-tasks-rewards-app
   npm install
   ```

2. **Setup Environment**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit .env file with your details (see below)
   nano .env  # or use your preferred editor
   ```

3. **Start MongoDB**
   ```bash
   # On Ubuntu/Debian
   sudo systemctl start mongod
   
   # On macOS with Homebrew
   brew services start mongodb-community
   
   # On Windows
   # Start MongoDB as a Windows service or run mongod.exe
   ```

4. **Initialize Database**
   ```bash
   npm run setup
   ```

5. **Start Application**
   ```bash
   npm run dev
   ```

6. **Access Application**
   - Open http://localhost:3000 in your browser
   - Admin login: `admin@microtasks.com` / `Admin123!`

## Environment Configuration

Update your `.env` file with these essential variables:

```env
# Required for basic functionality
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
SESSION_SECRET=your_session_secret_key_minimum_32_characters
MONGODB_URI=mongodb://localhost:27017/micro-tasks-app

# Email (for OTP and notifications) - Use Gmail App Password
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password

# Optional: SMS (Twilio) - Free trial available
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Optional: Payments (Razorpay) - Free test account
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Optional: File uploads (Cloudinary) - Free tier available
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

## Service Setup (Optional)

### Gmail App Password (for emails)
1. Enable 2FA on your Google account
2. Go to Google Account settings → Security → App passwords
3. Generate an app password for "Mail"
4. Use this password in EMAIL_PASSWORD

### Twilio (for SMS)
1. Sign up at [Twilio](https://www.twilio.com/) (free trial available)
2. Get your Account SID and Auth Token from the console
3. Get a phone number from Twilio

### Razorpay (for payments)
1. Sign up at [Razorpay](https://razorpay.com/) (free test account)
2. Get your API keys from the dashboard
3. For production, complete KYC verification

### Cloudinary (for image uploads)
1. Sign up at [Cloudinary](https://cloudinary.com/) (free tier available)
2. Get your cloud name, API key, and secret from the dashboard

## What the Setup Script Does

The `npm run setup` command:
- ✅ Creates default subscription plans (Baby, Basic, Gold, Star)
- ✅ Creates sample tasks for testing
- ✅ Creates an admin user account
- ✅ Creates sample blog posts
- ✅ Sets up database indexes for performance
- ✅ Validates your environment configuration

## Default Accounts

After setup, you can login with:

**Admin Account:**
- Email: `admin@microtasks.com`
- Password: `Admin123!`
- Access: Full admin panel access

## Project Structure Overview

```
micro-tasks-rewards-app/
├── models/           # Database models (User, Task, etc.)
├── routes/           # API routes
├── middleware/       # Authentication & validation
├── utils/            # Email, SMS, payment utilities
├── public/           # Frontend files (HTML, CSS, JS)
├── server.js         # Main server file
├── setup.js          # Database initialization
└── .env              # Environment variables
```

## Available Scripts

```bash
npm run dev          # Start development server
npm start            # Start production server
npm run setup        # Initialize database with sample data
```

## Testing the Application

1. **Registration Flow:**
   - Go to http://localhost:3000/#register
   - Register with a test email/phone
   - Check email verification (if configured)

2. **Admin Panel:**
   - Login as admin
   - Access admin features
   - Manage users, tasks, and content

3. **Task System:**
   - Login as a regular user
   - Browse available tasks
   - Complete tasks to earn points

4. **Wallet System:**
   - View points and INR balance
   - Test point to INR conversion
   - (Payments require Razorpay setup)

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `sudo systemctl status mongod`
- Check the connection string in .env
- Verify MongoDB is accessible on the default port (27017)

### Email Not Working
- Verify Gmail app password is correct
- Check that 2FA is enabled on Google account
- Test with a simple email service first

### Application Won't Start
- Check Node.js version: `node --version` (should be v16+)
- Verify all dependencies installed: `npm install`
- Check for any error messages in the console

### Port Already in Use
- Change PORT in .env file (default is 3000)
- Or kill the process using the port: `lsof -ti:3000 | xargs kill`

## Development Tips

1. **Hot Reloading:** The dev server uses nodemon for automatic restarts
2. **Database Reset:** Run `npm run setup` again to reset sample data
3. **Logs:** Check console for detailed error messages
4. **API Testing:** Use tools like Postman to test API endpoints

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in .env
2. Use a production MongoDB instance
3. Set up proper SSL certificates
4. Configure environment variables on your hosting platform
5. Set up proper backup and monitoring

## Getting Help

- Check the main README.md for detailed documentation
- Review the API endpoints in the routes/ directory
- Examine the database models in models/ directory
- Check the console for error messages

## Next Steps

After successful setup:
1. Customize the application branding and content
2. Configure payment and SMS services for full functionality
3. Add your own tasks and content
4. Set up proper hosting and domain
5. Configure SSL and security measures for production

Happy coding! 🚀