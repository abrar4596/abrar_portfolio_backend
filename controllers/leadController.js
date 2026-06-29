const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const { saveToFallback } = require('../services/syncService');

const isDatabaseUnavailableError = (error) => {
  return error?.name === 'MongooseServerSelectionError'
    || error?.name === 'MongoNetworkError'
    || error?.name === 'MongoServerSelectionError'
    || error?.code === 'ECONNREFUSED'
    || error?.message?.includes('Could not connect to any servers')
    || error?.message?.includes('topology was destroyed');
};

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

    const missingFields = [];
    if (!clientName || !String(clientName).trim()) missingFields.push('clientName');
    if (!budget || !String(budget).trim()) missingFields.push('budget');
    if (!projectType || !String(projectType).trim()) missingFields.push('projectType');
    if (!readiness || !String(readiness).trim()) missingFields.push('readiness');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Validation failed: Missing required fields: ${missingFields.join(', ')}.`
      });
    }

    if (mongoose.connection.readyState !== 1) {
      console.warn('[Offline Fallback] Database connection not active. Attempting local file fallback storage...');
      const payload = {
        clientName: String(clientName).trim(),
        companyName: companyName ? String(companyName).trim() : '',
        budget: String(budget).trim(),
        projectType: String(projectType).trim(),
        coreFeatures: Array.isArray(coreFeatures) ? coreFeatures : [],
        readiness: String(readiness).trim(),
        notes: notes ? String(notes).trim() : ''
      };

      try {
        const tempId = await saveToFallback(payload);
        return res.status(201).json({
          success: true,
          message: 'Lead onboarding form submitted successfully (saved via offline backup).',
          leadId: tempId,
          data: payload
        });
      } catch (fallbackError) {
        console.error('Fatal: Both MongoDB and local file fallback failed.', fallbackError.message);
        return res.status(503).json({
          success: false,
          message: 'The submission service is temporarily unavailable because the database is unreachable. Please try again shortly.'
        });
      }
    }

    const newLead = new Lead({
      clientName: String(clientName).trim(),
      companyName: companyName ? String(companyName).trim() : '',
      budget: String(budget).trim(),
      projectType: String(projectType).trim(),
      coreFeatures: Array.isArray(coreFeatures) ? coreFeatures : [],
      readiness: String(readiness).trim(),
      notes: notes ? String(notes).trim() : ''
    });

    const savedLead = await newLead.save();

    return res.status(201).json({
      success: true,
      message: 'Lead onboarding form submitted successfully.',
      leadId: savedLead._id,
      data: savedLead
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Database validation failed.',
        errors: messages
      });
    }

    if (isDatabaseUnavailableError(error)) {
      console.warn('[Offline Fallback] Database connection unavailable during save. Attempting local file fallback storage...', error.message);
      const payload = {
        clientName: String(clientName).trim(),
        companyName: companyName ? String(companyName).trim() : '',
        budget: String(budget).trim(),
        projectType: String(projectType).trim(),
        coreFeatures: Array.isArray(coreFeatures) ? coreFeatures : [],
        readiness: String(readiness).trim(),
        notes: notes ? String(notes).trim() : ''
      };

      try {
        const tempId = await saveToFallback(payload);
        return res.status(201).json({
          success: true,
          message: 'Lead onboarding form submitted successfully (saved via offline backup).',
          leadId: tempId,
          data: payload
        });
      } catch (fallbackError) {
        console.error('Fatal: Both MongoDB and local file fallback failed.', fallbackError.message);
        return res.status(503).json({
          success: false,
          message: 'The submission service is temporarily unavailable because the database is unreachable. Please try again shortly.'
        });
      }
    }

    console.error('Error in createLead controller:', error);
    return res.status(500).json({
      success: false,
      message: 'We could not process your request right now. Please try again later.'
    });
  }
};

module.exports = {
  createLead
};
