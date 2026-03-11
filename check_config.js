const { loadConfig } = require('./src/config');
const fs = require('fs');
const path = require('path');

const config = loadConfig();
const result = {
  configLoaded: !!config,
  hasRestaurant: !!config?.restaurant,
  restaurantName: config?.restaurant?.name || null,
  menuCount: config?.restaurant?.menu?.length || 0,
  firstFewItems: config?.restaurant?.menu?.slice(0, 5).map(i => ({ name: i.name, category: i.category })) || []
};

fs.writeFileSync('/tmp/config_check_result.json', JSON.stringify(result, null, 2));
console.log('Result written to /tmp/config_check_result.json');
