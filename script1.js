let allCollections = []; // Make sure this is defined at the top scope
// DOM Elements
const productGrid = document.getElementById('product-grid');
const paginationControls = document.getElementById('pagination-controls');
const searchBar = document.getElementById('search-bar');
const categoryFilter = document.getElementById('categories-filter');
const minPriceInput = document.getElementById('min-price');
const maxPriceInput = document.getElementById('max-price');
const sortFilter = document.getElementById('sort-filter');
const furnitureTypeFilter = document.getElementById('furniture-type-filter');
const materialFilter = document.getElementById('material-filter');
document.getElementById('color-filter').addEventListener('change', applyFilters);
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
  collections(first: 100) {
    edges {
      node {
        id
        title
        products(first: 200) {
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
              tags
            }
          }
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
    
    if (!data.data) {
      console.error('Data missing:', data);
      return;
    }
  
    const collections = data.data.collections.edges.map(collection => ({
      id: collection.node.id,
      title: collection.node.title,
      products: collection.node.products.edges.map(product => {
        // Retrieve color for each variant, ensuring selectedOptions is defined
        const colorVariants = product.node.variants.edges.map(variant => {
        
          const selectedOptions = variant.node.selectedOptions || []; // Ensure array is defined
          const colorOption = selectedOptions.find(option => option.name.toLowerCase() === 'color');
          return colorOption ? colorOption.value : null;
        }).filter(Boolean); // Filter out any null values
  
        return {
          id: product.node.id,
          title: product.node.title,
          imageUrl: product.node.images.edges[0]?.node.src || 'default-image.jpg',
          price: parseFloat(product.node.variants.edges[0]?.node.priceV2.amount) || 0,
          currency: product.node.variants.edges[0]?.node.priceV2.currencyCode || 'USD',
          colors: [...new Set(colorVariants)], // Use a Set to ensure unique colors
          options: product.node.options || []
        };
      })
    }));
  
    allCollections = collections;
    allProducts = collections.reduce((acc, collection) => [...acc, ...collection.products], []);
    filteredProducts = allProducts;
  
    populateColorFilter();
    populateFilters(collections);
    populateCollectionDropdown(collections);
    displayProducts();
    renderPagination();
  })
  .catch(error => console.error('Error fetching collections:', error));

function displayAllCollectionProducts() {
  filteredProducts = allProducts;
  displayProducts();
}

function populateColorFilter() {
  const colorSet = new Set();

  allProducts.forEach(product => {
    product.colors.forEach(color => colorSet.add(color));
  });

  const colorFilter = document.getElementById('color-filter');
  colorSet.forEach(color => {
    const option = document.createElement('option');
    option.value = color;
    option.textContent = color;
    colorFilter.appendChild(option);
  });
}

function populateCollectionDropdown(collections) {
  const collectionFilter = document.getElementById('categories-filter');
  collections.forEach(collection => {
    const option = document.createElement('option');
    option.value = collection.title;
    option.textContent = collection.title;
    collectionFilter.appendChild(option);
  });
}
categoryFilter.addEventListener('change', applyFilters);

function applyFilters() {
  const searchQuery = searchBar.value.toLowerCase();
  const selectedCategory = categoryFilter.value;
  const minPrice = parseFloat(minPriceInput.value) || 0;
  const maxPrice = parseFloat(maxPriceInput.value) || Infinity;
  const selectedFurnitureType = furnitureTypeFilter.value;
  const selectedMaterial = materialFilter.value;
  const selectedColor = document.getElementById('color-filter').value;

  filteredProducts = allProducts.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchQuery);
    const matchesCategory = !selectedCategory || 
      allCollections.some(col => col.title === selectedCategory && col.products.some(prod => prod.id === product.id));
    const matchesPrice = product.price >= minPrice && product.price <= maxPrice;
    const matchesFurnitureType = !selectedFurnitureType || 
      product.options.find(option => option.name.toLowerCase() === 'furniture type')?.values.includes(selectedFurnitureType);
    const matchesMaterial = !selectedMaterial || 
      product.options.find(option => option.name.toLowerCase() === 'material')?.values.includes(selectedMaterial);
    // Here is the change to match colors using the colors array
    const matchesColor = !selectedColor || product.colors.includes(selectedColor);

    return matchesSearch && matchesCategory && matchesPrice && matchesFurnitureType && matchesMaterial && matchesColor;
  });

  const selectedSort = sortFilter.value;
  sortProducts(selectedSort);

  currentPage = 1; // Reset to the first page
  displayProducts();
  renderPagination();
}

// Add event listeners for the new filters
furnitureTypeFilter.addEventListener('change', applyFilters);
materialFilter.addEventListener('change', applyFilters);
// Add event listener for sort filter
sortFilter.addEventListener('change', applyFilters);


function populateFilters(collections) {
  const furnitureTypeSet = new Set();
  const materialSet = new Set();

  collections.forEach(collection => {
    
    collection.products.forEach(product => {
  
      // Assuming 'Furniture Type' and 'Material' are option names
      const furnitureTypeOption = product.options.find(option => option.name.toLowerCase() === 'furniture type');
      if (furnitureTypeOption) {
        furnitureTypeOption.values.forEach(type => furnitureTypeSet.add(type));
      }

      const materialOption = product.options.find(option => option.name.toLowerCase() === 'material');
      if (materialOption) {
        materialOption.values.forEach(material => materialSet.add(material));
      }
    });
  });

  populateDropdown('furniture-type-filter', furnitureTypeSet);
  populateDropdown('material-filter', materialSet);
}

function populateDropdown(elementId, valueSet) {
  const dropdown = document.getElementById(elementId);
  valueSet.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    dropdown.appendChild(option);
  });
}
// Display products on the grid
function displayProducts() {
  productGrid.innerHTML = ''; // Clear existing products
  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const endIndex = startIndex + PRODUCTS_PER_PAGE;

  const productsToDisplay = filteredProducts.slice(startIndex, endIndex);

  productsToDisplay.forEach(product => {
    
    const colors =product.options.values;
    if(product.options.name == "color"){
        // forEach( colors as ){

        // }
    }
    const productElement = document.createElement('div');
    productElement.classList.add('product-card');
    productElement.innerHTML = `
      <img src="${product.imageUrl}" alt="${product.title}">
      <h2>${product.title}</h2>
      <p>Price: ${product.currency} ${product.price.toFixed(2)}</p>
      <p id="available-color">Available color: ${product.options.values[0]}</p>
      <button class="select-btn">View More</button>
    `;
    productGrid.appendChild(productElement);
  });
}
function filterByCategory(selectedCategory) {
  if (selectedCategory === 'All') {
    filteredProducts = allProducts;
  } else {
    filteredProducts = allProducts.filter(product => 
      product.categories.includes(selectedCategory)
    );
  }
  displayProducts(); // Update the UI with filtered products
}

// Sorting function
function sortProducts(sortOption) {
  switch (sortOption) {
    case 'title-asc':
      filteredProducts.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'title-desc':
      filteredProducts.sort((a, b) => b.title.localeCompare(a.title));
      break;
    case 'price-asc':
      filteredProducts.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      filteredProducts.sort((a, b) => b.price - a.price);
      break;
    default:
      // No sorting
      break;
  }
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

  // Calculate range of page numbers to display
  const maxButtons = 10;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = startPage + maxButtons - 1;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  // Page Numbers
  for (let i = startPage; i <= endPage; i++) {
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
