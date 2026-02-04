
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',
    video: true,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    env: {
      apiUrl: 'http://localhost:8080',
    },
    setupNodeEvents(on, config) {
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
      });
    },
  },
  component: {
    devServer: {
      framework: 'angular',
      bundler: 'webpack',
      options: {
        projectConfig: {
          root: '',
          sourceRoot: 'src',
          buildOptions: {
            outputPath: 'dist',
            index: 'src/index.html',
            main: 'src/main.ts',
            tsConfig: 'tsconfig.cy.json',
          },
        },
      },
    },
    specPattern: 'src/**/*.cy.ts',
    excludeSpecPattern: ['cypress/e2e/**/*'],
    supportFile: 'cypress/support/component.ts',
    indexHtmlFile: 'cypress/support/component-index.html',
  },
});


// import { defineConfig } from 'cypress';

// export default defineConfig({
//   e2e: {
//     baseUrl: 'http://localhost:4200',
//     supportFile: 'cypress/support/e2e.ts',
//     specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
//     videosFolder: 'cypress/videos',
//     screenshotsFolder: 'cypress/screenshots',
//     video: true,
//     screenshotOnRunFailure: true,
//     viewportWidth: 1280,
//     viewportHeight: 720,
//     defaultCommandTimeout: 10000,
//     requestTimeout: 10000,
//     responseTimeout: 10000,
//     env: {
//       apiUrl: 'http://localhost:8080',
//     },
//     setupNodeEvents(on, config) {
//       // implement node event listeners here
//       on('task', {
//         log(message) {
//           console.log(message);
//           return null;
//         },
//       });
//     },
//   },
//   component: {
//     devServer: {
//       framework: 'angular',
//       bundler: 'webpack',
//     },
//     specPattern: '**/*.cy.ts',
//     indexHtmlFile: 'cypress/support/component-index.html',
//   },
// });