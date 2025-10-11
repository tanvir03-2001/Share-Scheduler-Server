const mongoose = require('mongoose');
require('dotenv').config();

async function cleanupDuplicateIndexes() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/facebook-auto-post');
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;

        // Get all collections
        const collections = await db.listCollections().toArray();
        console.log('Found collections:', collections.map(c => c.name));

        for (const collection of collections) {
            const collectionName = collection.name;
            console.log(`\nProcessing collection: ${collectionName}`);
            
            try {
                // Get current indexes
                const indexes = await db.collection(collectionName).indexes();
                console.log(`Current indexes for ${collectionName}:`, indexes.map(i => i.name));

                // Check for duplicate indexes
                const indexMap = new Map();
                const duplicates = [];

                for (const index of indexes) {
                    const key = JSON.stringify(index.key);
                    if (indexMap.has(key)) {
                        duplicates.push({
                            name: index.name,
                            key: index.key,
                            existing: indexMap.get(key)
                        });
                    } else {
                        indexMap.set(key, index.name);
                    }
                }

                if (duplicates.length > 0) {
                    console.log(`Found ${duplicates.length} duplicate indexes in ${collectionName}:`);
                    for (const duplicate of duplicates) {
                        console.log(`- ${duplicate.name}: ${JSON.stringify(duplicate.key)}`);
                        
                        // Drop the duplicate index (keep the first one)
                        try {
                            await db.collection(collectionName).dropIndex(duplicate.name);
                            console.log(`  ✓ Dropped duplicate index: ${duplicate.name}`);
                        } catch (error) {
                            console.log(`  ✗ Failed to drop index ${duplicate.name}:`, error.message);
                        }
                    }
                } else {
                    console.log(`No duplicate indexes found in ${collectionName}`);
                }
            } catch (error) {
                console.error(`Error processing collection ${collectionName}:`, error.message);
            }
        }

        console.log('\n✓ Index cleanup completed');
    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the cleanup
cleanupDuplicateIndexes();
