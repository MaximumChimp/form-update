// DOM Elements
const roomImagesInput = document.getElementById('roomImages');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const checkboxes = document.querySelectorAll('input[type="checkbox"]');
const quantities = document.querySelectorAll('.quantity');
const totalPriceElement = document.getElementById('totalPrice');
const colorButtons = document.querySelectorAll('.color-btn');
const selectedColorInput = document.getElementById('selectedColor');
const form = document.getElementById('checkoutForm');
const slider = document.querySelector('.slider');
const nextButton = document.querySelector('.next-button');
const prevButton = document.querySelector('.prev-button');
const filterForm = document.getElementById('filter-form');

const API_URL = 'https://5cc9aa-2f.myshopify.com/api/2024-01/graphql.json';
const API_KEY = '7ef1dcdd3a526d242c98aa1ff04c3f9a';

const fetchProducts = async () => {
  const query = `
  query {
    products(first: 50) {
      edges {
        node {
          title
          productType
          images(first: 1) {
            edges {
              node {
                src
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                price {
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
        }
      }
    }
  }
`;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': API_KEY,
    },
    body: JSON.stringify({ query }),
  });

  const data = await response.json();
  return data.data.products.edges;
};

const initializeShop = async () => {
  const products = await fetchProducts();

  const categorySet = new Set();
  const colorSet = new Set();

  const slider = document.querySelector('.slider');
  slider.innerHTML = ''; // Clear existing slider items

  products.forEach(({ node }) => {
    const title = node.title;
    const category = node.productType || 'Uncategorized';
    const images = node.images.edges[0]?.node.src || 'default-image-url';
    categorySet.add(category);

    node.variants.edges.forEach(({ node: variant }) => {
      const price = variant.price.amount;
      const currency = variant.price.currencyCode;
      // Find color option
      const colorOption = variant.selectedOptions.find(opt => opt.name.toLowerCase() === 'color');
      const color = colorOption ? colorOption.value : 'Unknown';
      colorSet.add(color);

      // Create slider item
      const sliderItem = document.createElement('div');
      sliderItem.classList.add('slider-item');
      sliderItem.dataset.name = title.toLowerCase();
      sliderItem.dataset.category = category.toLowerCase();
      sliderItem.dataset.color = color.toLowerCase();
      sliderItem.dataset.price = price;

      sliderItem.innerHTML = `
        <div class="card">
          <img src="${images}" alt="${title}">
          <h3>${title}</h3>
          <p>${currency} ${price}</p>
        </div>
      `;

      slider.appendChild(sliderItem);
    });
  });

  // Populate filter options
  populateFilterOptions('#category-filter', Array.from(categorySet));
  populateFilterOptions('#color-filter', Array.from(colorSet));
  applyFilters(); // Reapply filters with fetched data
};

const populateFilterOptions = (selector, options) => {
  const filter = document.querySelector(selector);
  filter.innerHTML = `<option value="all">All</option>`;
  options.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option.toLowerCase();
    optionElement.textContent = option;
    filter.appendChild(optionElement);
  });
};

initializeShop();


// Room Image Upload Preview
roomImagesInput.addEventListener('change', () => {
  const files = roomImagesInput.files;
  imagePreviewContainer.innerHTML = ''; // Clear existing previews

  if (files.length > 3) {
    alert('You can only upload up to 3 images.');
    return;
  }

  Array.from(files).forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.src = e.target.result;
      imagePreviewContainer.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
});

// Furniture Color Selection
colorButtons.forEach((button) => {
  button.addEventListener('click', () => {
    colorButtons.forEach((btn) => btn.classList.remove('selected'));
    button.classList.add('selected');
    selectedColorInput.value = button.dataset.color;
  });
});

// Calculate Total Price
function calculateTotal() {
  let total = 0;
  checkboxes.forEach((checkbox) => {
    if (checkbox.checked) {
      const price = parseFloat(checkbox.dataset.price);
      const quantity = document.getElementById(checkbox.id + 'Quantity').value;
      total += price * quantity;
    }
  });
  totalPriceElement.textContent = total.toFixed(2);
}

// Enable/Disable Quantity Inputs based on Checkbox Selection
checkboxes.forEach((checkbox) => {
  checkbox.addEventListener('change', (e) => {
    const quantityInput = document.getElementById(checkbox.id + 'Quantity');
    quantityInput.disabled = !e.target.checked;
    if (!e.target.checked) quantityInput.value = 1;
    calculateTotal();
  });
});

// Update Total Price when Quantity Changes
quantities.forEach((input) => {
  input.addEventListener('input', calculateTotal);
});

// Submit Form Data
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = new FormData(form);
  // Perform AJAX submission or other handling here
  console.log('Form submitted with data:', formData);
});

// Slider Functionality
let currentIndex = 0;
let visibleItems = 5; // Default for large screens
let allItems = []; // Array to hold all slider items
let filteredItems = []; // Array to hold filtered slider items

// Function to update slider position based on the index
const updateSliderPosition = () => {
  const itemWidth = filteredItems[0] ? filteredItems[0].offsetWidth : 0; // Get width of the filtered item
  const offset = currentIndex * (itemWidth + 15); // Adjust for gap
  slider.style.transform = `translateX(-${offset}px)`;
};

// Update maxIndex based on filtered items
const updateMaxIndex = () => {
  const visibleFilteredItems = filteredItems.filter(item => item.style.display !== 'none');
  return Math.max(0, visibleFilteredItems.length - visibleItems);
};

// Next button functionality
nextButton.addEventListener('click', () => {
  const maxIndex = updateMaxIndex();
  if (currentIndex < maxIndex) {
    currentIndex++;
    updateSliderPosition();
  }
});

// Previous button functionality
prevButton.addEventListener('click', () => {
  if (currentIndex > 0) {
    currentIndex--;
    updateSliderPosition();
  }
});

// Adjust Visible Slider Items Based on Screen Size
const adjustVisibleItems = () => {
  const containerWidth = document.querySelector('.slider-wrapper').offsetWidth;
  if (containerWidth >= 1024) {
    visibleItems = 5;
  } else if (containerWidth >= 768) {
    visibleItems = 4;
  } else if (containerWidth >= 480) {
    visibleItems = 3;
  } else {
    visibleItems = 2;
  }
  currentIndex = Math.min(currentIndex, updateMaxIndex());
  updateSliderPosition();
};

window.addEventListener('resize', adjustVisibleItems);
adjustVisibleItems(); // Initialize on load


// Add these filter element references
const categoryFilter = document.getElementById('category-filter');  // Ensure this element exists in HTML
const colorFilter = document.getElementById('color-filter');      // Ensure this element exists in HTML
const priceMin = document.getElementById('price-min');            // Ensure this element exists in HTML
const priceMax = document.getElementById('price-max');            // Ensure this element exists in HTML
const searchProduct = document.getElementById("search-product");

// Filter the slider items based on the filter values
const applyFilters = () => {
  const category = categoryFilter.value;
  const color = colorFilter.value;
  const minPrice = parseInt(priceMin.value) || 0;
  const maxPrice = parseInt(priceMax.value) || Infinity;
  const searchQuery = searchProduct.value;

  console.log(searchQuery);  // To debug

  // Get all the slider items
  const allItems = Array.from(document.querySelectorAll('.slider-item'));
  let filteredItems = allItems;

  filteredItems.forEach((item) => {
    const itemCategory = item.dataset.category;
    const itemColor = item.dataset.color;
    const itemPrice = parseInt(item.dataset.price);
    const itemName = item.dataset.name; // Assuming you have a 'name' data attribute for each item
    const itemDescription = item.dataset.description; // Assuming you have a 'description' data attribute for each item

    // Check if the item matches the filter criteria
    const matchesCategory = category === 'all' || itemCategory === category;
    const matchesColor = color === 'all' || itemColor === color;
    const matchesPrice = itemPrice >= minPrice && itemPrice <= maxPrice;

    // Perform case-insensitive search check using 'toLowerCase'
    const matchesSearch =
      (itemName && itemName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (itemDescription && itemDescription.toLowerCase().includes(searchQuery.toLowerCase())); 

    if (matchesCategory && matchesColor && matchesPrice && matchesSearch) {
      item.style.display = 'flex'; // Show item
    } else {
      item.style.display = 'none'; // Hide item
    }
  });

  // Recalculate the maximum index after filtering
  currentIndex = 0;  // Reset index after filtering
  updateSliderPosition();
  adjustVisibleItems(); // Recalculate visible items
};

// Attach event listeners to the filter fields
categoryFilter.addEventListener('change', applyFilters);
colorFilter.addEventListener('change', applyFilters);
priceMin.addEventListener('input', applyFilters); // Trigger on input change (e.g., range or text)
priceMax.addEventListener('input', applyFilters);
searchProduct.addEventListener('input', applyFilters); // Trigger when user types in the search field

// Call the applyFilters function on page load to initialize the slider with default filters
window.addEventListener('DOMContentLoaded', applyFilters);


document.querySelectorAll('.design-option img').forEach(img => {
  img.addEventListener('click', function() {
      const modal = document.getElementById('imageModal');
      const modalImg = document.getElementById('modalImage');
      
      // Set the image source for the modal
      modal.style.display = "flex";  // Use flex to center the modal
      modalImg.src = this.src;
  });
});

// Close the modal when clicking on the close button
document.querySelector('.close').addEventListener('click', function() {
  document.getElementById('imageModal').style.display = "none";
});

// Close the modal when clicking outside of the modal content
window.addEventListener('click', function(event) {
  const modal = document.getElementById('imageModal');
  if (event.target === modal) {
      modal.style.display = "none";
  }
});

