const fs = require('fs');
const path = require('path');
const Lead = require('../models/Lead');

const FALLBACK_DIR = path.join(__dirname, '..', 'data');
const FALLBACK_FILE = path.join(FALLBACK_DIR, 'leads_fallback.json');

// Serverless-compatible file path resolution
const getFallbackFile = () => {
  if (process.env.VERCEL || process.env.NOW_REGION) {
    return path.join('/tmp', 'leads_fallback.json');
  }
  return FALLBACK_FILE;
};

/**
 * Ensures the fallback directory exists.
 */
const ensureFallbackDirectory = () => {
  // If running on Vercel, we write to /tmp, which always exists and does not require mkdir.
  if (process.env.VERCEL || process.env.NOW_REGION) {
    return;
  }
  if (!fs.existsSync(FALLBACK_DIR)) {
    fs.mkdirSync(FALLBACK_DIR, { recursive: true });
  }
};

/**
 * Saves a lead to the fallback JSON file.
 * @param {Object} leadData - The lead payload to store.
 * @returns {Promise<string>} The generated temporary lead ID.
 */
const saveToFallback = async (leadData) => {
  try {
    ensureFallbackDirectory();

    const fallbackPath = getFallbackFile();
    let leads = [];
    if (fs.existsSync(fallbackPath)) {
      try {
        const fileContent = fs.readFileSync(fallbackPath, 'utf8');
        leads = JSON.parse(fileContent);
        if (!Array.isArray(leads)) {
          leads = [];
        }
      } catch (parseError) {
        console.error('Failed to parse fallback leads file. Initializing a new array.', parseError.message);
        leads = [];
      }
    }

    const tempId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const leadWithMeta = {
      ...leadData,
      _id: tempId,
      fallbackCreatedAt: new Date().toISOString()
    };

    leads.push(leadWithMeta);
    fs.writeFileSync(fallbackPath, JSON.stringify(leads, null, 2), 'utf8');
    console.log(`[Offline Fallback] Lead saved locally to fallback file. Temp ID: ${tempId}`);
    return tempId;
  } catch (error) {
    console.error('Failed to write lead to offline fallback file:', error.message);
    throw new Error('Local fallback storage failed');
  }
};

/**
 * Synchronizes saved offline leads to the MongoDB database.
 */
const syncFallbackLeads = async () => {
  const fallbackPath = getFallbackFile();
  if (!fs.existsSync(fallbackPath)) {
    return;
  }

  console.log('[Sync Service] Found offline fallback leads file. Starting synchronization...');

  let leads = [];
  try {
    const fileContent = fs.readFileSync(fallbackPath, 'utf8');
    leads = JSON.parse(fileContent);
    if (!Array.isArray(leads) || leads.length === 0) {
      console.log('[Sync Service] No leads to sync or file is empty.');
      return;
    }
  } catch (error) {
    console.error('[Sync Service] Failed to read or parse fallback file:', error.message);
    return;
  }

  console.log(`[Sync Service] Synchronizing ${leads.length} leads to database...`);
  const failedLeads = [];
  let successCount = 0;

  for (const leadData of leads) {
    try {
      // Strip offline metadata fields if present before saving
      const { _id, fallbackCreatedAt, ...cleanLeadData } = leadData;

      // Map any schema differences if necessary
      const newLead = new Lead(cleanLeadData);
      
      // Keep original timestamp from fallback metadata if possible
      if (fallbackCreatedAt) {
        newLead.createdAt = new Date(fallbackCreatedAt);
      }

      await newLead.save();
      successCount++;
    } catch (saveError) {
      console.error(`[Sync Service] Failed to sync lead (${leadData.clientName || 'Unknown'}):`, saveError.message);
      // Keep failed leads so we can try syncing them again or inspect them
      failedLeads.push(leadData);
    }
  }

  if (failedLeads.length > 0) {
    try {
      fs.writeFileSync(fallbackPath, JSON.stringify(failedLeads, null, 2), 'utf8');
      console.warn(`[Sync Service] Completed with issues. Synced: ${successCount}, Failed: ${failedLeads.length}. Retained failed leads in fallback file.`);
    } catch (writeError) {
      console.error('[Sync Service] Failed to rewrite remaining failed leads to fallback file:', writeError.message);
    }
  } else {
    try {
      fs.unlinkSync(fallbackPath);
      console.log(`[Sync Service] Successfully synchronized all ${successCount} leads. Deleted fallback file.`);
    } catch (unlinkError) {
      console.error('[Sync Service] Failed to delete synced fallback file:', unlinkError.message);
    }
  }
};

module.exports = {
  saveToFallback,
  syncFallbackLeads,
  getFallbackFile
};
