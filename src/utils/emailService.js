// utils/emailService.js
const nodemailer = require('nodemailer');
const crypto = require('crypto');


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_STETH,
      pass: process.env.EMAIL_STETH_PASS
    }
  });

// Email for new verification request to admin
exports.sendVerificationRequestEmail = async (verification, studentEmail) => {
  try {
    const mailOptions = {
        from: process.env.EMAIL_STETH,  // Use the correct variable here too
        to: process.env.EMAIL_ADMIN,
      subject: 'New Student Verification Request',
      html: `
        <h2>New Student Verification Request</h2>
        <p><strong>Student Name:</strong> ${verification.name}</p>
        <p><strong>Institution:</strong> ${verification.institutionName}</p>
        <p><strong>Student ID:</strong> ${verification.studentId}</p>
        <p><strong>Email:</strong> ${studentEmail}</p>
        <p>Please review this request in the admin dashboard.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Verification request email sent to admin');
  } catch (error) {
    console.error('Error sending verification request email:', error);
  }
};

// Email for verification result to student
exports.sendVerificationResultEmail = async (verification, studentEmail, isApproved) => {
  try {
    const subject = isApproved 
      ? 'Your Student Verification is Approved' 
      : 'Your Student Verification was Rejected';
    
    const message = isApproved
      ? `
        <h2>Student Verification Approved</h2>
        <p>Congratulations! Your student verification for ${verification.institutionName} has been approved.</p>
        <p>You now have access to all student benefits on our platform.</p>
        <p>Thank you for verifying your student status.</p>
      `
      : `
        <h2>Student Verification Rejected</h2>
        <p>We're sorry, but your student verification request has been rejected.</p>
        <p><strong>Reason:</strong> ${verification.rejectionReason || 'No specific reason provided'}</p>
        <p>You may submit a new verification request with updated information if you wish.</p>
      `;

    const mailOptions = {
        from: process.env.EMAIL_STETH,  // Use the correct variable here
        to: studentEmail,
      subject: subject,
      html: message
    };

    await transporter.sendMail(mailOptions);
    console.log('Verification result email sent to student');
  } catch (error) {
    console.error('Error sending verification result email:', error);
  }
};

// Email for new order notification to admin
exports.sendNewOrderEmailToAdmin = async (order, userEmail) => {
    try {
      // Format order items for better readability
      const itemsList = order.items.map(item => `
        <tr>
          <td>${item.productName || 'Product'}</td>
          <td>${item.color || 'N/A'}</td>
          <td>${item.size || 'N/A'}</td>
          <td>${item.quantity}</td>
          <td>PKR ${item.price.toFixed(2)}</td>
          <td>PKR ${order.total.toFixed(2)}</td>
        </tr>
      `).join('');
  
      const mailOptions = {
        from: process.env.EMAIL_STETH,
        to: process.env.EMAIL_ADMIN,
        subject: `New Order #${order._id}`,
        html: `
          <h2>New Order Received</h2>
          <p><strong>Order ID:</strong> ${order._id}</p>
          <p><strong>Customer:</strong> ${order.shippingAddress.fullName}</p>
          <p><strong>Email:</strong> ${userEmail}</p>
          <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
          <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
          
          <h3>Items Ordered:</h3>
          <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">
            <tr style="background-color: #f2f2f2;">
              <th>Product</th>
              <th>Color</th>
              <th>Size</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
            ${itemsList}
          </table>
          
          <p><strong>Subtotal:</strong> PKR ${order.subtotal.toFixed(2)}</p>
          <p><strong>Discount:</strong> PKR ${order.discount.toFixed(2)} ${order.discountCode ? `(${order.discountCode})` : ''}</p>
          <p><strong>Points Used:</strong> ${order.pointsUsed}</p>
          <p><strong>Total:</strong> PKR ${order.total.toFixed(2)}</p>
          
          <h3>Shipping Address:</h3>
          <p>
            ${order.shippingAddress.fullName}<br>
            ${order.shippingAddress.addressLine1}<br>
            ${order.shippingAddress.addressLine2 ? order.shippingAddress.addressLine2 + '<br>' : ''}
            ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}<br>
            ${order.shippingAddress.country}<br>
            Phone: ${order.shippingAddress.phoneNumber}
          </p>
          
          <p>Please process this order in the admin dashboard.</p>
        `
      };
  
      await transporter.sendMail(mailOptions);
      console.log('New order email sent to admin');
    } catch (error) {
      console.error('Error sending order email to admin:', error);
    }
  };
  
  // Email for order confirmation to customer
  exports.sendOrderConfirmationToCustomer = async (order, userEmail) => {
    try {
      // Format order items for better readability
      const itemsList = order.items.map(item => `
        <tr>
          <td>${item.productName || 'Product'}</td>
          <td>${item.color || 'N/A'}</td>
          <td>${item.size || 'N/A'}</td>
          <td>${item.quantity}</td>
          <td>PKR ${item.price.toFixed(2)}</td>
          <td>PKR ${order.total.toFixed(2)}</td>
        </tr>
      `).join('');
  
      const mailOptions = {
        from: process.env.EMAIL_STETH,
        to: userEmail,
        subject: `Order Confirmed #${order._id}`,
        html: `
          <h2>Thank You for Your Order!</h2>
          <p>Hi ${order.shippingAddress.fullName},</p>
          <p>We have received your order and are processing it. Here's a summary of your purchase:</p>
          
          <p><strong>Order ID:</strong> ${order._id}</p>
          <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
          <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
          
          <h3>Items Ordered:</h3>
          <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">
            <tr style="background-color: #f2f2f2;">
              <th>Product</th>
              <th>Color</th>
              <th>Size</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
            ${itemsList}
          </table>
          
          <p><strong>Subtotal:</strong> PKR ${order.subtotal.toFixed(2)}</p>
          <p><strong>Discount:</strong> PKR ${order.discount.toFixed(2)} ${order.discountCode ? `(${order.discountCode})` : ''}</p>
          <p><strong>Points Used:</strong> ${order.pointsUsed}</p>
          <p><strong>Points Earned:</strong> ${order.pointsEarned}</p>
          <p><strong>Discounted Total:</strong> PKR ${order.total.toFixed(2)}</p>
          
          <h3>Shipping Address:</h3>
          <p>
            ${order.shippingAddress.fullName}<br>
            ${order.shippingAddress.addressLine1}<br>
            ${order.shippingAddress.addressLine2 ? order.shippingAddress.addressLine2 + '<br>' : ''}
            ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}<br>
            ${order.shippingAddress.country}<br>
            Phone: ${order.shippingAddress.phoneNumber}
          </p>
          
          <p>We'll notify you when your order ships. You can also check your order status by logging into your account.</p>
          
          <p>Thank you for shopping with us!</p>
          <p>The Steth Team</p>
        `
      };
  
      await transporter.sendMail(mailOptions);
      console.log('Order confirmation email sent to customer');
    } catch (error) {
      console.error('Error sending order confirmation email to customer:', error);
    }
  };
  
  // Email for order status update to customer
  exports.sendOrderStatusUpdateToCustomer = async (order, userEmail) => {
    try {
      // Customize message based on status
      let statusMessage = '';
      let subject = `Order #${order._id} Status Update: ${order.status}`;
      
      switch(order.status) {
        case 'Processing':
          statusMessage = 'Your order is now being processed. We are preparing your items for shipment.';
          break;
        case 'Shipped':
          statusMessage = `Your order has been shipped! ${order.trackingNumber ? `Your tracking number is: ${order.trackingNumber}` : 'You will receive tracking information shortly.'}`;
          break;
        case 'Delivered':
          statusMessage = 'Your order has been delivered. We hope you enjoy your purchase!';
          break;
        case 'Cancelled':
          statusMessage = 'Your order has been cancelled. If you have any questions, please contact our customer support.';
          subject = `Order #${order._id} Cancelled`;
          break;
        default:
          statusMessage = `Your order status has been updated to: ${order.status}`;
      }
  
      const mailOptions = {
        from: process.env.EMAIL_STETH,
        to: userEmail,
        subject: subject,
        html: `
          <h2>Order Status Update</h2>
          <p>Hi ${order.shippingAddress.fullName},</p>
          
          <p>${statusMessage}</p>
          
          <p><strong>Order ID:</strong> ${order._id}</p>
          <p><strong>New Status:</strong> ${order.status}</p>
          <p><strong>Updated On:</strong> ${new Date().toLocaleString()}</p>
          
          <p>You can view your complete order details by logging into your account.</p>
          
          <p>If you have any questions about your order, please don't hesitate to contact us.</p>
          
          <p>Thank you for shopping with Steth!</p>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`Order status update email sent to customer: ${order.status}`);
    } catch (error) {
      console.error('Error sending order status update email:', error);
    }
  };

  // OTP Functions
exports.sendOtp = async (user) => {
    try {
      const otp = crypto.randomInt(100000, 999999).toString();
      const time = 2;  // Time in minutes
      user.otp = otp;
      user.otpExpires = Date.now() + time * 60 * 1000;  
      await user.save();
  
      const mailOptions = {
        from: process.env.EMAIL_STETH,
        to: user.email,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}. It will expire in ${time} minute${time > 1 ? 's' : ''}.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Your OTP Code</h2>
            <p>Your verification code is:</p>
            <div style="background: #f4f4f4; padding: 10px; margin: 20px 0; 
                font-size: 24px; letter-spacing: 2px; text-align: center;">
              <strong>${otp}</strong>
            </div>
            <p>This code will expire in ${time} minute${time > 1 ? 's' : ''}.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
        `
      };
  
      await transporter.sendMail(mailOptions);
      console.log(`OTP sent to ${user.email}`);
    } catch (err) {
      console.error('Error sending OTP:', err);
      throw err; // Re-throw to handle in calling function
    }
  };
  
  exports.reSendOtp = async (user) => {
    try {
      const otp = crypto.randomInt(100000, 999999).toString();
      const time = 5;  // Time in minutes
      user.otp = otp;
      user.otpExpires = Date.now() + time * 60 * 1000;  
      await user.save();
  
      const mailOptions = {
        from: process.env.EMAIL_STETH,
        to: user.email,
        subject: 'Your New OTP Code',
        text: `Your new OTP code is ${otp}. It will expire in ${time} minute${time > 1 ? 's' : ''}.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New OTP Code</h2>
            <p>Your new verification code is:</p>
            <div style="background: #f4f4f4; padding: 10px; margin: 20px 0; 
                font-size: 24px; letter-spacing: 2px; text-align: center;">
              <strong>${otp}</strong>
            </div>
            <p>This code will expire in ${time} minute${time > 1 ? 's' : ''}.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
        `
      };
  
      await transporter.sendMail(mailOptions);
      console.log(`New OTP sent to ${user.email}`);
    } catch (err) {
      console.error('Error resending OTP:', err);
      throw err;
    }
  };

  // Contact form email function
  exports.sendContactFormEmail = async (name, email, message) => {
    try {
      // Email to admin with contact form details
      const adminMailOptions = {
        from: process.env.EMAIL_STETH,
        to: process.env.EMAIL_ADMIN,
        subject: 'New Contact Form Submission',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Message:</strong></p>
            <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #333;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <p style="margin-top: 20px; color: #666;">Submitted on: ${new Date().toLocaleString()}</p>
          </div>
        `
      };

      // Auto-response to the user
      const userMailOptions = {
        from: process.env.EMAIL_STETH,
        to: email,
        subject: 'Thank you for contacting us',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Thank You for Your Message</h2>
            <p>Dear ${name},</p>
            <p>We have received your message and will get back to you as soon as possible. 
               For your records, here's a copy of your message:</p>
            
            <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #333; margin: 20px 0;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            
            <p>If you have any additional questions or comments, please don't hesitate to contact us again.</p>
            <p>Best regards,<br>The Steth Team</p>
          </div>
        `
      };

      // Send both emails
      await transporter.sendMail(adminMailOptions);
      await transporter.sendMail(userMailOptions);
      
      console.log(`Contact form submission from ${email} processed`);
    } catch (error) {
      console.error('Error sending contact form emails:', error);
      throw error; // Re-throw to handle in the controller
    }
  };

// Welcome email with image for new subscribers
exports.sendWelcomeEmail = async (email) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_STETH,
      to: email,
      subject: 'Welcome to Our Newsletter!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Our Newsletter!</h2>
          <p>Thank you for subscribing to our newsletter. We're excited to have you join our community!</p>
          <img src="cid:welcome-image" alt="Welcome" style="max-width: 100%; height: auto; margin: 20px 0;">
          <p>You'll be the first to know about our latest updates, news, and special offers.</p>
          <p>Best regards,<br>The Steth Team</p>
        </div>
      `,
      attachments: [{
        filename: 'welcome.jpeg',
        path: 'src/images/welcome.jpeg',
        cid: 'welcome-image' // Content ID for referencing in HTML
      }]
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

// Send bulk email to all subscribers
exports.sendBulkEmail = async (subscribers, subject, message) => {
  try {
    const emailPromises = subscribers.map(subscriber => {
      const mailOptions = {
        from: process.env.EMAIL_STETH,
        to: subscriber.email,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">${subject}</h2>
            <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #333;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <p style="margin-top: 20px;">Best regards,<br>The Steth Team</p>
          </div>
        `
      };
      return transporter.sendMail(mailOptions);
    });

    await Promise.all(emailPromises);
    console.log(`Bulk email sent to ${subscribers.length} subscribers`);
  } catch (error) {
    console.error('Error sending bulk email:', error);
    throw error;
  }
};