import db from './server/db';
const products = db.prepare('SELECT id, name, images FROM products').all();
console.log(JSON.stringify(products, null, 2));
