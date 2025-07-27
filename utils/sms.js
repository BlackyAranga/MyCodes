const twilio = require('twilio');

class SMSService {
  constructor() {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    } else {
      console.warn('Twilio credentials not configured. SMS service will not work.');
      this.client = null;
    }
  }

  async sendSMS(to, message) {
    if (!this.client) {
      console.error('SMS service not configured');
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      // Ensure phone number is in international format
      const formattedNumber = this.formatPhoneNumber(to);
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: formattedNumber
      });

      console.log('SMS sent successfully:', result.sid);
      return { success: true, sid: result.sid };
    } catch (error) {
      console.error('SMS sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  formatPhoneNumber(phone) {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If it starts with 0, replace with +91 (India)
    if (cleaned.startsWith('0')) {
      cleaned = '+91' + cleaned.substring(1);
    }
    // If it doesn't start with +, add +91 (India)
    else if (!cleaned.startsWith('+')) {
      cleaned = '+91' + cleaned;
    }
    
    return cleaned;
  }

  // SMS templates
  getSMSTemplate(type, data) {
    const templates = {
      phoneVerification: (data) =>
        `Your Micro Tasks App verification code is: ${data.otp}. Valid for 10 minutes. Do not share this code with anyone.`,
      
      accountUnlock: (data) =>
        `Your Micro Tasks App account unlock code is: ${data.otp}. Valid for 10 minutes. Use this to unlock your account.`,
      
      passwordReset: (data) =>
        `Your Micro Tasks App password reset code is: ${data.otp}. Valid for 10 minutes. Keep this code secure.`,
      
      taskApproved: (data) =>
        `🎉 Task approved! You earned ${data.pointsEarned} points. New balance: ${data.newBalance} points. Keep earning!`,
      
      withdrawalApproved: (data) =>
        `💸 Withdrawal approved! ₹${data.netAmount} will be credited to your account in 2-3 business days. ID: ${data.transactionId}`,
      
      kycApproved: (data) =>
        `✅ KYC verification complete! Your account is now fully verified. Enjoy higher limits and premium features.`,
      
      referralJoined: (data) =>
        `👥 ${data.referredUserName} joined using your referral! You earned ${data.bonusPoints} points. Total referrals: ${data.totalReferrals}`,
      
      planPurchased: (data) =>
        `🚀 ${data.planName} plan activated! Enjoy increased task limits and bonus rewards. Valid until ${data.expiryDate}`,
      
      lowBalance: (data) =>
        `💰 Your wallet balance is low (${data.balance} points). Complete more tasks to earn more rewards!`,
      
      planExpiring: (data) =>
        `⏰ Your ${data.planName} plan expires in ${data.daysLeft} days. Renew now to continue enjoying premium benefits.`,
      
      securityAlert: (data) =>
        `🔒 Security Alert: ${data.action} detected on your account at ${data.timestamp}. If this wasn't you, contact support immediately.`
    };

    return templates[type] ? templates[type](data) : null;
  }

  // Send specific SMS types
  async sendPhoneVerificationSMS(phone, otp) {
    const message = this.getSMSTemplate('phoneVerification', { otp });
    return this.sendSMS(phone, message);
  }

  async sendAccountUnlockSMS(phone, otp) {
    const message = this.getSMSTemplate('accountUnlock', { otp });
    return this.sendSMS(phone, message);
  }

  async sendPasswordResetSMS(phone, otp) {
    const message = this.getSMSTemplate('passwordReset', { otp });
    return this.sendSMS(phone, message);
  }

  async sendTaskApprovedSMS(phone, taskData) {
    const message = this.getSMSTemplate('taskApproved', {
      pointsEarned: taskData.pointsEarned,
      newBalance: taskData.newBalance
    });
    return this.sendSMS(phone, message);
  }

  async sendWithdrawalApprovedSMS(phone, transactionData) {
    const message = this.getSMSTemplate('withdrawalApproved', {
      netAmount: transactionData.netAmount,
      transactionId: transactionData.transactionId
    });
    return this.sendSMS(phone, message);
  }

  async sendKYCApprovedSMS(phone) {
    const message = this.getSMSTemplate('kycApproved', {});
    return this.sendSMS(phone, message);
  }

  async sendReferralJoinedSMS(phone, referralData) {
    const message = this.getSMSTemplate('referralJoined', {
      referredUserName: referralData.referredUserName,
      bonusPoints: referralData.bonusPoints,
      totalReferrals: referralData.totalReferrals
    });
    return this.sendSMS(phone, message);
  }

  async sendPlanPurchasedSMS(phone, planData) {
    const message = this.getSMSTemplate('planPurchased', {
      planName: planData.displayName,
      expiryDate: new Date(planData.expiryDate).toLocaleDateString()
    });
    return this.sendSMS(phone, message);
  }

  async sendSecurityAlertSMS(phone, alertData) {
    const message = this.getSMSTemplate('securityAlert', {
      action: alertData.action,
      timestamp: new Date().toLocaleString()
    });
    return this.sendSMS(phone, message);
  }

  async sendLowBalanceReminder(phone, balance) {
    const message = this.getSMSTemplate('lowBalance', { balance });
    return this.sendSMS(phone, message);
  }

  async sendPlanExpiringReminder(phone, planData) {
    const message = this.getSMSTemplate('planExpiring', {
      planName: planData.planName,
      daysLeft: planData.daysLeft
    });
    return this.sendSMS(phone, message);
  }

  // Bulk SMS for promotional messages
  async sendBulkSMS(phoneNumbers, message, batchSize = 100) {
    if (!this.client) {
      return { success: false, error: 'SMS service not configured' };
    }

    const results = [];
    const batches = [];
    
    // Split into batches
    for (let i = 0; i < phoneNumbers.length; i += batchSize) {
      batches.push(phoneNumbers.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(phone => this.sendSMS(phone, message));
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        results.push({
          phone: batch[index],
          success: result.status === 'fulfilled' && result.value.success,
          error: result.status === 'rejected' ? result.reason : result.value.error
        });
      });

      // Add delay between batches to avoid rate limiting
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return {
      success: true,
      totalSent: phoneNumbers.length,
      successful,
      failed,
      results
    };
  }

  // Validate phone number format
  validatePhoneNumber(phone) {
    const phoneRegex = /^(\+91|91|0)?[6-9]\d{9}$/;
    const cleaned = phone.replace(/\D/g, '');
    return phoneRegex.test(cleaned);
  }
}

module.exports = new SMSService();