import { Setting } from "../../assets/models/Setting"

export const LOCAL_STORAGE_KEYS = {
  AUTH_PROFILE: 'auth_profile',
  USER_PROFILE: 'user_profile',
  CUSTOMER_DATA: 'customer_data',
  DELIVERY_PERSON_DATA: 'delivery_person_data',
  SETTING: 'user_setting',
  NAV_SETTING: 'user_nav_setting',
  TAG_DATA: 'tag_data',
  ATTENDANCE_DATA: 'attendance_data',
}
// /https://ag-grid.com/charts/react/bar-series/#reference-AgBarSeriesOptions-tooltip

export const APPLICATION_DATA = {
  CURRENT_VERSION: '1.0.0',
  LAST_UPDATED: '2 October 2025',
  APP_NAME: 'Fuel Flow',
  APP_DESCRIPTION: 'Delivery Management App is a web application that allows business owners to track their deliveries, customers and other products.',
  DEVELOPER_NAME: 'Harsh Gupta',
  DEVELOPER_EMAIL: 'harshgupta.code1@gmail.com',
  AI_AGENT_ENDPOINT: 'https://cylinder-agent-406734351582.europe-west1.run.app/chat' //https://g-event-fuel-flow-default-rtdb.europe-west1.firebasedatabase.app/
}

export const DEFAULT_LOCAL_SETTING: Setting = {
  exportFileType: 'ask',
  exportDataSize: 'ask',
  dataToInclude: [],
  oldEntryWhenDateEdited: 'ask',
  askForConfirmationOnEdit: 'yes',
  askForConfirmationOnDuplicate: 'yes',
  askForConfirmationOnNewAddress: 'yes',
  closeDepositEntryOnSelectProfile: 'yes',
  showNegativePendingReturns: 'no',
  defaultDateOnNewEntry: 'currentDay',
  showEfficiencyTracker: 'no',
  showDataLoadedTracker: 'no',
  customDate: ''
}

export const DEVELOPER = {
  IS_DEV_ENVIRONMENT: false, // Set to true if you are in a development environment
  DEV_PATH_PREFIX: 'dev/',
  IS_STAGE_ENVIRONMENT: false, // Set to true if you are in a staging environment
  STAGE_PATH_PREFIX: 'stage/',
  USE_LOCAL_DATABASE: false, // Set to true to use local JSON files for development
  LOCAL_DATABASE_URL: 'assets/json/local-database.json',
}

export const DEFAULT_NAV_OBJECT = (() => {
  const obj: any = {
    customers: {
      title: 'Customers',
      key: 'customers',
      visibleIn: 'top',
      visible: true,
      enable: true
    },
    delivery: {
      title: 'Delivery',
      key: 'delivery',
      visibleIn: 'top',
      visible: true,
      enable: true
    },
    inventory: {
      title: 'Inventory',
      key: 'inventory',
      visibleIn: 'top',
      visible: true,
      enable: true
    },
    profile: {
      title: 'Profile',
      key: 'profile',
      visibleIn: 'side',
      visible: true,
      enable: true
    },
    warehouse: {
      title: 'Warehouse',
      key: 'warehouse',
      visibleIn: 'top',
      visible: true,
      enable: true
    },
    'bulk-entry': {
      title: 'Bulk Entry',
      key: 'bulk-entry',
      visibleIn: 'side',
      visible: true,
      enable: true
    },
    'move-entries': {
      title: 'Move Entries',
      key: 'move-entries',
      visibleIn: 'side',
      visible: true,
      enable: true
    },
    statistics: {
      title: 'Statistics',
      key: 'statistics',
      visibleIn: 'top',
      visible: true,
      enable: true
    },
    'log-out': {
      title: 'Log Out',
      key: 'log-out',
      visibleIn: 'side',
      visible: true,
      enable: true
    }
  };

  if (DEVELOPER.IS_DEV_ENVIRONMENT) {
    obj['custom-develop'] = {
      title: 'Custom Develop',
      key: 'custom-develop',
      visibleIn: 'side',
      visible: true,
      enable: true
    };
  }

  return obj;
})();