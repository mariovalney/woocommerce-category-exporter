# WooCommerce Category Exporter

We rely on "JWT Authentication for WP REST API" plugin to authenticate on WooCommerce API.

Check the `.env.sample` file and create your own `.env`.

You should use a user with reading permission to WooCommerce categories.

Run `npm run start` to export a formated (plain) categories list.

### Commands:

Run `npm run clean` to remove all `exported-categories-*.json` files.

Run `npm run start:debug` to export the categories and keep the JSON from WooCommerce.