import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

async function testBrokerData() {
    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db();

        // Find all brokers
        const brokers = await db.collection('users').find(
            { role: 'broker' },
            { projection: { _id: 1, name: 1, email: 1, role: 1, brokerProfile: 1 } }
        ).toArray();
        console.log('\n=== BROKERS ===');
        console.log('Total brokers:', brokers.length);
        brokers.forEach(u => {
            console.log(`  ${u.name} (${u.email}) | brokerCode: ${u.brokerProfile?.brokerCode || 'NONE'} | _id: ${u._id}`);
        });

        // Find all workers with broker links
        const linkedWorkers = await db.collection('users').find(
            {
                role: 'worker',
                $or: [
                    { 'workerProfile.brokerId': { $exists: true, $ne: null } },
                    { 'workerProfile.brokerCode': { $exists: true, $ne: '' } }
                ]
            },
            { projection: { _id: 1, name: 1, email: 1, 'workerProfile.brokerCode': 1, 'workerProfile.brokerId': 1 } }
        ).toArray();
        console.log('\n=== WORKERS WITH BROKER LINKS ===');
        console.log('Total linked workers:', linkedWorkers.length);
        linkedWorkers.forEach(w => {
            console.log(`  ${w.name} (${w.email}) | brokerCode: ${w.workerProfile?.brokerCode || 'NONE'} | brokerId: ${w.workerProfile?.brokerId || 'NONE'}`);
        });

        // Find bookings with broker attribution
        const brokerBookings = await db.collection('bookings').find(
            {
                $or: [
                    { brokerId: { $exists: true, $ne: null } },
                    { brokerCode: { $exists: true, $ne: '' } }
                ]
            },
            {
                projection: {
                    _id: 1, service: 1, status: 1, brokerCode: 1, brokerId: 1,
                    workerName: 1, workerEmail: 1, workerId: 1, customerName: 1,
                    amount: 1, brokerCommissionAmount: 1, brokerCommissionRate: 1
                }
            }
        ).limit(20).toArray();
        console.log('\n=== BOOKINGS WITH BROKER ATTRIBUTION ===');
        console.log('Total broker bookings:', brokerBookings.length);
        brokerBookings.forEach(b => {
            console.log(`  [${b.status}] ${b.service} | customer: ${b.customerName} | worker: ${b.workerName} | brokerCode: ${b.brokerCode || 'NONE'} | brokerId: ${b.brokerId || 'NONE'} | commission: ${b.brokerCommissionAmount}`);
        });

        // Check all bookings
        const allBookings = await db.collection('bookings').countDocuments();
        console.log('\n=== ALL BOOKINGS ===');
        console.log('Total bookings:', allBookings);

        // Check all workers
        const allWorkers = await db.collection('users').find(
            { role: 'worker' },
            { projection: { _id: 1, name: 1, email: 1, 'workerProfile.brokerCode': 1, 'workerProfile.brokerId': 1 } }
        ).toArray();
        console.log('\n=== ALL WORKERS ===');
        console.log('Total workers:', allWorkers.length);
        allWorkers.forEach(w => {
            console.log(`  ${w.name} (${w.email}) | brokerCode: ${w.workerProfile?.brokerCode || 'NONE'} | brokerId: ${w.workerProfile?.brokerId || 'NONE'}`);
        });

        await client.close();
        console.log('\nDone.');
    } catch (error) {
        console.error('Error:', error.message);
        await client.close();
        process.exit(1);
    }
}

testBrokerData();
