const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'globalStorage', 'state.vscdb');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  db.all("SELECT key, value FROM ItemTable WHERE key LIKE '%githubSwitcher%'", [], (err, rows) => {
    if (err) {
      console.error('Error querying database:', err.message);
      process.exit(1);
    }
    rows.forEach((row) => {
      console.log(`Key: ${row.key}`);
      try {
        console.log(`Value:`, JSON.stringify(JSON.parse(row.value), null, 2));
      } catch {
        console.log(`Value: ${row.value}`);
      }
      console.log('--------------------------------------------------');
    });
    db.close();
  });
});
