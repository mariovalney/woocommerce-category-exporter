require('dotenv').config();

const _ = require('lodash');
const axios = require('axios');
const fs = require('fs');
const url = require('url');

const BASE_URL = _.trim(process.env.BASE_URL, "/");

/**
 * The date to filename
 */
function getFormattedTime() {
    const today = new Date();
    return today.getFullYear() + '-' +
      today.getMonth() + 1 + '-' +
      today.getDate() + '-' +
      today.getHours() +
      today.getMinutes() +
      today.getSeconds();
}

/**
 * Try to login
 */
async function getToken() {
  const url = BASE_URL + '/wp-json/jwt-auth/v1/token';
  const username = process.env.USER_LOGIN;
  const password = process.env.USER_PASS;

  if (! username) {
    throw 'Usuário vazio. Preencha seu arquivo .env conforme exemplo.';
  }

  if (! password) {
    throw 'Senha vazia. Preencha seu arquivo .env conforme exemplo.';
  }

  console.log('Fazendo login...');

  return await axios.post(url, {
    username: username,
    password: password
  })
  .then(function (response) {
    if (! response.data || ! response.data.token) {
      throw 'Não conseguimos obter seu token de acesso.';
    }

    return response.data.token;
  })
  .catch(error => { throw new Error(error) });
}

/**
 * Get categories from marketplace
 */
async function getCategoriesFromMarketplace() {
  const url = BASE_URL + '/wp-json/wc/v3/products/categories';
  let page = 1;
  let categories = [];

  axios.defaults.headers.common['Authorization'] = 'Bearer ' + await getToken();

  while (page) {
    console.log('Procurando pelas categorias (página ' + page +').');

    await axios.get(url, {
      params: {
        per_page: 100,
        page: page
      }
    })
    .then(function (response) {
      if (! response.data || ! response.data.length) {
        page = 0;
        console.log('Todas as categorias foram encontradas.');
        return;
      }

      categories = categories.concat(response.data);
      page++;
    })
    .catch(error => { throw new Error(error) });
  }

  console.log('Vamos criar o arquivo com as ' + categories.length + ' categorias.');

  return new Promise(resolve => { resolve(categories); });
}

function parseCategoriesJson(json) {
  let categories = [];

  _.forEach(json, category => {
    categories.push({
      id: category.id,
      name: category.name,
      slug: category.slug,
      parent: category.parent,
      slugs: [category.slug]
    });
  });

  console.log('Organizando subcategorias.');

  let childCategories = [];
  let lastChildCategoriesLength = 0;
  do {
    const parents = _.filter(categories, { parent: 0 });

    categories = _.map(categories, category => {
      if (! category.parent) {
        return category;
      }

      const parent = _.find(parents, {id: category.parent});

      if (! parent) {
        return category;
      }

      category.name = parent.name + ' > ' + category.name;
      category.parent = 0;
      category.slugs.push(parent.slug);

      return category;
    });

    childCategories = _.filter(categories, category => { return category.parent || false; } );
    if (lastChildCategoriesLength && lastChildCategoriesLength === childCategories.length) {
      console.log('Atenção! Existe(m) ' + lastChildCategoriesLength + ' subcategoria(s) sem um pai identificado:');
      console.log(_.map(childCategories, 'name'));
      break;
    }

    lastChildCategoriesLength = childCategories.length;
  }
  while (lastChildCategoriesLength);

  categories = _.map(categories, category => {
    return {
      label: category.name,
      value: _.map(category.slugs, slug => {
        return {
          slug: slug
        }
      })
    };
  });

  categories = categories.sort(function(a, b){
    return a.label.localeCompare(b.label);
  });

  // Output
  const website = url.parse(BASE_URL).hostname.replace(/\./g, '-');
  const filename = 'exported-categories-' + website + '-' + getFormattedTime() + '.json';

  fs.writeFileSync(filename, JSON.stringify(categories, null, 4));
  console.log("Arquivo " + filename + " criado com sucesso.");

  if (_.indexOf(process.argv, '--debug') > 0) {
    const filenameOriginal = 'exported-categories-' + website + '-' + getFormattedTime() + '-not-formated.json';
    fs.writeFileSync(filenameOriginal, JSON.stringify(json, null, 4));
    console.log("Arquivo " + filenameOriginal + " (com as categorias sem formatação) criado com sucesso.");
  }
}

// RUN
try {
  if (! BASE_URL) {
    throw 'URL do WooCommerce vazia. Preencha seu arquivo .env conforme exemplo.';
  }

  getCategoriesFromMarketplace()
    .then(response => {
      parseCategoriesJson(response);
    })
    .catch(error => {
      console.error("[ERROR]");
      console.error(error);
    });
} catch(error) {
  console.error("[ERROR2]");
  console.error(error);
}