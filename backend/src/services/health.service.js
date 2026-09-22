const pool = require('../config/database')

const checkDataBase = async () => {
    const [rows] = await pool.query('SELECT 1 AS status')

    return rows[0];
}

module.exports = checkDataBase;