// DOM Elements
const productGrid = document.getElementById('product-grid');
const paginationControls = document.getElementById('pagination-controls');
const searchBar = document.getElementById('search-bar');
const categoryFilter = document.getElementById('categories-filter');
const minPriceInput = document.getElementById('min-price');
const maxPriceInput = document.getElementById('max-price');
// Constants
const PRODUCTS_PER_PAGE = 10;
let currentPage = 1;
let allProducts = [];
let filteredProducts = [];
let selectedColor = '';

// Shopify API setup
const storefrontAccessToken = '7ef1dcdd3a526d242c98aa1ff04c3f9a'; // Replace with your Storefront Access Token
const storeName = '5cc9aa-2f'; // Replace with your Shopify store name

const url = `https://${storeName}.myshopify.com/api/2024-01/graphql.json`;

// Define the GraphQL query to fetch product details
const query = `{
  products(first: 100) {
    edges {
      node {
        id
        title
        images(first: 1) {
          edges {
            node {
              src
            }
          }
        }
        variants(first: 1) {
          edges {
            node {
              priceV2 {
                amount
                currencyCode
              }
            }
          }
        }
        options {
          name
          values
        }
      }
    }
  }
}`;

// Fetch products from Shopify Storefront API
fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Shopify-Storefront-Access-Token': storefrontAccessToken
  },
  body: JSON.stringify({ query })
})
  .then(response => response.json())
  .then(data => {
    const products = data.data.products.edges.map(product => {
      const productNode = product.node;
      const imageUrl = productNode.images.edges[0]?.node.src || 'default-image.jpg';
      const price = parseFloat(productNode.variants.edges[0]?.node.priceV2.amount) || 0;
      const currency = productNode.variants.edges[0]?.node.priceV2.currencyCode || 'USD';
      const colors = productNode.options.find(option => option.name.toLowerCase() === 'color')?.values || ['No color available'];

      return {
        id: productNode.id,
        title: productNode.title,
        imageUrl,
        price,
        currency,
        colors
      };
    });

    allProducts = products;
    filteredProducts = products;  // Initially no filters, show all products
    displayProducts();
    renderPagination();
  })
  .catch(error => console.error('Error fetching products:', error));

// Display products on the grid
function displayProducts() {
  productGrid.innerHTML = ''; // Clear existing products
  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const endIndex = startIndex + PRODUCTS_PER_PAGE;

  const productsToDisplay = filteredProducts.slice(startIndex, endIndex);

  productsToDisplay.forEach(product => {
    const productElement = document.createElement('div');
    productElement.classList.add('product-card');
    productElement.innerHTML = `
      <img src="${product.imageUrl}" alt="${product.title}">
      <h2>${product.title}</h2>
      <p>Price: ${product.currency} ${product.price.toFixed(2)}</p>
      <p>Color: ${product.colors.join(', ')}</p>
      <button class="select-btn">Select</button>
    `;
    productGrid.appendChild(productElement);
  });
}

// Apply all filters: search, category, price, color
function applyFilters() {
  const searchQuery = searchBar.value.toLowerCase();
  const category = categoryFilter.value;
  const minPrice = parseFloat(minPriceInput.value) || 0;
  const maxPrice = parseFloat(maxPriceInput.value) || Infinity;

  filteredProducts = allProducts.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchQuery);
    const matchesCategory = !category || product.category === category; // Assuming 'category' is a property
    const matchesPrice = product.price >= minPrice && product.price <= maxPrice;
    return matchesSearch && matchesCategory && matchesPrice ;
  });

  currentPage = 1; // Reset to the first page
  displayProducts();
  renderPagination();
}

// Add event listeners for filters
searchBar.addEventListener('input', applyFilters);
categoryFilter.addEventListener('change', applyFilters);
minPriceInput.addEventListener('input', applyFilters);
maxPriceInput.addEventListener('input', applyFilters);

// Create pagination controls
function renderPagination() {
  paginationControls.innerHTML = '';
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);

  if (totalPages === 0) return;

  // Previous Button
  const prevButton = document.createElement('button');
  prevButton.textContent = 'Previous';
  prevButton.disabled = currentPage === 1;
  prevButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      displayProducts();
      renderPagination();
    }
  });
  paginationControls.appendChild(prevButton);

  // Page Numbers
  for (let i = 1; i <= totalPages; i++) {
    const pageButton = document.createElement('button');
    pageButton.textContent = i;
    pageButton.classList.toggle('active', i === currentPage);
    pageButton.addEventListener('click', () => {
      currentPage = i;
      displayProducts();
      renderPagination();
    });
    paginationControls.appendChild(pageButton);
  }

  // Next Button
  const nextButton = document.createElement('button');
  nextButton.textContent = 'Next';
  nextButton.disabled = currentPage === totalPages;
  nextButton.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      displayProducts();
      renderPagination();
    }
  });
  paginationControls.appendChild(nextButton);
}
