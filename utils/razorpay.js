const Razorpay = require('razorpay');
const crypto = require('crypto');

class RazorpayService {
  constructor() {
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      this.razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });
    } else {
      console.warn('Razorpay credentials not configured. Payment service will not work.');
      this.razorpay = null;
    }
  }

  // Create order for deposit
  async createDepositOrder(amount, currency = 'INR', receipt = null) {
    if (!this.razorpay) {
      throw new Error('Razorpay not configured');
    }

    try {
      const options = {
        amount: amount * 100, // Razorpay expects amount in paisa
        currency: currency,
        receipt: receipt || `receipt_${Date.now()}`,
        payment_capture: 1
      };

      const order = await this.razorpay.orders.create(options);
      return {
        success: true,
        order: order
      };
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Create order for plan purchase
  async createPlanOrder(planAmount, planName, userId, currency = 'INR') {
    if (!this.razorpay) {
      throw new Error('Razorpay not configured');
    }

    try {
      const options = {
        amount: planAmount * 100, // Convert to paisa
        currency: currency,
        receipt: `plan_${planName}_${userId}_${Date.now()}`,
        payment_capture: 1,
        notes: {
          plan_name: planName,
          user_id: userId,
          purpose: 'plan_purchase'
        }
      };

      const order = await this.razorpay.orders.create(options);
      return {
        success: true,
        order: order
      };
    } catch (error) {
      console.error('Error creating plan purchase order:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Verify payment signature
  verifyPaymentSignature(orderCreationId, razorpayPaymentId, razorpaySignature) {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(orderCreationId + '|' + razorpayPaymentId)
        .digest('hex');

      return expectedSignature === razorpaySignature;
    } catch (error) {
      console.error('Error verifying payment signature:', error);
      return false;
    }
  }

  // Get payment details
  async getPaymentDetails(paymentId) {
    if (!this.razorpay) {
      throw new Error('Razorpay not configured');
    }

    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return {
        success: true,
        payment: payment
      };
    } catch (error) {
      console.error('Error fetching payment details:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get order details
  async getOrderDetails(orderId) {
    if (!this.razorpay) {
      throw new Error('Razorpay not configured');
    }

    try {
      const order = await this.razorpay.orders.fetch(orderId);
      return {
        success: true,
        order: order
      };
    } catch (error) {
      console.error('Error fetching order details:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Refund payment
  async createRefund(paymentId, amount = null, reason = 'requested_by_customer') {
    if (!this.razorpay) {
      throw new Error('Razorpay not configured');
    }

    try {
      const refundData = {
        payment_id: paymentId,
        notes: {
          reason: reason,
          timestamp: new Date().toISOString()
        }
      };

      // If amount is specified, add it (in paisa)
      if (amount) {
        refundData.amount = amount * 100;
      }

      const refund = await this.razorpay.payments.refund(paymentId, refundData);
      return {
        success: true,
        refund: refund
      };
    } catch (error) {
      console.error('Error creating refund:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Create contact for fund account (for withdrawals)
  async createContact(name, email, contact, type = 'customer') {
    if (!this.razorpay) {
      throw new Error('Razorpay not configured');
    }

    try {
      const contactData = {
        name: name,
        email: email,
        contact: contact,
        type: type
      };

      const razorpayContact = await this.razorpay.contacts.create(contactData);
      return {
        success: true,
        contact: razorpayContact
      };
    } catch (error) {
      console.error('Error creating contact:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Create fund account for withdrawals
  async createFundAccount(contactId, accountType, accountDetails) {
    if (!this.razorpay) {
      throw new Error('Razorpay not configured');
    }

    try {
      const fundAccountData = {
        contact_id: contactId,
        account_type: accountType, // 'bank_account', 'vpa', 'card'
        ...accountDetails
      };

      const fundAccount = await this.razorpay.fundAccount.create(fundAccountData);
      return {
        success: true,
        fundAccount: fundAccount
      };
    } catch (error) {
      console.error('Error creating fund account:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Create payout for withdrawal
  async createPayout(fundAccountId, amount, currency = 'INR', mode = 'IMPS', purpose = 'payout', reference_id = null) {
    if (!this.razorpay) {
      throw new Error('Razorpay not configured');
    }

    try {
      const payoutData = {
        account_number: process.env.RAZORPAY_ACCOUNT_NUMBER, // Your Razorpay account number
        fund_account_id: fundAccountId,
        amount: amount * 100, // Convert to paisa
        currency: currency,
        mode: mode, // IMPS, NEFT, RTGS, UPI
        purpose: purpose,
        queue_if_low_balance: true,
        reference_id: reference_id || `payout_${Date.now()}`,
        narration: 'Micro Tasks App Withdrawal'
      };

      const payout = await this.razorpay.payouts.create(payoutData);
      return {
        success: true,
        payout: payout
      };
    } catch (error) {
      console.error('Error creating payout:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get payout status
  async getPayoutStatus(payoutId) {
    if (!this.razorpay) {
      throw new Error('Razorpay not configured');
    }

    try {
      const payout = await this.razorpay.payouts.fetch(payoutId);
      return {
        success: true,
        payout: payout
      };
    } catch (error) {
      console.error('Error fetching payout status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Validate webhook signature
  validateWebhookSignature(webhookBody, webhookSignature, webhookSecret) {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(webhookBody)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(webhookSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('Error validating webhook signature:', error);
      return false;
    }
  }

  // Process webhook event
  async processWebhookEvent(event) {
    console.log('Processing Razorpay webhook event:', event.event);

    try {
      switch (event.event) {
        case 'payment.authorized':
          return await this.handlePaymentAuthorized(event.payload.payment.entity);

        case 'payment.captured':
          return await this.handlePaymentCaptured(event.payload.payment.entity);

        case 'payment.failed':
          return await this.handlePaymentFailed(event.payload.payment.entity);

        case 'order.paid':
          return await this.handleOrderPaid(event.payload.order.entity);

        case 'payout.processed':
          return await this.handlePayoutProcessed(event.payload.payout.entity);

        case 'payout.failed':
          return await this.handlePayoutFailed(event.payload.payout.entity);

        case 'payout.reversed':
          return await this.handlePayoutReversed(event.payload.payout.entity);

        default:
          console.log('Unhandled webhook event:', event.event);
          return { success: true, message: 'Event logged but not processed' };
      }
    } catch (error) {
      console.error('Error processing webhook event:', error);
      return { success: false, error: error.message };
    }
  }

  async handlePaymentAuthorized(payment) {
    console.log('Payment authorized:', payment.id);
    // Update transaction status to authorized
    return { success: true };
  }

  async handlePaymentCaptured(payment) {
    console.log('Payment captured:', payment.id);
    // Update transaction status to completed
    // Credit amount to user wallet
    return { success: true };
  }

  async handlePaymentFailed(payment) {
    console.log('Payment failed:', payment.id);
    // Update transaction status to failed
    // Send notification to user
    return { success: true };
  }

  async handleOrderPaid(order) {
    console.log('Order paid:', order.id);
    // Process order completion
    return { success: true };
  }

  async handlePayoutProcessed(payout) {
    console.log('Payout processed:', payout.id);
    // Update withdrawal status to completed
    // Send confirmation to user
    return { success: true };
  }

  async handlePayoutFailed(payout) {
    console.log('Payout failed:', payout.id);
    // Update withdrawal status to failed
    // Refund amount to user wallet
    // Send notification to user
    return { success: true };
  }

  async handlePayoutReversed(payout) {
    console.log('Payout reversed:', payout.id);
    // Handle payout reversal
    // Refund amount to user wallet
    return { success: true };
  }

  // Helper method to calculate withdrawal fees and taxes
  calculateWithdrawalAmount(amount, userPlan = 'free') {
    const baseTaxRate = parseFloat(process.env.WITHDRAWAL_TAX_RATE) || 0.05; // 5%
    
    // Plan-based fee discounts
    const feeDiscounts = {
      'free': 0,
      'baby': 0,
      'basic': 0.05, // 5% discount
      'gold': 0.10,  // 10% discount
      'star': 0.15   // 15% discount
    };

    const discount = feeDiscounts[userPlan] || 0;
    const effectiveTaxRate = baseTaxRate * (1 - discount);
    
    const tax = amount * effectiveTaxRate;
    const netAmount = amount - tax;

    return {
      originalAmount: amount,
      tax: Math.round(tax * 100) / 100,
      netAmount: Math.round(netAmount * 100) / 100,
      taxRate: effectiveTaxRate,
      discount: discount
    };
  }

  // Get supported banks for NEFT/RTGS
  getSupportedBanks() {
    return [
      'State Bank of India',
      'HDFC Bank',
      'ICICI Bank',
      'Axis Bank',
      'Kotak Mahindra Bank',
      'Punjab National Bank',
      'Bank of Baroda',
      'Canara Bank',
      'Union Bank of India',
      'Bank of India',
      'Central Bank of India',
      'Indian Overseas Bank',
      'UCO Bank',
      'Indian Bank',
      'Punjab & Sind Bank'
      // Add more banks as needed
    ];
  }
}

module.exports = new RazorpayService();