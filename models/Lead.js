const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema(
  {
    clientName: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true
    },
    companyName: {
      type: String,
      trim: true
    },
    budget: {
      type: String,
      required: [true, 'Budget is required'],
      enum: {
        values: ['Less than $52', '$52-$73', '$73-$100', '$100+'],
        message: '{VALUE} is not a valid budget option'
      }
    },
    projectType: {
      type: String,
      required: [true, 'Project type is required'],
      enum: {
        values: ['E-commerce', 'SaaS', 'Custom API Integration', 'MVP', 'Other'],
        message: '{VALUE} is not a valid project type'
      }
    },
    coreFeatures: {
      type: [String],
      default: []
    },
    readiness: {
      type: String,
      required: [true, 'Readiness status is required'],
      enum: {
        values: ['Just an idea', 'I have a detailed brief/wireframes', 'Ready to start coding immediately'],
        message: '{VALUE} is not a valid readiness state'
      }
    },
    status: {
      type: String,
      default: 'New',
      enum: {
        values: ['New', 'Reviewed', 'Contacted', 'Archived'],
        message: '{VALUE} is not a valid status option'
      }
    },
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Lead', LeadSchema);
