/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const DAYS_TO_KEEP = 30;

function cleanLogs() {
  console.log('=== Log Clean-up Started ===');
  if (!fs.existsSync(LOG_DIR)) {
    console.log(`Logs directory does not exist at: ${LOG_DIR}`);
    return;
  }

  const files = fs.readdirSync(LOG_DIR);
  const now = moment().tz('Asia/Kolkata');
  const cutoffDate = now.clone().subtract(DAYS_TO_KEEP, 'days').endOf('day');

  console.log(`Current Time (IST): ${now.format('YYYY-MM-DD HH:mm:ss')}`);
  console.log(`Retention Limit: ${DAYS_TO_KEEP} days`);
  console.log(`Cutoff Date (IST): ${cutoffDate.format('YYYY-MM-DD HH:mm:ss')}`);

  let deletedCount = 0;
  let keptCount = 0;

  files.forEach(file => {
    // Only target log files
    if (!file.endsWith('.log')) {
      return;
    }

    const filePath = path.join(LOG_DIR, file);
    let stats;
    try {
      stats = fs.statSync(filePath);
    } catch (err) {
      console.error(`Could not read stats for ${file}:`, err.message);
      return;
    }

    if (stats.isDirectory()) {
      return;
    }

    // Try to parse YYYY-MM-DD from the filename (e.g. app-2026-06-18.log)
    const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
    let fileDate;

    if (dateMatch) {
      // Parse using IST timezone
      fileDate = moment
        .tz(dateMatch[1], 'YYYY-MM-DD', 'Asia/Kolkata')
        .endOf('day');
      console.log(
        `[File: ${file}] Extracted date from filename: ${fileDate.format('YYYY-MM-DD')}`,
      );
    } else {
      // Fallback to file modification time (mtime)
      fileDate = moment(stats.mtime).tz('Asia/Kolkata');
      console.log(
        `[File: ${file}] No date in filename. Using file mtime: ${fileDate.format('YYYY-MM-DD HH:mm:ss')}`,
      );
    }

    // Determine if file is before cutoff date
    if (fileDate.isBefore(cutoffDate)) {
      try {
        fs.unlinkSync(filePath);
        console.log(
          `  -> DELETED: ${file} (Date: ${fileDate.format('YYYY-MM-DD')})`,
        );
        deletedCount++;
      } catch (err) {
        console.error(`  -> ERROR: Failed to delete ${file}:`, err.message);
      }
    } else {
      console.log(
        `  -> KEPT: ${file} (Date: ${fileDate.format('YYYY-MM-DD')})`,
      );
      keptCount++;
    }
  });

  console.log(
    `=== Log Clean-up Finished: Deleted ${deletedCount} files, Kept ${keptCount} files ===`,
  );
}

cleanLogs();
