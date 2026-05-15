const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const Target = require('./src/models/Target');

async function migrateTargets() {
  try {
    console.log('Starting target migration...');
    
    // Find all targets without user_id
    const targetsWithoutUserId = await Target.find({ user_id: { $exists: false } });
    
    if (targetsWithoutUserId.length === 0) {
      console.log('✅ No targets found without user_id. Migration not needed.');
      return;
    }
    
    console.log(`⚠️  Found ${targetsWithoutUserId.length} targets without user_id.`);
    console.log('\n📋 Preview of targets that will be deleted:');
    targetsWithoutUserId.slice(0, 5).forEach((target, index) => {
      console.log(`   ${index + 1}. Date: ${target.date}, Steps: ${target.steps}, Protein: ${target.protein}g`);
    });
    
    if (targetsWithoutUserId.length > 5) {
      console.log(`   ... and ${targetsWithoutUserId.length - 5} more targets`);
    }
    
    console.log('\n❌ WARNING: These targets will be deleted as they cannot be associated with any user.');
    console.log('💡 If you want to preserve these targets, you can:');
    console.log('   1. Manually assign them to specific users in your database');
    console.log('   2. Export them to a backup file');
    console.log('   3. Cancel this migration and handle them later');
    
    // In a real scenario, you might want to add a prompt here
    // For now, we'll proceed with deletion
    console.log('\n🔄 Proceeding with deletion...');
    
    // Delete targets without user_id
    const deleteResult = await Target.deleteMany({ user_id: { $exists: false } });
    
    console.log(`✅ Successfully deleted ${deleteResult.deletedCount} targets without user_id.`);
    console.log('🎉 Migration completed successfully.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run migration
migrateTargets(); 