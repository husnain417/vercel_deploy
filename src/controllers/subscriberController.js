const Subscriber = require('../models/Subscriber');
const emailService = require('../utils/emailService');

// Add new subscriber and send welcome email
exports.addSubscriber = async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email
        if (!email || !email.includes('@')) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        // Check if email already exists
        const existingSubscriber = await Subscriber.findOne({ email });
        if (existingSubscriber) {
            return res.status(400).json({ message: 'This email is already subscribed' });
        }

        // Create new subscriber
        const subscriber = new Subscriber({ email });
        await subscriber.save();

        // Send welcome email with image
        await emailService.sendWelcomeEmail(email);

        res.status(201).json({ 
            message: 'Successfully subscribed',
            subscriber 
        });
    } catch (error) {
        console.error('Error adding subscriber:', error);
        res.status(500).json({ message: 'Error adding subscriber' });
    }
};

// Send email to all subscribers
exports.sendBulkEmail = async (req, res) => {
    try {
        const { subject, message } = req.body;

        if (!subject || !message) {
            return res.status(400).json({ 
                message: 'Please provide both subject and message' 
            });
        }

        // Get all subscribers
        const subscribers = await Subscriber.find({});
        
        if (subscribers.length === 0) {
            return res.status(404).json({ message: 'No subscribers found' });
        }

        // Send email to all subscribers
        await emailService.sendBulkEmail(subscribers, subject, message);

        res.status(200).json({ 
            message: 'Bulk email sent successfully',
            recipientsCount: subscribers.length
        });
    } catch (error) {
        console.error('Error sending bulk email:', error);
        res.status(500).json({ message: 'Error sending bulk email' });
    }
}; 