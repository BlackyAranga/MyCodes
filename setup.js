#!/usr/bin/env node

/**
 * Setup Script for Micro Tasks & Rewards Web Application
 * This script initializes the database with default data and checks dependencies
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Plan = require('./models/Plan');
const Task = require('./models/Task');
const Blog = require('./models/Blog');

class SetupManager {
    constructor() {
        this.mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/micro-tasks-app';
    }

    async run() {
        console.log('🚀 Starting Micro Tasks App Setup...\n');

        try {
            await this.checkEnvironment();
            await this.connectDatabase();
            await this.createDefaultPlans();
            await this.createSampleTasks();
            await this.createAdminUser();
            await this.createSampleBlogPosts();
            await this.createIndexes();
            
            console.log('\n✅ Setup completed successfully!');
            console.log('\n📋 Next Steps:');
            console.log('1. Update your .env file with actual API keys and secrets');
            console.log('2. Start the development server: npm run dev');
            console.log('3. Visit http://localhost:3000 to see your application');
            console.log('4. Login with admin credentials: admin@microtasks.com / Admin123!');
            
        } catch (error) {
            console.error('❌ Setup failed:', error.message);
            console.error(error);
        } finally {
            await mongoose.disconnect();
            process.exit();
        }
    }

    async checkEnvironment() {
        console.log('🔍 Checking environment...');
        
        const requiredEnvVars = [
            'JWT_SECRET',
            'SESSION_SECRET'
        ];

        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            console.log('⚠️  Warning: Missing environment variables:', missingVars.join(', '));
            console.log('   Please update your .env file before running the application');
        }

        // Check if .env file exists
        const fs = require('fs');
        if (!fs.existsSync('.env')) {
            console.log('⚠️  .env file not found. Copying from .env.example...');
            if (fs.existsSync('.env.example')) {
                fs.copyFileSync('.env.example', '.env');
                console.log('✅ .env file created. Please update it with your actual values.');
            } else {
                console.log('❌ .env.example file not found. Please create .env manually.');
            }
        }

        console.log('✅ Environment check completed\n');
    }

    async connectDatabase() {
        console.log('🔌 Connecting to MongoDB...');
        
        try {
            await mongoose.connect(this.mongoUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            console.log('✅ Connected to MongoDB:', this.mongoUri);
            
            // Clear existing data (optional - comment out for production)
            if (process.env.NODE_ENV !== 'production') {
                await this.clearExistingData();
            }
            
        } catch (error) {
            throw new Error(`Failed to connect to MongoDB: ${error.message}`);
        }
        console.log('');
    }

    async clearExistingData() {
        console.log('🗑️  Clearing existing data...');
        
        const collections = ['users', 'plans', 'tasks', 'blogs', 'notifications', 'transactions', 'taskcompletions'];
        
        for (const collection of collections) {
            try {
                await mongoose.connection.db.collection(collection).deleteMany({});
                console.log(`   Cleared ${collection}`);
            } catch (error) {
                // Collection might not exist, which is fine
                console.log(`   ${collection} not found (this is okay)`);
            }
        }
        console.log('✅ Data cleared\n');
    }

    async createDefaultPlans() {
        console.log('📋 Creating default plans...');
        
        try {
            await Plan.createDefaultPlans();
            const plans = await Plan.find({});
            console.log(`✅ Created ${plans.length} plans:`, plans.map(p => p.displayName).join(', '));
        } catch (error) {
            throw new Error(`Failed to create plans: ${error.message}`);
        }
        console.log('');
    }

    async createSampleTasks() {
        console.log('📝 Creating sample tasks...');

        const sampleTasks = [
            {
                title: 'Complete Social Media Survey',
                description: 'Answer questions about your social media usage preferences',
                category: 'survey',
                type: 'survey',
                instructions: 'Click the link below and complete the 5-minute survey about social media habits. Provide honest and thoughtful answers.',
                targetUrl: 'https://example.com/survey/social-media',
                requirements: ['Must be 18+ years old', 'Valid email required'],
                pointsReward: 50,
                maxCompletions: 100,
                timeLimit: 30,
                difficulty: 'easy',
                minPlanRequired: 'free',
                allowedCountries: ['IN'],
                createdBy: null, // Will be set to admin user
                isApproved: true
            },
            {
                title: 'Data Entry - Product Information',
                description: 'Enter product details from images into a spreadsheet',
                category: 'data_entry',
                type: 'data_entry',
                instructions: 'You will be provided with product images. Extract and enter the product name, price, and category into the provided spreadsheet template.',
                pointsReward: 75,
                bonusPoints: 25,
                maxCompletions: 50,
                timeLimit: 45,
                difficulty: 'medium',
                minPlanRequired: 'free',
                allowedCountries: ['IN'],
                createdBy: null,
                isApproved: true
            },
            {
                title: 'Follow Instagram Business Page',
                description: 'Follow a business Instagram page and like 3 recent posts',
                category: 'social_media',
                type: 'social_follow',
                instructions: 'Follow the specified Instagram business page and like their 3 most recent posts. Provide screenshot as proof.',
                targetUrl: 'https://instagram.com/example_business',
                requirements: ['Instagram account required', 'Account must be public during verification'],
                pointsReward: 25,
                maxCompletions: 500,
                timeLimit: 15,
                difficulty: 'easy',
                minPlanRequired: 'free',
                allowedCountries: ['IN'],
                createdBy: null,
                isApproved: true
            },
            {
                title: 'Write Product Review',
                description: 'Write a detailed review for an online product',
                category: 'content_creation',
                type: 'review',
                instructions: 'Purchase and use the specified product, then write a detailed 200+ word review covering quality, value, and user experience.',
                pointsReward: 150,
                bonusPoints: 50,
                maxCompletions: 20,
                timeLimit: 120,
                difficulty: 'hard',
                minPlanRequired: 'basic',
                allowedCountries: ['IN'],
                createdBy: null,
                isApproved: true
            },
            {
                title: 'App Testing - Mobile Game',
                description: 'Test a new mobile game and provide feedback',
                category: 'testing',
                type: 'testing',
                instructions: 'Download and play the mobile game for at least 30 minutes. Provide detailed feedback on gameplay, graphics, and user experience.',
                pointsReward: 100,
                maxCompletions: 75,
                timeLimit: 60,
                difficulty: 'medium',
                minPlanRequired: 'free',
                allowedCountries: ['IN'],
                createdBy: null,
                isApproved: true
            }
        ];

        try {
            // We'll set the createdBy field after creating admin user
            for (const taskData of sampleTasks) {
                await Task.create(taskData);
            }
            console.log(`✅ Created ${sampleTasks.length} sample tasks`);
        } catch (error) {
            throw new Error(`Failed to create sample tasks: ${error.message}`);
        }
        console.log('');
    }

    async createAdminUser() {
        console.log('👤 Creating admin user...');

        const adminData = {
            username: 'admin',
            email: 'admin@microtasks.com',
            phone: '+919999999999',
            password: 'Admin123!',
            profile: {
                firstName: 'Admin',
                lastName: 'User'
            },
            role: 'super_admin',
            status: 'active',
            verification: {
                email: true,
                phone: true,
                kyc: true,
                kycLevel: 'advanced'
            }
        };

        try {
            const existingAdmin = await User.findOne({ email: adminData.email });
            if (existingAdmin) {
                console.log('✅ Admin user already exists');
            } else {
                const admin = await User.create(adminData);
                console.log('✅ Created admin user:', admin.email);
                
                // Update sample tasks to be created by admin
                await Task.updateMany(
                    { createdBy: null },
                    { createdBy: admin._id }
                );
                console.log('✅ Updated sample tasks with admin as creator');
            }
        } catch (error) {
            throw new Error(`Failed to create admin user: ${error.message}`);
        }
        console.log('');
    }

    async createSampleBlogPosts() {
        console.log('📰 Creating sample blog posts...');

        const samplePosts = [
            {
                title: 'Welcome to Micro Tasks - Your Guide to Earning Online',
                slug: 'welcome-to-micro-tasks-earning-guide',
                excerpt: 'Learn how to maximize your earnings through micro tasks and build a sustainable online income.',
                content: `
                    <h2>Welcome to the Future of Online Earning</h2>
                    <p>Micro Tasks is revolutionizing how people earn money online. With our platform, you can complete simple tasks and earn real money from the comfort of your home.</p>
                    
                    <h3>Getting Started</h3>
                    <p>Here's how to begin your earning journey:</p>
                    <ol>
                        <li>Complete your profile and verification</li>
                        <li>Browse available tasks</li>
                        <li>Complete tasks to earn points</li>
                        <li>Convert points to cash and withdraw</li>
                    </ol>
                    
                    <h3>Tips for Success</h3>
                    <p>Follow these tips to maximize your earnings:</p>
                    <ul>
                        <li>Complete tasks daily to maintain consistency</li>
                        <li>Focus on quality submissions to avoid rejections</li>
                        <li>Refer friends to earn bonus points</li>
                        <li>Consider upgrading your plan for more tasks</li>
                    </ul>
                `,
                metaTitle: 'Welcome to Micro Tasks - Start Earning Online Today',
                metaDescription: 'Complete guide to getting started with Micro Tasks platform and maximizing your online earnings through simple tasks.',
                keywords: ['micro tasks', 'online earning', 'work from home', 'passive income'],
                category: 'guide',
                tags: ['getting-started', 'earning-tips', 'guide'],
                status: 'published',
                publishedAt: new Date(),
                isFeatured: true,
                isApproved: true,
                authorName: 'Micro Tasks Team'
            },
            {
                title: '10 Proven Strategies to Maximize Your Task Earnings',
                slug: 'maximize-task-earnings-strategies',
                excerpt: 'Discover expert strategies to increase your daily earnings and make the most of your time on our platform.',
                content: `
                    <h2>Boost Your Earnings with These Proven Strategies</h2>
                    <p>Want to earn more from your micro tasks? Here are 10 proven strategies that successful users employ to maximize their income.</p>
                    
                    <h3>1. Complete Tasks Early in the Day</h3>
                    <p>Tasks are refreshed daily, and the best-paying ones often get taken quickly. Start your day early to access premium tasks.</p>
                    
                    <h3>2. Focus on High-Value Tasks</h3>
                    <p>While quantity matters, prioritize tasks with higher point rewards to maximize your hourly earnings.</p>
                    
                    <h3>3. Build Your Referral Network</h3>
                    <p>Referring friends not only gives you immediate bonuses but also provides ongoing passive income through commission earnings.</p>
                    
                    <h3>4. Upgrade Your Plan Strategically</h3>
                    <p>Calculate the ROI of upgrading your plan. Often, the increased daily task limit pays for itself quickly.</p>
                    
                    <h3>5. Maintain High Quality Standards</h3>
                    <p>Rejected tasks waste time and reduce your overall efficiency. Always read instructions carefully.</p>
                `,
                category: 'earning-tips',
                tags: ['strategies', 'earning-tips', 'productivity'],
                status: 'published',
                publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
                isTrending: true,
                isApproved: true,
                authorName: 'Micro Tasks Team'
            },
            {
                title: 'Understanding Our Referral System: Earn While You Sleep',
                slug: 'referral-system-passive-income',
                excerpt: 'Learn how our referral system works and how you can build a passive income stream by inviting friends.',
                content: `
                    <h2>The Power of Referral Marketing</h2>
                    <p>Our referral system is designed to reward users who help grow our community. Here's everything you need to know.</p>
                    
                    <h3>How It Works</h3>
                    <p>When someone joins using your referral code:</p>
                    <ul>
                        <li>They get ₹500 signup bonus</li>
                        <li>You get ₹500 referral bonus</li>
                        <li>You earn 10% commission on all their future earnings</li>
                    </ul>
                    
                    <h3>Best Practices for Referrals</h3>
                    <p>Success tips from our top referrers:</p>
                    <ol>
                        <li>Share on social media platforms</li>
                        <li>Explain the benefits clearly</li>
                        <li>Help your referrals get started</li>
                        <li>Be authentic in your recommendations</li>
                    </ol>
                `,
                category: 'tutorial',
                tags: ['referral', 'passive-income', 'tutorial'],
                status: 'published',
                publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
                isApproved: true,
                authorName: 'Micro Tasks Team'
            }
        ];

        try {
            const admin = await User.findOne({ role: 'super_admin' });
            
            for (const postData of samplePosts) {
                postData.author = admin._id;
                await Blog.create(postData);
            }
            
            console.log(`✅ Created ${samplePosts.length} sample blog posts`);
        } catch (error) {
            throw new Error(`Failed to create sample blog posts: ${error.message}`);
        }
        console.log('');
    }

    async createIndexes() {
        console.log('🔍 Creating database indexes...');

        try {
            // User indexes
            await User.collection.createIndex({ email: 1 }, { unique: true });
            await User.collection.createIndex({ phone: 1 }, { unique: true });
            await User.collection.createIndex({ username: 1 }, { unique: true });
            await User.collection.createIndex({ 'referral.code': 1 }, { unique: true });

            // Task indexes
            await Task.collection.createIndex({ isActive: 1, isApproved: 1 });
            await Task.collection.createIndex({ category: 1 });
            await Task.collection.createIndex({ minPlanRequired: 1 });

            // Blog indexes
            await Blog.collection.createIndex({ slug: 1 }, { unique: true });
            await Blog.collection.createIndex({ status: 1, isApproved: 1 });
            await Blog.collection.createIndex({ publishedAt: -1 });

            console.log('✅ Database indexes created');
        } catch (error) {
            // Indexes might already exist, which is fine
            console.log('⚠️  Some indexes already exist (this is okay)');
        }
        console.log('');
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    const setup = new SetupManager();
    setup.run();
}

module.exports = SetupManager;