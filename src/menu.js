const { loadConfig } = require('./config');

function getMenuText() {
  const config = loadConfig();
  if (!config || !config.restaurant || !config.restaurant.menu || config.restaurant.menu.length === 0) {
    return 'Our menu is currently unavailable. Please check back later.';
  }

  const menu = config.restaurant.menu;
  const categorizedMenu = {};

  menu.forEach(item => {
    if (!categorizedMenu[item.category]) {
      categorizedMenu[item.category] = [];
    }
    categorizedMenu[item.category].push(item);
  });

  let text = `*${config.restaurant.name} Menu*\n\n`;

  for (const [category, items] of Object.entries(categorizedMenu)) {
    text += `*${category}*\n`;
    items.forEach(item => {
      text += `- ${item.name}: $${item.price.toFixed(2)}\n`;
    });
    text += '\n';
  }

  return text;
}

module.exports = {
  getMenuText
};
