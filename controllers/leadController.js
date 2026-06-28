const mongoose = require('mongoose');
const Lead = require('../models/Lead');

/**
 * @desc    Create a new client onboarding lead
 * @route   POST /api/leads
 * @access  Public
 */
const createLead = async (req, res) => {
  try {
    const {
      clientName,
      companyName,
      budget,
      projectType,
      coreFeatures,
      readiness,
      notes
    } = req.body;

    // 1. Basic Presence Validation
    const missingFields = [];
    if (!clientName) missingFields.push('clientName');
    if (!budget) missingFields.push('budget');
    if (!projectType) missingFields.push('projectType');
    if (!readiness) missingFields.push('readiness');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Validation failed: Missing required fields: ${missingFields.join(', ')}.`
      });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable. Please try again shortly.'
      });
    }

    // 2. Database Operation - Instantiate and save
    const newLead = new Lead({
      clientName,
      companyName,
      budget,
      projectType,
      coreFeatures,
      readiness,
      notes
    });

    const savedLead = await newLead.save();

    // 3. Response - Return 201 status with success message and lead ID
    return res.status(201).json({
      success: true,
      message: 'Lead onboarding form submitted successfully.',
      leadId: savedLead._id,
      data: savedLead
    });

  } catch (error) {
    // 4. Error Handling - Catch Mongoose validation errors specifically
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Database validation failed.',
        errors: messages
      });
    }

    // Catch general server errors
    console.error('Error in createLead controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
};

module.exports = {
  createLead
};
