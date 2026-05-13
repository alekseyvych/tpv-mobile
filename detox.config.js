module.exports = {
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 14',
      },
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'artifacts/tpvMobile.app',
      build: 'xcodebuild -workspace ios/tpvMobile.xcworkspace -scheme tpvMobile -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'artifacts/tpvMobile.app',
      build: 'xcodebuild -workspace ios/tpvMobile.xcworkspace -scheme tpvMobile -configuration Release -sdk iphonesimulator -derivedDataPath ios/build',
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release',
    },
  },
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
};
