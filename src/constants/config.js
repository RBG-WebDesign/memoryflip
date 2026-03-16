// Samsung product icons (11 items — randomly selected each round)
import am9c1 from '../assets/icons/SAMSUNG_PRODUCTS/am9c1.png';
import autoUfs31 from '../assets/icons/SAMSUNG_PRODUCTS/auto-ufs-31.png';
import autoUfs41 from '../assets/icons/SAMSUNG_PRODUCTS/auto-ufs-41.png';
import detachableSsd from '../assets/icons/SAMSUNG_PRODUCTS/detachable-ssd.png';
import gddr7 from '../assets/icons/SAMSUNG_PRODUCTS/gddr7.png';
import hbm4 from '../assets/icons/SAMSUNG_PRODUCTS/hbm4.png';
import hbm4e from '../assets/icons/SAMSUNG_PRODUCTS/hbm4e.png';
import lpddr5x from '../assets/icons/SAMSUNG_PRODUCTS/lpddr5x.png';
import pm1753 from '../assets/icons/SAMSUNG_PRODUCTS/pm1753.png';
import pm1763 from '../assets/icons/SAMSUNG_PRODUCTS/pm1763.png';
import pm9e1 from '../assets/icons/SAMSUNG_PRODUCTS/pm9e1.png';

// Decoy icons
import desktopSpeaker from '../assets/icons/desktop-speaker.png';
import ethernetPlug from '../assets/icons/ethernet-plug.png';
import externalHardDrive from '../assets/icons/external-hard-drive.png';
import hdmiCable from '../assets/icons/hdmi-cable.png';
import joystick from '../assets/icons/joystick.png';
import liquidCooling from '../assets/icons/liquid-cooling-radiator.png';
import microphone from '../assets/icons/microphone.png';
import nasBox from '../assets/icons/nas-box.png';
import pcieCaptureCard from '../assets/icons/pcie-capture-card.png';
import powerBank from '../assets/icons/power-bank.png';
import printer from '../assets/icons/printer.png';
import solarCellRemote from '../assets/icons/samsung-solarcell-remote.png';
import sdAdapter from '../assets/icons/sd-adapter.png';
import soundCard from '../assets/icons/sound-card.png';
import usbDongle from '../assets/icons/usb-dongle.png';
import usbHub from '../assets/icons/usb-hub.png';
import vrHeadset from '../assets/icons/vr-headset.png';
import webcam from '../assets/icons/webcam.png';
import wifiRouter from '../assets/icons/wifi-router.png';

// Samsung products pool (11 items — game randomly picks from these each round)
export const SAMSUNG_PRODUCTS = [
  { name: 'AM9C1', icon: am9c1 },
  { name: 'Auto UFS 3.1', icon: autoUfs31 },
  { name: 'Auto UFS 4.1', icon: autoUfs41 },
  { name: 'Detachable SSD', icon: detachableSsd },
  { name: 'GDDR7', icon: gddr7 },
  { name: 'HBM4', icon: hbm4 },
  { name: 'HBM4E', icon: hbm4e },
  { name: 'LPDDR5X', icon: lpddr5x },
  { name: 'PM1753', icon: pm1753 },
  { name: 'PM1763', icon: pm1763 },
  { name: 'PM9E1', icon: pm9e1 },
];

// Decoy icons pool (19 items)
export const DECOY_ICONS = [
  { name: 'Desktop Speaker', icon: desktopSpeaker },
  { name: 'Ethernet Plug', icon: ethernetPlug },
  { name: 'External Hard Drive', icon: externalHardDrive },
  { name: 'HDMI Cable', icon: hdmiCable },
  { name: 'Joystick', icon: joystick },
  { name: 'Liquid Cooling', icon: liquidCooling },
  { name: 'Microphone', icon: microphone },
  { name: 'NAS Box', icon: nasBox },
  { name: 'PCIe Capture Card', icon: pcieCaptureCard },
  { name: 'Power Bank', icon: powerBank },
  { name: 'Printer', icon: printer },
  { name: 'SolarCell Remote', icon: solarCellRemote },
  { name: 'SD Adapter', icon: sdAdapter },
  { name: 'Sound Card', icon: soundCard },
  { name: 'USB Dongle', icon: usbDongle },
  { name: 'USB Hub', icon: usbHub },
  { name: 'VR Headset', icon: vrHeadset },
  { name: 'Webcam', icon: webcam },
  { name: 'WiFi Router', icon: wifiRouter },
];

// Combined list of all icons
export const ALL_ICONS = [...SAMSUNG_PRODUCTS, ...DECOY_ICONS];

// --- Round Configuration (8 rounds) ---
// Shuffle speed = duration of each swap animation in ms
// Shuffle pause = pause between consecutive swaps in ms
export const ROUND_CONFIG = [
  { round: 1, rows: 2, cols: 3, samsungCount: 1, taps: 2, revealTime: 4000, selectionTime: 8,  swapCount: [3, 4],   swapDuration: 900, swapPause: 600, pointsPerProduct: 50  },
  { round: 2, rows: 3, cols: 3, samsungCount: 2, taps: 3, revealTime: 4000, selectionTime: 8,  swapCount: [4, 6],   swapDuration: 900, swapPause: 600, pointsPerProduct: 75  },
  { round: 3, rows: 3, cols: 4, samsungCount: 3, taps: 4, revealTime: 4500, selectionTime: 9,  swapCount: [6, 8],   swapDuration: 900, swapPause: 600, pointsPerProduct: 100 },
  { round: 4, rows: 4, cols: 4, samsungCount: 4, taps: 5, revealTime: 4500, selectionTime: 8,  swapCount: [6, 8],   swapDuration: 900, swapPause: 600, pointsPerProduct: 150 },
  { round: 5, rows: 4, cols: 5, samsungCount: 5, taps: 6, revealTime: 5000, selectionTime: 6,  swapCount: [12, 14], swapDuration: 900, swapPause: 600, pointsPerProduct: 200 },
  { round: 6, rows: 4, cols: 5, samsungCount: 5, taps: 6, revealTime: 5000, selectionTime: 5,  swapCount: [14, 16], swapDuration: 900, swapPause: 600, pointsPerProduct: 250 },
  { round: 7, rows: 5, cols: 5, samsungCount: 5, taps: 6, revealTime: 4000, selectionTime: 5,  swapCount: [16, 18], swapDuration: 900, swapPause: 600, pointsPerProduct: 350 },
  { round: 8, rows: 5, cols: 5, samsungCount: 5, taps: 5, revealTime: 4000, selectionTime: 4,  swapCount: [18, 20], swapDuration: 900, swapPause: 600, pointsPerProduct: 500 },
];

// --- Prize Tiers ---
export const PRIZE_TIERS = [
  { threshold: 700, name: 'Regular Prize', tier: 'keychain' },
  { threshold: 3000, name: 'Grand Prize', tier: 'grand' },
];

// --- Grand Prize ---
export const GRAND_PRIZE_THRESHOLD = 3000;
export const GRAND_PRIZE_DAILY_MAX = 2;

const GP_STORAGE_KEY = 'galaxy-sync-grand-prize-winners';

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function getGrandPrizeWinnersToday() {
  try {
    const data = JSON.parse(localStorage.getItem(GP_STORAGE_KEY) || '{}');
    const today = getTodayKey();
    return data[today] || [];
  } catch { return []; }
}

export function addGrandPrizeWinner(name) {
  try {
    const data = JSON.parse(localStorage.getItem(GP_STORAGE_KEY) || '{}');
    const today = getTodayKey();
    if (!data[today]) data[today] = [];
    data[today].push({ name: name || 'Anonymous', time: Date.now() });
    localStorage.setItem(GP_STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

export function isGrandPrizeAvailable() {
  if (isGrandPrizeDisabled()) return false;
  return getGrandPrizeWinnersToday().length < GRAND_PRIZE_DAILY_MAX;
}

export function resetGrandPrizeToday() {
  try {
    const data = JSON.parse(localStorage.getItem(GP_STORAGE_KEY) || '{}');
    const today = getTodayKey();
    delete data[today];
    localStorage.setItem(GP_STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

const GP_DISABLED_KEY = 'galaxy-sync-grand-prize-disabled';

export function isGrandPrizeDisabled() {
  try {
    return localStorage.getItem(GP_DISABLED_KEY) === 'true';
  } catch { return false; }
}

export function setGrandPrizeDisabled(disabled) {
  try {
    if (disabled) {
      localStorage.setItem(GP_DISABLED_KEY, 'true');
    } else {
      localStorage.removeItem(GP_DISABLED_KEY);
    }
  } catch { /* ignore */ }
}

// Helper: get a random swap count within the round's range
export function getSwapCount(round) {
  const config = ROUND_CONFIG[round - 1];
  if (!config) return 4;
  const [min, max] = config.swapCount;
  return min + Math.floor(Math.random() * (max - min + 1));
}
