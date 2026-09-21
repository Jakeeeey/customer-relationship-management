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
        for (const dbRow of dbs) {
            const dbName = Object.values(dbRow)[0];
            if (['information_schema', 'mysql', 'performance_schema', 'sys'].includes(dbName)) continue;
            
            try {
                await connection.query(`USE \`${dbName}\``);
                const [tables] = await connection.query('SHOW TABLES');
                const tableNames = tables.map(t => Object.values(t)[0]);
                
                if (tableNames.includes('sales_invoice_details')) {
                    const [cols] = await connection.query('DESCRIBE sales_invoice_details');
                    console.log(`\n--- sales_invoice_details schema in ${dbName} ---`);
                    console.table(cols);
                }
            } catch (e) {}
        }

        await connection.end();
    } catch (err) {
        console.error("Connection failed:", err.message);
    }
}

checkDB();
