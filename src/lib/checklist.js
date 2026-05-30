'use strict';

export const DEFAULT_CHECKLIST_ITEMS = {
  keys_handed: false,
  walls_clean: false,
  floor_clean: false,
  windows_working: false,
  doors_locks_working: false,
  kitchen_clean: false,
  bathroom_clean: false,
  electricity_working: false,
  water_working: false,
  ac_working: false,
  furniture_intact: false,
  meter_reading: '',
  photos_taken: false,
};

export const CHECKLIST_LABELS = {
  keys_handed: 'Keys handed over',
  walls_clean: 'Walls clean / undamaged',
  floor_clean: 'Floor clean',
  windows_working: 'Windows working',
  doors_locks_working: 'Doors & locks working',
  kitchen_clean: 'Kitchen clean',
  bathroom_clean: 'Bathroom clean',
  electricity_working: 'Electricity working',
  water_working: 'Water working',
  ac_working: 'AC / cooling working',
  furniture_intact: 'Furniture intact',
  meter_reading: 'Meter reading',
  photos_taken: 'Photos taken',
};

export function emptyChecklist() {
  return { ...DEFAULT_CHECKLIST_ITEMS };
}
