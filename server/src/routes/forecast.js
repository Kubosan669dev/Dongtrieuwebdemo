import { getWeather } from '../services/weather.js';
import { getTide } from '../services/tide.js';
import { getBulletins } from '../services/bulletins.js';
import { prisma } from '../lib/prisma.js';

async function settingCoords(key, fallback) {
  const s = await prisma.siteSetting.findUnique({ where: { key } }).catch(() => null);
  const v = s?.valueJson;
  if (v && Number.isFinite(v.lat) && Number.isFinite(v.lon)) return { lat: v.lat, lon: v.lon, label: v.label };
  return fallback;
}

export async function weatherHandler(_req, res) {
  const c = await settingCoords('weather', null);
  const data = await getWeather(c?.lat, c?.lon);
  if (c?.label) data.location.label = c.label;
  res.json(data);
}

export async function tideHandler(_req, res) {
  const c = await settingCoords('tide', null);
  const data = await getTide(c?.lat, c?.lon);
  if (c?.label) data.location.label = c.label;
  res.json(data);
}

export async function bulletinsHandler(_req, res) {
  res.json(await getBulletins());
}
