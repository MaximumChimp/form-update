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
              variants(first: 50) {
                edges {
                  node {
                    priceV2 {
                      amount
                      currencyCode
                    }
                    selectedOptions {
                      name
                      value
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
        // Collect color variants for all variants of the product
        const colorVariants = product.node.variants.edges.flatMap(variant => {
          const selectedOptions = variant.node.selectedOptions || [];
          const colorOption = selectedOptions.find(option => option.name.toLowerCase() === 'color');
          return colorOption ? colorOption.value : null;
        }).filter(Boolean); // Filter out any null values
    
        // Get unique colors (deduplicating)
        const uniqueColors = [...new Set(colorVariants)];
        return {
          id: product.node.id,
          title: product.node.title,
          imageUrl: product.node.images.edges[0]?.node.src || 'default-image.jpg',
          price: parseFloat(product.node.variants.edges[0]?.node.priceV2.amount) || 0,
          currency: product.node.variants.edges[0]?.node.priceV2.currencyCode || 'USD',
          colors: uniqueColors, // Store all unique colors
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
let totalPrice = 0; // Variable to track total price

function displayProducts() {
  productGrid.innerHTML = ''; // Clear existing products
  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const endIndex = startIndex + PRODUCTS_PER_PAGE;

  const productsToDisplay = filteredProducts.slice(startIndex, endIndex);

  productsToDisplay.forEach(product => {
    const productElement = document.createElement('div');
    productElement.classList.add('product-card');
   // Check if the colors are coming through
    // Create color swatches HTML for the available colors
    const colorSwatches = product.colors.map(color => {
      // Ensure the color is valid (can be a valid color name, hex, etc.)
      return `
        <span class="color-swatch" 
              style="background-color: ${color};" 
              data-color="${color}">
        </span>
      `;
    }).join('');

    // Add product card HTML
    productElement.innerHTML = `
     <img src="${product.imageUrl}" alt="${product.title}">
      <h2>${product.title}</h2>
         <div id="color-cont">
          <p>Culori disponibile:</p>
          <div class="color-swatches">
            ${colorSwatches}
          </div>
          </div>
          
     <div class="color-quantity-row">
        <div class="color-selection">
          <label for="quantity-${product.id}">QTY:</label>
          <input type="number" id="quantity-${product.id}" class="quantity-input" value="1" min="1">
        </div>
      <div class="quantity-selection">
      <p>${product.currency} ${product.price.toFixed(2)}</p>
    </div>
  </div>

      <button class="select-btn" data-id="${product.id}">cumpără</button>
    `;

    // Get the button, color swatches, and quantity input for the current product
    const selectButton = productElement.querySelector('.select-btn');
    const colorSwatchesContainer = productElement.querySelector('.color-swatches');
    const quantityInput = productElement.querySelector('.quantity-input');

    let selectedColor = ''; // Store the selected color

    // Add event listener for color swatch clicks
    colorSwatchesContainer.addEventListener('click', (event) => {
      const color = event.target.dataset.color;
      if (color) {
        selectedColor = color;
        // Highlight the selected color (optional)
        document.querySelectorAll('.color-swatch').forEach(swatch => {
          swatch.classList.remove('selected');
        });
        event.target.classList.add('selected');
      }
    });

    // Add event listener for the 'Add to Cart' button
    selectButton.addEventListener('click', (event) => {
      event.preventDefault(); // Prevent page reload
      const quantity = parseInt(quantityInput.value);
      if (selectedColor) {
        selectProduct(product, selectedColor, quantity); // Add product to cart with selected color and quantity
      } else {
        alert('Please select a color.');
      }
    });

    productGrid.appendChild(productElement);
  });
}

function selectProduct(product, selectedColor, quantity) {
  // Calculate the price for the selected quantity
  const totalProductPrice = product.price * quantity;

  // Update the total price
  totalPrice += totalProductPrice;

  // Optionally, update the UI to reflect the updated total price
  updateTotalPrice();
}

function updateTotalPrice() {
  const totalPriceElement = document.getElementById('total-price');
  if (totalPriceElement) {
    totalPriceElement.textContent = `${filteredProducts[0].currency} ${totalPrice.toFixed(2)}`;
  } else {
    // Create total price element if it doesn't exist
    const newTotalPriceElement = document.createElement('div');
    newTotalPriceElement.id = 'total-price';
    newTotalPriceElement.textContent = `${filteredProducts[0].currency} ${totalPrice.toFixed(2)}`;
    document.body.appendChild(newTotalPriceElement); // Or append it to a specific section
  }
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
  prevButton.textContent = 'Prev';
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

  // Adjust startPage to properly center the pagination when near the beginning
  if (startPage > 1 && endPage < totalPages) {
    startPage = Math.max(1, Math.min(startPage, currentPage - Math.floor(maxButtons / 2)));
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


//Design option modal
// Open the modal and set the image source and style selection
function openModal(img) {
  const modal = document.getElementById("modal");
  const modalImage = document.getElementById("modalImage");

  // Enlarge the image in the modal and adjust the image size
  modalImage.src = img.src.replace("w=100&h=80", "w=800&h=600"); // Adjust image size if needed
  modal.style.display = "flex";

  // Remove the selected class and border from all images
  const styleImages = document.querySelectorAll('.design-options img');
  styleImages.forEach(image => {
    image.classList.remove('selected'); // Remove 'selected' class from all images
    image.style.border = ''; // Remove the border from all images
  });

  // Add 'selected' class and border to the clicked image
  img.classList.add('selected'); 
  img.style.border = '2px solid #4CAF50'; // Apply a green border for selected image

  // Store the selected style information (e.g., using alt text)
  document.getElementById('selectedStyle').value = img.alt; 
}

// Function to handle the select button click
function selectItem(button, event) {
  event.stopPropagation(); // Prevent modal from opening when the button is clicked
  const img = button.previousElementSibling; // Get the image that was clicked

  // Toggle the 'selected' class on the image
  img.classList.toggle('selected'); 

  // Apply or remove the border based on selection
  if (img.classList.contains('selected')) {
    img.style.border = '2px solid blue'; // Green border for selected image
  } else {
    img.style.border = ''; // Remove border when unselected
  }

  // Store the selected style information after toggle (store img.alt as the selected style)
  const selectedStyle = img.classList.contains('selected') ? img.alt : '';
  document.getElementById('selectedStyle').value = selectedStyle;
}

// To close modal (assuming there's a close button)
document.getElementById('closeModalBtn').addEventListener('click', function() {
  const modal = document.getElementById('modal');
  modal.style.display = 'none';
});

//Image Selection
let selectedImages = [];

document.getElementById('roomImages').addEventListener('change', function(event) {
  const files = event.target.files;
  const previewContainer = document.getElementById('imagePreviewContainer');
  const errorMessage = document.getElementById('errorMessage');
  
  errorMessage.style.display = 'none'; 

  if (selectedImages.length >= 3) {
    alert("You can only upload up to 3 images.");
    event.target.value = ''; 
    return;
  }

  if (files.length === 0) return;

  const file = files[0]; 

  if (file.type.startsWith('image/')) {
    const reader = new FileReader();

    reader.onload = function(e) {
      const img = document.createElement('img');
      img.src = e.target.result;
      previewContainer.appendChild(img);
      
      selectedImages.push(file);
      
      event.target.value = ''; 

      if (selectedImages.length === 0) {
        errorMessage.style.display = 'block';
      } else {
        errorMessage.style.display = 'none';
      }
    };

    reader.readAsDataURL(file);
  } else {
    alert("Only image files are allowed.");
    event.target.value = ''; 
  }
});
