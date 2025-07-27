const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async sendEmail(to, subject, html, text = null) {
    try {
      const mailOptions = {
        from: `"Micro Tasks App" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        text: text || this.htmlToText(html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  htmlToText(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // Email templates
  getEmailTemplate(type, data) {
    const baseTemplate = (title, content) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .otp-code { font-size: 32px; font-weight: bold; color: #667eea; text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin: 20px 0; letter-spacing: 5px; }
          .alert { padding: 15px; border-radius: 5px; margin: 20px 0; }
          .alert-success { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
          .alert-warning { background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
          .alert-danger { background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 Micro Tasks App</h1>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>© 2024 Micro Tasks App. All rights reserved.</p>
            <p>This is an automated email. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const templates = {
      welcome: (data) => baseTemplate('Welcome to Micro Tasks App!', `
        <h2>Welcome ${data.firstName || 'there'}! 🎉</h2>
        <p>Thank you for joining Micro Tasks App, your gateway to earning money through simple micro tasks!</p>
        <p>Here's what you can do to get started:</p>
        <ul>
          <li>✅ Verify your email address</li>
          <li>📱 Complete your phone verification</li>
          <li>📄 Upload your KYC documents</li>
          <li>🎯 Start completing tasks and earning money!</li>
        </ul>
        ${data.referralCode ? `
          <div class="alert alert-success">
            <h3>🎁 Your Referral Code: <strong>${data.referralCode}</strong></h3>
            <p>Share this code with friends and earn bonus points when they join!</p>
          </div>
        ` : ''}
        <a href="${process.env.FRONTEND_URL}/verify-email" class="button">Verify Email Address</a>
        <p>Happy earning!</p>
      `),

      emailVerification: (data) => baseTemplate('Verify Your Email Address', `
        <h2>Email Verification Required</h2>
        <p>Hi ${data.firstName || 'there'},</p>
        <p>Please verify your email address to complete your account setup:</p>
        <div class="otp-code">${data.otp}</div>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `),

      phoneVerification: (data) => baseTemplate('Phone Verification Code', `
        <h2>Phone Verification Required</h2>
        <p>Hi ${data.firstName || 'there'},</p>
        <p>Your phone verification code is:</p>
        <div class="otp-code">${data.otp}</div>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this message.</p>
      `),

      passwordReset: (data) => baseTemplate('Reset Your Password', `
        <h2>Password Reset Request</h2>
        <p>Hi ${data.firstName || 'there'},</p>
        <p>You requested to reset your password. Click the button below to create a new password:</p>
        <a href="${process.env.FRONTEND_URL}/reset-password?token=${data.resetToken}" class="button">Reset Password</a>
        <p>This link will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
      `),

      accountUnlock: (data) => baseTemplate('Account Unlock Instructions', `
        <h2>Account Unlock Required</h2>
        <p>Hi ${data.firstName || 'there'},</p>
        <p>Your account has been temporarily locked due to multiple failed login attempts.</p>
        <p>Use this OTP to unlock your account:</p>
        <div class="otp-code">${data.otp}</div>
        <p>This OTP will expire in 10 minutes.</p>
        <div class="alert alert-warning">
          <p><strong>Security Tip:</strong> Make sure you're using a strong password and enable two-factor authentication.</p>
        </div>
      `),

      taskApproved: (data) => baseTemplate('Task Approved! 🎉', `
        <h2>Congratulations! Your task has been approved!</h2>
        <p>Hi ${data.firstName || 'there'},</p>
        <p>Great news! Your submission for the task "<strong>${data.taskTitle}</strong>" has been approved.</p>
        <div class="alert alert-success">
          <h3>💰 Reward Earned: ${data.pointsEarned} points</h3>
          <p>New balance: ${data.newBalance} points</p>
        </div>
        <a href="${process.env.FRONTEND_URL}/tasks" class="button">View More Tasks</a>
        <p>Keep up the great work!</p>
      `),

      withdrawalApproved: (data) => baseTemplate('Withdrawal Approved! 💸', `
        <h2>Your withdrawal has been approved!</h2>
        <p>Hi ${data.firstName || 'there'},</p>
        <p>Your withdrawal request has been processed successfully.</p>
        <div class="alert alert-success">
          <h3>Amount: ₹${data.amount}</h3>
          <p>After tax (5%): ₹${data.netAmount}</p>
          <p>Transaction ID: ${data.transactionId}</p>
        </div>
        <p>The amount will be credited to your bank account within 2-3 business days.</p>
        <a href="${process.env.FRONTEND_URL}/wallet" class="button">View Wallet</a>
      `),

      kycApproved: (data) => baseTemplate('KYC Approved! ✅', `
        <h2>Your KYC verification is complete!</h2>
        <p>Hi ${data.firstName || 'there'},</p>
        <p>Congratulations! Your KYC documents have been verified successfully.</p>
        <div class="alert alert-success">
          <h3>✅ Verification Level: ${data.kycLevel}</h3>
          <p>You now have access to:</p>
          <ul>
            <li>Higher withdrawal limits</li>
            <li>Premium task plans</li>
            <li>Priority customer support</li>
          </ul>
        </div>
        <a href="${process.env.FRONTEND_URL}/plans" class="button">Explore Premium Plans</a>
      `),

      referralJoined: (data) => baseTemplate('New Referral Joined! 👥', `
        <h2>You've earned a referral bonus!</h2>
        <p>Hi ${data.firstName || 'there'},</p>
        <p>Great news! <strong>${data.referredUserName}</strong> has joined using your referral code.</p>
        <div class="alert alert-success">
          <h3>🎁 Bonus Earned: ${data.bonusPoints} points</h3>
          <p>Total referrals: ${data.totalReferrals}</p>
          <p>Total referral earnings: ${data.totalReferralEarnings} points</p>
        </div>
        <a href="${process.env.FRONTEND_URL}/referral" class="button">Share Your Code</a>
        <p>Keep sharing to earn more!</p>
      `),

      planPurchased: (data) => baseTemplate('Plan Activated! 🚀', `
        <h2>Your ${data.planName} plan is now active!</h2>
        <p>Hi ${data.firstName || 'there'},</p>
        <p>Thank you for upgrading to the ${data.planName} plan!</p>
        <div class="alert alert-success">
          <h3>Plan Benefits:</h3>
          <ul>
            ${data.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
          </ul>
          <p><strong>Valid until:</strong> ${data.expiryDate}</p>
        </div>
        <a href="${process.env.FRONTEND_URL}/tasks" class="button">Start Earning More</a>
        <p>Make the most of your upgraded plan!</p>
      `)
    };

    return templates[type] ? templates[type](data) : null;
  }

  // Send specific email types
  async sendWelcomeEmail(user) {
    const html = this.getEmailTemplate('welcome', {
      firstName: user.profile?.firstName,
      referralCode: user.referral?.code
    });
    
    return this.sendEmail(
      user.email,
      'Welcome to Micro Tasks App! 🎉',
      html
    );
  }

  async sendVerificationEmail(user, otp) {
    const html = this.getEmailTemplate('emailVerification', {
      firstName: user.profile?.firstName,
      otp
    });
    
    return this.sendEmail(
      user.email,
      'Verify Your Email Address - Micro Tasks App',
      html
    );
  }

  async sendPasswordResetEmail(user, resetToken) {
    const html = this.getEmailTemplate('passwordReset', {
      firstName: user.profile?.firstName,
      resetToken
    });
    
    return this.sendEmail(
      user.email,
      'Reset Your Password - Micro Tasks App',
      html
    );
  }

  async sendAccountUnlockEmail(user, otp) {
    const html = this.getEmailTemplate('accountUnlock', {
      firstName: user.profile?.firstName,
      otp
    });
    
    return this.sendEmail(
      user.email,
      'Account Unlock Required - Micro Tasks App',
      html
    );
  }

  async sendTaskApprovedEmail(user, taskData) {
    const html = this.getEmailTemplate('taskApproved', {
      firstName: user.profile?.firstName,
      taskTitle: taskData.title,
      pointsEarned: taskData.pointsEarned,
      newBalance: user.wallet.points
    });
    
    return this.sendEmail(
      user.email,
      'Task Approved! You earned points 🎉',
      html
    );
  }

  async sendWithdrawalApprovedEmail(user, transactionData) {
    const html = this.getEmailTemplate('withdrawalApproved', {
      firstName: user.profile?.firstName,
      amount: transactionData.amount,
      netAmount: transactionData.netAmount,
      transactionId: transactionData.transactionId
    });
    
    return this.sendEmail(
      user.email,
      'Withdrawal Approved! 💸',
      html
    );
  }

  async sendKYCApprovedEmail(user) {
    const html = this.getEmailTemplate('kycApproved', {
      firstName: user.profile?.firstName,
      kycLevel: user.verification.kycLevel
    });
    
    return this.sendEmail(
      user.email,
      'KYC Verification Complete! ✅',
      html
    );
  }

  async sendReferralJoinedEmail(user, referralData) {
    const html = this.getEmailTemplate('referralJoined', {
      firstName: user.profile?.firstName,
      referredUserName: referralData.referredUserName,
      bonusPoints: referralData.bonusPoints,
      totalReferrals: user.referral.totalReferrals,
      totalReferralEarnings: user.referral.referralEarnings
    });
    
    return this.sendEmail(
      user.email,
      'New Referral Joined! You earned bonus points 👥',
      html
    );
  }

  async sendPlanPurchasedEmail(user, planData) {
    const html = this.getEmailTemplate('planPurchased', {
      firstName: user.profile?.firstName,
      planName: planData.displayName,
      benefits: planData.features,
      expiryDate: new Date(user.plan.expiryDate).toLocaleDateString()
    });
    
    return this.sendEmail(
      user.email,
      `${planData.displayName} Plan Activated! 🚀`,
      html
    );
  }
}

module.exports = new EmailService();