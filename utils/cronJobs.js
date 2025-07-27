const cron = require('cron');
const User = require('../models/User');
const Plan = require('../models/Plan');
const Notification = require('../models/Notification');
const emailService = require('./email');
const smsService = require('./sms');

class CronJobManager {
  constructor() {
    this.jobs = [];
    this.initializeJobs();
  }

  initializeJobs() {
    // Daily task reset - runs at midnight IST (GMT+5:30)
    const dailyTaskResetJob = new cron.CronJob('0 0 * * *', this.resetDailyTasks.bind(this), null, true, 'Asia/Kolkata');
    this.jobs.push({ name: 'dailyTaskReset', job: dailyTaskResetJob });

    // Plan expiry check - runs every hour
    const planExpiryJob = new cron.CronJob('0 * * * *', this.checkPlanExpiries.bind(this), null, true, 'Asia/Kolkata');
    this.jobs.push({ name: 'planExpiry', job: planExpiryJob });

    // Send plan expiry reminders - runs daily at 9 AM IST
    const planReminderJob = new cron.CronJob('0 9 * * *', this.sendPlanExpiryReminders.bind(this), null, true, 'Asia/Kolkata');
    this.jobs.push({ name: 'planReminder', job: planReminderJob });

    // Clean expired notifications - runs daily at 2 AM IST
    const cleanNotificationsJob = new cron.CronJob('0 2 * * *', this.cleanExpiredNotifications.bind(this), null, true, 'Asia/Kolkata');
    this.jobs.push({ name: 'cleanNotifications', job: cleanNotificationsJob });

    // Update user statistics - runs daily at 3 AM IST
    const updateStatsJob = new cron.CronJob('0 3 * * *', this.updateUserStatistics.bind(this), null, true, 'Asia/Kolkata');
    this.jobs.push({ name: 'updateStats', job: updateStatsJob });

    // Clean expired OTPs and reset tokens - runs every 30 minutes
    const cleanExpiredTokensJob = new cron.CronJob('*/30 * * * *', this.cleanExpiredTokens.bind(this), null, true, 'Asia/Kolkata');
    this.jobs.push({ name: 'cleanTokens', job: cleanExpiredTokensJob });

    // Send low balance reminders - runs daily at 6 PM IST
    const lowBalanceReminderJob = new cron.CronJob('0 18 * * *', this.sendLowBalanceReminders.bind(this), null, true, 'Asia/Kolkata');
    this.jobs.push({ name: 'lowBalanceReminder', job: lowBalanceReminderJob });

    console.log(`Initialized ${this.jobs.length} cron jobs`);
  }

  async resetDailyTasks() {
    console.log('Starting daily task reset...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find users whose tasks haven't been reset today
      const usersToReset = await User.find({
        $or: [
          { 'plan.lastTaskReset': { $lt: today } },
          { 'plan.lastTaskReset': { $exists: false } }
        ]
      });

      console.log(`Found ${usersToReset.length} users to reset tasks for`);

      // Reset task counts and update timestamp
      const bulkOps = usersToReset.map(user => ({
        updateOne: {
          filter: { _id: user._id },
          update: {
            $set: {
              'plan.tasksCompletedToday': 0,
              'plan.lastTaskReset': today
            }
          }
        }
      }));

      if (bulkOps.length > 0) {
        await User.bulkWrite(bulkOps);
        console.log(`Reset tasks for ${bulkOps.length} users`);
      }

    } catch (error) {
      console.error('Error in daily task reset:', error);
    }
  }

  async checkPlanExpiries() {
    console.log('Checking plan expiries...');
    try {
      const now = new Date();
      
      // Find users with expired plans
      const expiredPlanUsers = await User.find({
        'plan.expiryDate': { $lte: now },
        'plan.current': { $ne: 'free' }
      });

      console.log(`Found ${expiredPlanUsers.length} expired plans`);

      for (const user of expiredPlanUsers) {
        const oldPlan = user.plan.current;
        
        // Reset to free plan
        user.plan.current = 'free';
        user.plan.expiryDate = undefined;
        user.plan.dailyTaskLimit = parseInt(process.env.DEFAULT_DAILY_TASKS) || 15;
        await user.save();

        // Decrement plan user count
        const plan = await Plan.findOne({ name: oldPlan });
        if (plan) {
          await plan.decrementSubscription();
        }

        // Send notification
        await Notification.createNotification({
          userId: user._id,
          type: 'plan_expired',
          title: 'Plan Expired',
          message: `Your ${oldPlan} plan has expired. You've been moved to the free plan.`,
          priority: 'medium'
        });

        console.log(`Expired plan for user: ${user.username}`);
      }

    } catch (error) {
      console.error('Error checking plan expiries:', error);
    }
  }

  async sendPlanExpiryReminders() {
    console.log('Sending plan expiry reminders...');
    try {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const oneDayFromNow = new Date();
      oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

      // Find users with plans expiring in 3 days or 1 day
      const expiringUsers = await User.find({
        'plan.current': { $ne: 'free' },
        $or: [
          { 
            'plan.expiryDate': {
              $gte: threeDaysFromNow,
              $lt: new Date(threeDaysFromNow.getTime() + 24 * 60 * 60 * 1000)
            }
          },
          {
            'plan.expiryDate': {
              $gte: oneDayFromNow,
              $lt: new Date(oneDayFromNow.getTime() + 24 * 60 * 60 * 1000)
            }
          }
        ]
      }).populate('plan.current');

      for (const user of expiringUsers) {
        const daysLeft = Math.ceil((user.plan.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
        
        // Send notification
        await Notification.createNotification({
          userId: user._id,
          type: 'plan_expired',
          title: 'Plan Expiring Soon',
          message: `Your ${user.plan.current} plan expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Renew now to continue enjoying premium benefits.`,
          priority: 'high'
        });

        // Send SMS if user prefers SMS notifications
        if (user.preferences.notifications.sms && user.verification.phone) {
          await smsService.sendPlanExpiringReminder(user.phone, {
            planName: user.plan.current,
            daysLeft
          });
        }
      }

      console.log(`Sent expiry reminders to ${expiringUsers.length} users`);

    } catch (error) {
      console.error('Error sending plan expiry reminders:', error);
    }
  }

  async cleanExpiredNotifications() {
    console.log('Cleaning expired notifications...');
    try {
      const now = new Date();
      
      const result = await Notification.deleteMany({
        expiresAt: { $lte: now }
      });

      console.log(`Deleted ${result.deletedCount} expired notifications`);

    } catch (error) {
      console.error('Error cleaning expired notifications:', error);
    }
  }

  async updateUserStatistics() {
    console.log('Updating user statistics...');
    try {
      // This can be expanded to update various user statistics
      // For now, we'll just update lastActive for users who haven't been active recently
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Mark inactive users
      await User.updateMany(
        { lastActive: { $lt: thirtyDaysAgo }, status: 'active' },
        { $set: { status: 'inactive' } }
      );

      console.log('Updated user statistics');

    } catch (error) {
      console.error('Error updating user statistics:', error);
    }
  }

  async cleanExpiredTokens() {
    console.log('Cleaning expired tokens...');
    try {
      const now = new Date();

      // Clean expired OTPs
      const otpCleanResult = await User.updateMany(
        { 'otp.expiresAt': { $lte: now } },
        { $unset: { otp: '' } }
      );

      // Clean expired password reset tokens
      const resetTokenCleanResult = await User.updateMany(
        { resetPasswordExpires: { $lte: now } },
        { 
          $unset: { 
            resetPasswordToken: '',
            resetPasswordExpires: ''
          }
        }
      );

      console.log(`Cleaned ${otpCleanResult.modifiedCount} expired OTPs and ${resetTokenCleanResult.modifiedCount} expired reset tokens`);

    } catch (error) {
      console.error('Error cleaning expired tokens:', error);
    }
  }

  async sendLowBalanceReminders() {
    console.log('Sending low balance reminders...');
    try {
      const lowBalanceThreshold = 100; // points
      
      const lowBalanceUsers = await User.find({
        'wallet.points': { $lt: lowBalanceThreshold },
        status: 'active',
        'preferences.notifications.sms': true,
        'verification.phone': true
      });

      for (const user of lowBalanceUsers) {
        // Check if reminder was sent recently to avoid spam
        const recentReminder = await Notification.findOne({
          userId: user._id,
          type: 'general',
          title: 'Low Balance Reminder',
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        });

        if (!recentReminder) {
          // Send notification
          await Notification.createNotification({
            userId: user._id,
            type: 'general',
            title: 'Low Balance Reminder',
            message: `Your wallet balance is low (${user.wallet.points} points). Complete more tasks to earn more rewards!`,
            priority: 'low'
          });

          // Send SMS
          await smsService.sendLowBalanceReminder(user.phone, user.wallet.points);
        }
      }

      console.log(`Sent low balance reminders to ${lowBalanceUsers.length} users`);

    } catch (error) {
      console.error('Error sending low balance reminders:', error);
    }
  }

  // Manual job triggers for testing
  async triggerJob(jobName) {
    const jobMap = {
      'resetDailyTasks': this.resetDailyTasks.bind(this),
      'checkPlanExpiries': this.checkPlanExpiries.bind(this),
      'sendPlanExpiryReminders': this.sendPlanExpiryReminders.bind(this),
      'cleanExpiredNotifications': this.cleanExpiredNotifications.bind(this),
      'updateUserStatistics': this.updateUserStatistics.bind(this),
      'cleanExpiredTokens': this.cleanExpiredTokens.bind(this),
      'sendLowBalanceReminders': this.sendLowBalanceReminders.bind(this)
    };

    if (jobMap[jobName]) {
      console.log(`Manually triggering job: ${jobName}`);
      await jobMap[jobName]();
      console.log(`Completed job: ${jobName}`);
    } else {
      console.log(`Job not found: ${jobName}`);
    }
  }

  stopAllJobs() {
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      console.log(`Stopped job: ${name}`);
    });
  }

  getJobStatus() {
    return this.jobs.map(({ name, job }) => ({
      name,
      running: job.running,
      lastDate: job.lastDate(),
      nextDate: job.nextDate()
    }));
  }
}

// Initialize and export the cron job manager
const cronJobManager = new CronJobManager();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Stopping cron jobs...');
  cronJobManager.stopAllJobs();
});

process.on('SIGINT', () => {
  console.log('Stopping cron jobs...');
  cronJobManager.stopAllJobs();
});

module.exports = cronJobManager;