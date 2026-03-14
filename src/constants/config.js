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
  ENDLESS: 'ENDLESS',
  SURVIVOR: 'SURVIVOR',
};

// --- Shared preview-time curve ---
function getPreviewTime(level) {
  if (level === 1) return 4000;
  if (level === 2) return 3800;
  const adjusted = level - 2;
  if (adjusted <= 5) return 3800 - (adjusted - 1) * 200;
  if (adjusted <= 10) return 3000 - (adjusted - 5) * 140;
  if (adjusted <= 20) return 2300 - (adjusted - 10) * 80;
  return Math.max(1300, 1500 - (adjusted - 20) * 20);
}

// --- Shared pairs/grid curve ---
function getPairsAndGrid(level) {
  if (level === 1) return { pairs: 2, gridClass: 'grid-cols-2', timeLimit: 15 };
  if (level === 2) return { pairs: 3, gridClass: 'grid-cols-2', timeLimit: 20 };
  if (level === 3) return { pairs: 6, gridClass: 'grid-cols-3', timeLimit: 35 };
  if (level === 4) return { pairs: 10, gridClass: 'grid-cols-4', timeLimit: 55 };
  return { pairs: 12, gridClass: 'grid-cols-4', timeLimit: 65 };
}

// --- Level Config ---
export function getLevelConfig(level, mode = GAME_MODES.ENDLESS) {
  const { pairs, gridClass, timeLimit } = getPairsAndGrid(level);
  const previewTime = getPreviewTime(level);
  const base = { pairs, gridClass, previewTime, timeLimit };

  if (mode === GAME_MODES.SURVIVOR) {
    return {
      ...base,
      maxHealth: 100,
      damagePerMiss: Math.min(12 + (level - 1) * 1.5, 24),
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
