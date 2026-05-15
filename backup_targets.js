const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const Target = require('./src/models/Target');

async function backupTargets() {
  try {
    console.log('Starting target backup...');
    
    // Find all targets without user_id
    const targetsWithoutUserId = await Target.find({ user_id: { $exists: false } });
    
    if (targetsWithoutUserId.length === 0) {
      console.log('✅ No targets found without user_id. Backup not needed.');
      return;
    }
    
    console.log(`📦 Found ${targetsWithoutUserId.length} targets to backup.`);
    
    // Convert to plain objects and add backup timestamp
    const backupData = {
      backupDate: new Date().toISOString(),
      totalTargets: targetsWithoutUserId.length,
      targets: targetsWithoutUserId.map(target => target.toObject())
    };
    
    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `targets_backup_${timestamp}.json`;
    
    // Write to file
    fs.writeFileSync(filename, JSON.stringify(backupData, null, 2));
    
    console.log(`✅ Backup completed successfully!`);
    console.log(`📁 Backup saved to: ${filename}`);
    console.log(`📊 Total targets backed up: ${targetsWithoutUserId.length}`);
    
    console.log('\n💡 You can now safely run the migration script.');
    console.log('   Run: node migrate_targets.js');
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run backup
backupTargets(); 