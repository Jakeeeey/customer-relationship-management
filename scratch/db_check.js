/* eslint-disable */
const mysql = require('mysql2/promise');

async function checkDB() {
    try {
        const connection = await mysql.createConnection({
            host: '100.110.197.61',
            port: 3310,
            user: 'vosSystem',
            password: 'Meneses81617VOS'
        });

        const [dbs] = await connection.query('SHOW DATABASES');
        console.log("Databases:", dbs.map(db => Object.values(db)[0]).join(', '));
        
        // Let's check a few likely DBs for the tables
        for (const dbRow of dbs) {
            const dbName = Object.values(dbRow)[0];
            if (['information_schema', 'mysql', 'performance_schema', 'sys'].includes(dbName)) continue;
            
            try {
                await connection.query(`USE \`${dbName}\``);
                const [tables] = await connection.query('SHOW TABLES');
                const tableNames = tables.map(t => Object.values(t)[0]);
                
                if (tableNames.includes('sales_order') || tableNames.includes('sales_invoice')) {
                    console.log(`\nFound tables in DB: ${dbName}`);
                    
                    if (tableNames.includes('sales_order')) {
                        const [cols] = await connection.query('DESCRIBE sales_order');
                        console.log("\n--- sales_order schema ---");
                        console.table(cols);
                    }
                    if (tableNames.includes('sales_invoice')) {
                        const [cols] = await connection.query('DESCRIBE sales_invoice');
                        console.log("\n--- sales_invoice schema ---");
                        console.table(cols);
                    }
                }
            } catch (e) {
                // Ignore permissions errors on specific DBs
            }
        }

        await connection.end();
    } catch (err) {
        console.error("Connection failed:", err.message);
    }
}

checkDB();
