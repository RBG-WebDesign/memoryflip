import am9c1 from '../assets/icons/AM9C1.png';
import gddr7 from '../assets/icons/GDDR7.png';
import hbm4 from '../assets/icons/HBM4.png';
import lpddr5x from '../assets/icons/LPDDR5X.png';
import pm1763 from '../assets/icons/PM1763.png';
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

export const ALL_ICONS = [
  { name: 'AM9C1', icon: am9c1 },
  { name: 'GDDR7', icon: gddr7 },
  { name: 'HBM4', icon: hbm4 },
  { name: 'LPDDR5X', icon: lpddr5x },
  { name: 'PM1763', icon: pm1763 },
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

// --- Game Modes ---
export const GAME_MODES = {
  TIMED: 'TIMED',
  SURVIVOR: 'SURVIVOR',
};

// --- Grand Prize threshold ---
// Players must reach this total score to qualify for a grand prize (JBL speakers).
// Set extremely high — requires near-perfect play through 7+ levels.
export const GRAND_PRIZE_THRESHOLD = 10000;

// Max winners per day — once reached, the grand prize tracker hides for the rest of the day.
export const GRAND_PRIZE_DAILY_MAX = 2;

// --- Grand Prize daily winner helpers ---
const GP_STORAGE_KEY = 'galaxy-sync-grand-prize-winners';

function getTodayKey() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
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

// --- Shared preview-time curve ---
// Shorter previews = harder memorization, especially on later levels
function getPreviewTime(level) {
  if (level === 1) return 3500;
  if (level === 2) return 3000;
  if (level === 3) return 2800;
  if (level === 4) return 2200;
  if (level === 5) return 1800;
  const adjusted = level - 5;
  return Math.max(1200, 1800 - adjusted * 100);
}

// --- Shared pairs/grid curve ---
function getPairsAndGrid(level) {
  if (level === 1) return { pairs: 2, gridClass: 'grid-cols-2', timeLimit: 12 };
  if (level === 2) return { pairs: 3, gridClass: 'grid-cols-2', timeLimit: 15 };
  if (level === 3) return { pairs: 6, gridClass: 'grid-cols-3', timeLimit: 28 };
  if (level === 4) return { pairs: 10, gridClass: 'grid-cols-4', timeLimit: 40 };
  return { pairs: 12, gridClass: 'grid-cols-4', timeLimit: 45 };
}

// --- Level Config ---
export function getLevelConfig(level, mode = GAME_MODES.TIMED) {
  const { pairs, gridClass, timeLimit } = getPairsAndGrid(level);
  const previewTime = getPreviewTime(level);
  const base = { pairs, gridClass, previewTime, timeLimit };

  if (mode === GAME_MODES.SURVIVOR) {
    return {
      ...base,
      maxHealth: 100,
      damagePerMiss: Math.min(18 + (level - 1) * 2, 30),
    };
  }

  return base;
}

// Legacy lookup — keeps old references working during transition
export const LEVEL_CONFIG = new Proxy({}, {
  get(_, key) {
    const level = parseInt(key, 10);
    if (!isNaN(level)) return getLevelConfig(level);
    return undefined;
  },
});
