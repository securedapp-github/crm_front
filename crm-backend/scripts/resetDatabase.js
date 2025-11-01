require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { sequelize } = require('../src/config/database');

const schemaPath = path.join(__dirname, '../src/sql/schema.sql');

(async () => {
  try {
    console.log('⚙️ Resetting database...');

    if (!fs.existsSync(schemaPath)) {
      throw new Error(`schema.sql not found at ${schemaPath}`);
    }

    const {
      DB_HOST,
      DB_PORT,
      DB_USER,
      DB_PASSWORD
    } = process.env;

    if (!DB_HOST || !DB_USER) {
      throw new Error('Database credentials missing in environment variables.');
    }

    console.log('🧹 Dropping and recreating database via schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    const connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT ? Number(DB_PORT) : 3306,
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true
    });
    await connection.query(sql);
    await connection.end();
    console.log('✅ schema.sql executed successfully');

    console.log('🏗️ Syncing Sequelize models (force=true)');
    await sequelize.sync({ force: true, logging: (msg) => console.log(`  ${msg}`) });
    console.log('✅ Sequelize models synced');

    console.log('🎉 Database reset complete.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
})();