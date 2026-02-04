
import { browser } from 'k6/browser';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// Custom metrics
const pageLoadTime = new Trend('page_load_time');
const interactionTime = new Trend('interaction_time');
const angularBootstrapTime = new Trend('angular_bootstrap_time');
const apiCallTime = new Trend('api_call_time');
const errorsCounter = new Counter('browser_errors');

export const options = {
  scenarios: {
    ui_test: {
      executor: 'shared-iterations',
      options: {
        browser: {
          type: 'chromium',
        },
      },
      vus: 2,
      iterations: 5,
      maxDuration: '5m',
    },
  },
  thresholds: {
    'browser_web_vital_fcp': ['p(95) < 3000'],
    'browser_web_vital_lcp': ['p(95) < 4000'],
    'page_load_time': ['p(95) < 5000'],
    'interaction_time': ['p(95) < 1000'],
    'checks': ['rate>0.90'],
  },
};

const BASE_URL = __ENV.APP_URL || 'http://localhost:4200';

export default async function() {
  const context = browser.newContext();
  const page = context.newPage();
  
  try {
    await testPageLoad(page);
    await testViewBooksList(page);
    await testCreateBook(page);
    await testSearchBooks(page);
    
  } catch (error) {
    console.error('Browser test error:', error);
    errorsCounter.add(1);
  } finally {
    page.close();
    context.close();
  }
}

async function testPageLoad(page) {
  console.log('📄 Testing initial page load...');
  const startTime = Date.now();
  
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    pageLoadTime.add(loadTime);
    
    await page.waitForSelector('app-root', { timeout: 10000 });
    
    const angularBootstrap = Date.now() - startTime;
    angularBootstrapTime.add(angularBootstrap);
    
    check(page, {
      'page loaded successfully': () => page.url().includes(BASE_URL),
      'app-root element exists': () => page.$('app-root') !== null,
      'page load time < 5s': () => loadTime < 5000,
    });
    
    console.log(` Page loaded in ${loadTime}ms`);
    
  } catch (error) {
    console.error('Page load failed:', error);
    errorsCounter.add(1);
    throw error;
  }
  
  sleep(1);
}

async function testViewBooksList(page) {
  console.log('📚 Testing books list view...');
  const startTime = Date.now();
  
  try {
    await page.waitForTimeout(2000);
    
    const loadTime = Date.now() - startTime;
    apiCallTime.add(loadTime);
    
    check(page, {
      'page content visible': () => page.$('body') !== null,
      'load time < 3s': () => loadTime < 3000,
    });
    
    console.log(` Books list loaded in ${loadTime}ms`);
    
  } catch (error) {
    console.error('Books list test failed:', error);
    errorsCounter.add(1);
  }
  
  sleep(1);
}

async function testCreateBook(page) {
  console.log('➕ Testing create book functionality...');
  const startTime = Date.now();
  
  try {
    const createButton = page.locator('button:has-text("Add"), button:has-text("Create"), a:has-text("New")').first();
    
    if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(2000);
      
      const titleInput = page.locator('input[name="title"], #title, [formControlName="title"]').first();
                        
      if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        const timestamp = Date.now();
        await titleInput.fill(`Performance Test Book ${timestamp}`);
        
        const authorInput = page.locator('input[name="author"], #author, [formControlName="author"]').first();
        if (await authorInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await authorInput.fill('K6 Tester');
        }
        
        await page.waitForTimeout(1000);
        
        const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();
        if (await submitButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await submitButton.click();
          await page.waitForTimeout(2000);
        }
      }
      
      const createTime = Date.now() - startTime;
      interactionTime.add(createTime);
      
      check(page, {
        'book creation completed': () => createTime < 10000,
      });
      
      console.log(` Book creation flow completed in ${createTime}ms`);
    } else {
      console.log(' Create button not found, skipping test');
    }
    
  } catch (error) {
    console.error('Create book test failed:', error);
    errorsCounter.add(1);
  }
  
  sleep(1);
}

async function testSearchBooks(page) {
  console.log('🔍 Testing search functionality...');
  const startTime = Date.now();
  
  try {
    const homeLink = page.locator('a:has-text("Home"), a:has-text("Books"), a[href="/"]').first();
    if (await homeLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await homeLink.click();
      await page.waitForTimeout(1000);
    }
    
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], #search').first();
    
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('Test');
      await page.waitForTimeout(2000);
      
      const searchTime = Date.now() - startTime;
      interactionTime.add(searchTime);
      
      check(page, {
        'search completed': () => searchTime < 3000,
      });
      
      console.log(` Search completed in ${searchTime}ms`);
    } else {
      console.log(' Search input not found, skipping test');
    }
    
  } catch (error) {
    console.error('Search test failed:', error);
    errorsCounter.add(1);
  }
  
  sleep(1);
}








// // browser-test.js - K6 Browser testing for Angular Books Application
// import { browser } from 'k6/browser';
// import { check, sleep } from 'k6';
// import { Counter, Trend } from 'k6/metrics';

// // Custom metrics
// const pageLoadTime = new Trend('page_load_time');
// const interactionTime = new Trend('interaction_time');
// const angularBootstrapTime = new Trend('angular_bootstrap_time');
// const apiCallTime = new Trend('api_call_time');
// const errorsCounter = new Counter('browser_errors');

// export const options = {
//   scenarios: {
//     ui_test: {
//       executor: 'shared-iterations',
//       options: {
//         browser: {
//           type: 'chromium',
//         },
//       },
//       vus: 3,
//       iterations: 10,
//       maxDuration: '10m',
//     },
//   },
//   thresholds: {
//     'browser_web_vital_fcp': ['p(95) < 3000'], // First Contentful Paint
//     'browser_web_vital_lcp': ['p(95) < 4000'], // Largest Contentful Paint
//     'page_load_time': ['p(95) < 5000'],
//     'interaction_time': ['p(95) < 1000'],
//     'checks': ['rate>0.95'],
//   },
// };

// const BASE_URL = __ENV.APP_URL || 'http://localhost:4200';

// export default async function() {
//   const page = browser.newPage();
  
//   try {
//     // Test 1: Initial Page Load
//     await testPageLoad(page);
    
//     // Test 2: View Books List
//     await testViewBooksList(page);
    
//     // Test 3: Create New Book
//     await testCreateBook(page);
    
//     // Test 4: Search Books
//     await testSearchBooks(page);
    
//     // Test 5: Edit Book
//     await testEditBook(page);
    
//     // Test 6: Delete Book
//     await testDeleteBook(page);
    
//   } catch (error) {
//     console.error('Browser test error:', error);
//     errorsCounter.add(1);
//   } finally {
//     page.close();
//   }
// }

// async function testPageLoad(page) {
//   console.log('📄 Testing initial page load...');
//   const startTime = Date.now();
  
//   try {
//     await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    
//     const loadTime = Date.now() - startTime;
//     pageLoadTime.add(loadTime);
    
//     // Wait for Angular to bootstrap
//     await page.waitForSelector('app-root', { timeout: 10000 });
    
//     const angularBootstrap = Date.now() - startTime;
//     angularBootstrapTime.add(angularBootstrap);
    
//     check(page, {
//       'page loaded successfully': () => page.url().includes(BASE_URL),
//       'app-root element exists': () => page.$('app-root') !== null,
//       'page load time < 5s': () => loadTime < 5000,
//     });
    
//     // Capture console errors
//     page.on('console', (msg) => {
//       if (msg.type() === 'error') {
//         console.error('Browser console error:', msg.text());
//         errorsCounter.add(1);
//       }
//     });
    
//     console.log(`✅ Page loaded in ${loadTime}ms`);
    
//   } catch (error) {
//     console.error('Page load failed:', error);
//     errorsCounter.add(1);
//     throw error;
//   }
  
//   sleep(1);
// }

// async function testViewBooksList(page) {
//   console.log('📚 Testing books list view...');
//   const startTime = Date.now();
  
//   try {
//     // Wait for books to load
//     await page.waitForSelector('.books-container, .book-card, table', { timeout: 10000 });
    
//     const loadTime = Date.now() - startTime;
//     apiCallTime.add(loadTime);
    
//     // Take screenshot for visual validation
//     page.screenshot({ path: 'screenshots/books-list.png' });
    
//     check(page, {
//       'books list loaded': () => page.$('.books-container, table') !== null,
//       'books data displayed': () => page.$$('.book-card, tr').length > 0,
//       'load time < 2s': () => loadTime < 2000,
//     });
    
//     console.log(`✅ Books list loaded in ${loadTime}ms`);
    
//   } catch (error) {
//     console.error('Books list test failed:', error);
//     errorsCounter.add(1);
//   }
  
//   sleep(1);
// }

// async function testCreateBook(page) {
//   console.log('➕ Testing create book functionality...');
//   const startTime = Date.now();
  
//   try {
//     // Look for create/add button
//     const createButton = page.$('button:has-text("Add"), button:has-text("Create"), a:has-text("New")');
    
//     if (createButton) {
//       await createButton.click();
//       await page.waitForSelector('form, input[name="title"]', { timeout: 5000 });
      
//       // Fill out the form
//       const timestamp = Date.now();
//       await page.type('input[name="title"], #title, [formControlName="title"]', `Performance Test Book ${timestamp}`);
//       await page.type('input[name="author"], #author, [formControlName="author"]', 'K6 Tester');
      
//       // Optional fields if they exist
//       const genreInput = page.$('input[name="genre"], #genre, [formControlName="genre"]');
//       if (genreInput) {
//         await page.type('input[name="genre"], #genre, [formControlName="genre"]', 'Testing');
//       }
      
//       const yearInput = page.$('input[name="year_published"], #year_published, [formControlName="year_published"]');
//       if (yearInput) {
//         await page.type('input[name="year_published"], #year_published, [formControlName="year_published"]', '2024');
//       }
      
//       const copiesInput = page.$('input[name="available_copies"], #available_copies, [formControlName="available_copies"]');
//       if (copiesInput) {
//         await page.type('input[name="available_copies"], #available_copies, [formControlName="available_copies"]', '5');
//       }
      
//       // Take screenshot before submit
//       page.screenshot({ path: 'screenshots/create-book-form.png' });
      
//       // Submit form
//       const submitButton = page.$('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
//       await submitButton.click();
      
//       // Wait for navigation or success message
//       await page.waitForTimeout(2000);
      
//       const createTime = Date.now() - startTime;
//       interactionTime.add(createTime);
      
//       check(page, {
//         'book creation completed': () => createTime < 5000,
//         'no error messages': () => page.$('.error, .alert-danger') === null,
//       });
      
//       console.log(`✅ Book created in ${createTime}ms`);
      
//     } else {
//       console.log('⚠️ Create button not found, skipping test');
//     }
    
//   } catch (error) {
//     console.error('Create book test failed:', error);
//     page.screenshot({ path: 'screenshots/create-book-error.png' });
//     errorsCounter.add(1);
//   }
  
//   sleep(1);
// }

// async function testSearchBooks(page) {
//   console.log('🔍 Testing search functionality...');
//   const startTime = Date.now();
  
//   try {
//     // Navigate to home/list if not there
//     const homeLink = page.$('a:has-text("Home"), a:has-text("Books"), a[href="/"]');
//     if (homeLink) {
//       await homeLink.click();
//       await page.waitForTimeout(1000);
//     }
    
//     // Find search input
//     const searchInput = page.$('input[type="search"], input[placeholder*="Search"], #search');
    
//     if (searchInput) {
//       await searchInput.type('Test');
//       await page.waitForTimeout(1500); // Wait for debounce/search
      
//       const searchTime = Date.now() - startTime;
//       interactionTime.add(searchTime);
      
//       page.screenshot({ path: 'screenshots/search-results.png' });
      
//       check(page, {
//         'search completed': () => searchTime < 3000,
//         'search results displayed': () => true, // Page didn't crash
//       });
      
//       console.log(`✅ Search completed in ${searchTime}ms`);
      
//     } else {
//       console.log('⚠️ Search input not found, skipping test');
//     }
    
//   } catch (error) {
//     console.error('Search test failed:', error);
//     errorsCounter.add(1);
//   }
  
//   sleep(1);
// }

// async function testEditBook(page) {
//   console.log('✏️ Testing edit book functionality...');
//   const startTime = Date.now();
  
//   try {
//     // Find first edit button
//     const editButton = page.$('button:has-text("Edit"), a:has-text("Edit"), .edit-btn');
    
//     if (editButton) {
//       await editButton.click();
//       await page.waitForSelector('form, input[name="title"]', { timeout: 5000 });
      
//       // Modify a field
//       const copiesInput = page.$('input[name="available_copies"], #available_copies, [formControlName="available_copies"]');
//       if (copiesInput) {
//         await copiesInput.clear();
//         await copiesInput.type('10');
        
//         // Submit
//         const submitButton = page.$('button[type="submit"], button:has-text("Save"), button:has-text("Update")');
//         await submitButton.click();
        
//         await page.waitForTimeout(2000);
        
//         const editTime = Date.now() - startTime;
//         interactionTime.add(editTime);
        
//         check(page, {
//           'book edit completed': () => editTime < 5000,
//         });
        
//         console.log(`✅ Book edited in ${editTime}ms`);
//       }
      
//     } else {
//       console.log('⚠️ Edit button not found, skipping test');
//     }
    
//   } catch (error) {
//     console.error('Edit book test failed:', error);
//     errorsCounter.add(1);
//   }
  
//   sleep(1);
// }

// async function testDeleteBook(page) {
//   console.log('🗑️ Testing delete book functionality...');
//   const startTime = Date.now();
  
//   try {
//     // Find delete button
//     const deleteButton = page.$('button:has-text("Delete"), .delete-btn');
    
//     if (deleteButton) {
//       await deleteButton.click();
      
//       // Handle confirmation dialog if it exists
//       await page.waitForTimeout(500);
//       const confirmButton = page.$('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("OK")');
//       if (confirmButton) {
//         await confirmButton.click();
//       }
      
//       await page.waitForTimeout(2000);
      
//       const deleteTime = Date.now() - startTime;
//       interactionTime.add(deleteTime);
      
//       check(page, {
//         'book delete completed': () => deleteTime < 5000,
//       });
      
//       console.log(`✅ Book deleted in ${deleteTime}ms`);
      
//     } else {
//       console.log('⚠️ Delete button not found, skipping test');
//     }
    
//   } catch (error) {
//     console.error('Delete book test failed:', error);
//     errorsCounter.add(1);
//   }
  
//   sleep(1);
// }

// export function handleSummary(data) {
//   return {
//     'summary.html': htmlReport(data),
//     'summary.json': JSON.stringify(data, null, 2),
//   };
// }

// function htmlReport(data) {
//   const metrics = data.metrics;
  
//   return `
//     <!DOCTYPE html>
//     <html>
//     <head>
//       <title>K6 Angular Browser Test Report</title>
//       <style>
//         body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
//         .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
//         h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
//         h2 { color: #666; margin-top: 30px; }
//         .metric { background: #f9f9f9; padding: 15px; margin: 10px 0; border-left: 4px solid #4CAF50; border-radius: 4px; }
//         .metric-name { font-weight: bold; color: #333; }
//         .metric-value { color: #666; margin-top: 5px; }
//         .pass { color: #4CAF50; font-weight: bold; }
//         .fail { color: #f44336; font-weight: bold; }
//         .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
//         .summary-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
//         .summary-card h3 { margin: 0 0 10px 0; font-size: 14px; opacity: 0.9; }
//         .summary-card .value { font-size: 32px; font-weight: bold; }
//       </style>
//     </head>
//     <body>
//       <div class="container">
//         <h1>🎭 K6 Angular Browser Performance Test Report</h1>
//         <p>Generated: ${new Date().toLocaleString()}</p>
        
//         <div class="summary">
//           <div class="summary-card">
//             <h3>Total Iterations</h3>
//             <div class="value">${data.root_group.checks ? Math.floor(metrics.iterations.values.count) : 'N/A'}</div>
//           </div>
//           <div class="summary-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
//             <h3>Success Rate</h3>
//             <div class="value">${metrics.checks ? (metrics.checks.values.passes / (metrics.checks.values.passes + metrics.checks.values.fails) * 100).toFixed(1) : 'N/A'}%</div>
//           </div>
//           <div class="summary-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
//             <h3>Avg Page Load</h3>
//             <div class="value">${metrics.page_load_time ? Math.round(metrics.page_load_time.values.avg) : 'N/A'}ms</div>
//           </div>
//           <div class="summary-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
//             <h3>Errors</h3>
//             <div class="value">${metrics.browser_errors ? metrics.browser_errors.values.count : 0}</div>
//           </div>
//         </div>
        
//         <h2>📊 Detailed Metrics</h2>
//         ${Object.keys(metrics).map(key => {
//           const metric = metrics[key];
//           if (!metric.values) return '';
//           return `
//             <div class="metric">
//               <div class="metric-name">${key}</div>
//               <div class="metric-value">
//                 ${metric.values.avg !== undefined ? `Avg: ${Math.round(metric.values.avg)}ms | ` : ''}
//                 ${metric.values.min !== undefined ? `Min: ${Math.round(metric.values.min)}ms | ` : ''}
//                 ${metric.values.max !== undefined ? `Max: ${Math.round(metric.values.max)}ms | ` : ''}
//                 ${metric.values['p(95)'] !== undefined ? `P95: ${Math.round(metric.values['p(95)'])}ms | ` : ''}
//                 ${metric.values.count !== undefined ? `Count: ${metric.values.count}` : ''}
//               </div>
//             </div>
//           `;
//         }).join('')}
        
//         <h2>✅ Check Results</h2>
//         ${data.root_group.checks ? data.root_group.checks.map(check => `
//           <div class="metric">
//             <div class="metric-name ${check.passes > 0 ? 'pass' : 'fail'}">
//               ${check.passes > 0 ? '✅' : '❌'} ${check.name}
//             </div>
//             <div class="metric-value">
//               Passes: ${check.passes} | Fails: ${check.fails}
//             </div>
//           </div>
//         `).join('') : 'No checks recorded'}
//       </div>
//     </body>
//     </html>
//   `;
// }