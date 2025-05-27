// studentVerification.controller.js
const StudentVerification = require('../models/student.model');
const User = require('../models/user.model');
const { cloudinary } = require('../config/cloudinary');
const { uploadToCloudinary } = require('../utils/cloudinayUpload');
const { sendVerificationRequestEmail, sendVerificationResultEmail } = require('../utils/emailService');

exports.submitVerification = async (req, res) => {
  try {
    const { name, studentId, institutionName } = req.body;
    const userId = req.user._id;

    // Fetch user details to get email
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const existingRequest = await StudentVerification.findOne({ user: userId });
    if (existingRequest && existingRequest.status === 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending verification request'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload your student ID'
      });
    }

    // Upload to Cloudinary
    const cloudinaryFolder = `student-verification/${userId}`;
    const result = await uploadToCloudinary(req.file.path, cloudinaryFolder);

    const newVerification = new StudentVerification({
      user: userId,
      name,
      studentId,
      institutionName,
      proofDocument: result.secure_url,
      cloudinaryPublicId: result.public_id
    });

    await User.findByIdAndUpdate(userId, {
      isStudent: true
    });

    await newVerification.save();

    // Send email notification to admin
    await sendVerificationRequestEmail(newVerification, user.email);

    return res.status(201).json({
      success: true,
      message: 'Student verification request submitted successfully',
      verification: {
        id: newVerification._id,
        status: newVerification.status,
        createdAt: newVerification.createdAt,
        documentUrl: result.secure_url
      }
    });
  } catch (error) {
    console.error('Error submitting verification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit verification request',
      error: error.message
    });
  }
};

// Check verification status
exports.checkVerificationStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get the most recent verification request
    const verification = await StudentVerification.findOne({ user: userId })
      .sort({ createdAt: -1 });

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'No verification request found'
      });
    }

    return res.status(200).json({
      success: true,
      verification: {
        id: verification._id,
        status: verification.status,
        createdAt: verification.createdAt,
        updatedAt: verification.updatedAt,
        rejectionReason: verification.rejectionReason
      }
    });
  } catch (error) {
    console.error('Error checking verification status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check verification status',
      error: error.message
    });
  }
};
// Get all pending verification requests (admin only)
exports.getPendingVerifications = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 4; // Use the query parameter 'limit' or default to 4

    const recentVerifications = await StudentVerification.find({ status: 'Pending' })
      .sort({ createdAt: -1 })
      .populate('user', 'name email profilePicUrl studentVerified isStudent')
      .limit(limit); // Use the dynamic limit here

    const filtered = recentVerifications
      .filter(v => v.user?.isStudent) // Only include those with isStudent: true

    const formattedVerifications = filtered.map(v => ({
      _id: v._id,
      name: v.name || 'N/A',
      email: v.user?.email || 'N/A',
      profilePicUrl: v.user?.profilePicUrl || '',
      studentId: v.studentId,
      institutionName: v.institutionName,
      proofDocument: v.proofDocument,
      status: v.status,
      verificationDate: v.createdAt
    }));

    return res.status(200).json({
      success: true,
      verifications: formattedVerifications
    });
  } catch (error) {
    console.error('Error fetching student verifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch student verifications',
      error: error.message
    });
  }
};

// Approve a verification request (admin only)
exports.approveVerification = async (req, res) => {
  try {
    const { verificationId } = req.params;

    const verification = await StudentVerification.findById(verificationId);
    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Verification request not found'
      });
    }

    // Get user email for notification
    const user = await User.findById(verification.user);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update verification status
    verification.status = 'Approved';
    verification.verifiedAt = new Date();
    await verification.save();

    // Update user as verified student
    await User.findByIdAndUpdate(verification.user, {
      studentVerified: true
    });

    // Send approval email to student
    await sendVerificationResultEmail(verification, user.email, true);

    return res.status(200).json({
      success: true,
      message: 'Student verification approved successfully',
      verification: {
        id: verification._id,
        status: verification.status,
        verifiedAt: verification.verifiedAt
      }
    });
  } catch (error) {
    console.error('Error approving verification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to approve verification',
      error: error.message
    });
  }
};

// Reject a verification request (admin only)
exports.rejectVerification = async (req, res) => {
  try {
    const { verificationId } = req.params;
    const { rejectionReason } = req.body;

    const verification = await StudentVerification.findById(verificationId);
    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Verification request not found'
      });
    }

    // Get user email for notification
    const user = await User.findById(verification.user);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update verification status
    verification.status = 'Rejected';
    verification.rejectionReason = rejectionReason || 'No reason provided';
    verification.verifiedAt = new Date();
    await verification.save();

    // Send rejection email to student
    await sendVerificationResultEmail(verification, user.email, false);

    return res.status(200).json({
      success: true,
      message: 'Student verification rejected',
      verification: {
        id: verification._id,
        status: verification.status,
        rejectionReason: verification.rejectionReason
      }
    });
  } catch (error) {
    console.error('Error rejecting verification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reject verification',
      error: error.message
    });
  }
};