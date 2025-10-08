import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import Islam from "./islam";
// import { PrayerTimeCalculator } from './prayerTimes';
// Buat instance class Islam
const islam = new Islam();
let notificationTimer: NodeJS.Timeout | null = null;
let prayerTimer: NodeJS.Timeout | null = null;
let mainPanel: vscode.WebviewPanel | null = null;
let imsakiyah: any = null;
let savedLat: number = 0;
let savedLon: number = 0;
let savedTz: number = 0;
let savedHisab: string = '';

const formatMasehi = (masehiDate: string) => {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const [tahun, bulan, tanggal] = masehiDate.split('-');
  return `${parseInt(tanggal)} ${months[parseInt(bulan) - 1]} ${tahun}`;
}

const formatHijriyah = (masehiDate: string) => {
  const months = ["Muharram","Shofar","Robiul Awwal",
    "Robiul Tsani","Jumadil Awwal","Jumadil Akhir",
    "Rojab","Sya'ban","Romadlon","Syawal",
    "Dzulqo'dah","Dzulhijjah"];
  const [tahun, bulan, tanggal] = masehiDate.split('-');
  return `${parseInt(tanggal)} ${months[parseInt(bulan) - 1]} ${tahun}`;
}

const capitalize = (s: string) => {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function loadAllCities(basePath: string) {
  const cities: any[] = [];
  const files = fs.readdirSync(basePath).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const json = JSON.parse(fs.readFileSync(path.join(basePath, file), 'utf8'));
    json.data.forEach((item: any) =>
        cities.push({
          province: file.replace('.json', ''),
          name: item.name,
          lat: item.lat,
          lon: item.lon,
          tz: item.tz,
        })
    );
  }
  return cities;
}

/*
function getAudioPlayerHTML(context: vscode.ExtensionContext, webview: vscode.Webview, playSound: boolean): string {
  const soundPath = vscode.Uri.joinPath(
      context.extensionUri,
      'media',
      'audio',
      'adzan',
      'adzan_others.mp3'
  );

  const soundUri = webview.asWebviewUri(soundPath);

  const htmlPath = path.join(context.extensionPath, 'media', 'view', 'player.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  // Sisipkan URL audio ke dalam HTML
  html = html.replace(/\$\{soundUri\}/g, soundUri.toString());
  return html;
}
*/

function getWebviewContent(context: vscode.ExtensionContext, currentCity: string, soundUri: any, currentHisab: string): string {
  const htmlPath = path.join(context.extensionPath, 'media', 'view', 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  // Sisipkan variabel dinamis (misalnya nama kota)
  html = html.replace(/\$\{currentCity\}/g, currentCity || '');
  html = html.replace(/\$\{soundUri\}/g, soundUri.toString());
  html = html.replace(/\$\{currentHisab\}/g, currentHisab || 'umum');
  return html;
}

function createMainPanel(context: vscode.ExtensionContext) {
  const soundPath = vscode.Uri.joinPath(
      context.extensionUri,
      'media',
      'audio',
      'adzan',
      'adzan_others.mp3'
  );
  const panel = vscode.window.createWebviewPanel(
      'kalenderquCitySelector',
      'KalenderQu - Jadwal Shalat',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
  );
  const soundUri = panel.webview.asWebviewUri(soundPath);
  const config = vscode.workspace.getConfiguration('kalenderqu_adzan');
  const currentCity = config.get<string>('city') || '';
  const currentHisab = config.get<string>('hisab') || '';
  const dataPath = path.join(context.extensionPath, 'media', 'data', 'indonesia');
  panel.webview.html = getWebviewContent(context, currentCity, soundUri, currentHisab);
  panel.webview.onDidReceiveMessage(async (message) => {
    switch (message.command) {
      case 'loadCities': {
        const cities = await loadAllCities(dataPath);
        panel.webview.postMessage({ command: 'showCities', cities });
        break;
      }
      case 'saveCity': {
        const selected = message.city;
        if (!selected) return;
        await config.update('city', selected.name, vscode.ConfigurationTarget.Global);
        await config.update('lat', Number(selected.lat), vscode.ConfigurationTarget.Global);
        await config.update('lon', Number(selected.lon), vscode.ConfigurationTarget.Global);
        await config.update('tz', Number(selected.tz), vscode.ConfigurationTarget.Global);
        savedHisab = config.get<string>('hisab') ?? 'umum';
        vscode.window.showInformationMessage(`Kota disimpan: ${selected.name}`);
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        const day = new Date().getDate();

        savedLat = selected.lat || 0;
        savedLon = selected.lon || 0;
        savedTz = selected.tz || 0;

        imsakiyah = islam.Imsakiyah(year, month, day, selected.lat, selected.lon, selected.tz, savedHisab);
        panel.webview.postMessage({ command: 'showTimes', imsakiyah, city: selected.name });

        startAdzanWatcher();
        prayerWatcher();
        break;
      }
      case 'loadSavedCity': {
        const cityName = message.city;
        savedLat = config.get<number>('lat') ?? 0;
        savedLon = config.get<number>('lon') ?? 0;
        savedTz = config.get<number>('tz') ?? 0;
        savedHisab = config.get<string>('hisab') ?? 'umum';
        if (cityName && savedLat && savedLon && savedTz) {
          const year = new Date().getFullYear();
          const month = new Date().getMonth() + 1;
          const day = new Date().getDate()

          imsakiyah = islam.Imsakiyah(year, month, day, savedLat, savedLon, savedTz, savedHisab);
          panel.webview.postMessage({ command: 'showTimes', imsakiyah, city: cityName });
          const masehiDate = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ')[0];

          const hijriDate = islam.MasehiToHijri(year, month, day);
          const dates = {
            'masehi': formatMasehi(masehiDate),
            'hijriyah': formatHijriyah(hijriDate),
          };
          panel.webview.postMessage({ command: 'showDates', dates });
        } else {
          panel.webview.postMessage({ command: 'showCities', cities: await loadAllCities(dataPath) });
        }
        break;
      }
      case 'changeHisab': {
        savedHisab = message.hisab;
        await config.update('hisab', savedHisab, vscode.ConfigurationTarget.Global);
        const cityName = config.get<string>('city') ?? '';
        savedLat = config.get<number>('lat') ?? 0;
        savedLon = config.get<number>('lon') ?? 0;
        savedTz = config.get<number>('tz') ?? 0;

        if (cityName && savedLat && savedLon && savedTz) {
          const year = new Date().getFullYear();
          const month = new Date().getMonth() + 1;
          const day = new Date().getDate()

          imsakiyah = islam.Imsakiyah(year, month, day, savedLat, savedLon, savedTz, savedHisab);
          panel.webview.postMessage({ command: 'showTimes', imsakiyah, city: cityName });
          const masehiDate = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ')[0];

          const hijriDate = islam.MasehiToHijri(year, month, day);
          const dates = {
            'masehi': formatMasehi(masehiDate),
            'hijriyah': formatHijriyah(hijriDate),
          };
          panel.webview.postMessage({ command: 'showDates', dates });

          startAdzanWatcher();
          prayerWatcher();
        } else {
          panel.webview.postMessage({ command: 'showCities', cities: await loadAllCities(dataPath) });
        }
        break;
      }
    }
  });
  return panel;
}

function checkNearestPrayer() {
  const now = new Date();
  let nearestPrayer = '';
  let nearestDiff = Infinity;
  let diffMinutes = 0;
  for (const [key, time] of Object.entries(imsakiyah)) {
    if (!time) continue;
    // @ts-ignore
    const [h, m] = time.split(':').map(Number);

    const waktu = new Date(now);
    waktu.setHours(h, m, 0, 0);
    const diff = waktu.getTime() - now.getTime(); // waktu shalat - waktu sekarang
    if (diff >= 0 && diff < nearestDiff) {
      nearestDiff = diff;
      nearestPrayer = key;
    }
  }

  if (nearestPrayer) {
    diffMinutes = Math.round(nearestDiff / 60);
  }

  return {
    diff: diffMinutes,
    prayer: nearestPrayer,
  }
}

function startAdzanWatcher() {
  const config = vscode.workspace.getConfiguration('kalenderqu_adzan');
  const playSound = config.get<boolean>('playSound') ?? true;
  const { diff, prayer } = checkNearestPrayer();
  console.log('diff', diff);
  if (diff > 0 && diff <= 1500) {
    if (notificationTimer) clearInterval(notificationTimer);
    notificationTimer = setInterval(() => {
      console.log('startAdzanWatcher');
      const now = new Date();
      const time = imsakiyah[prayer];
      const [h, m] = time.split(':').map(Number);
      const waktu = new Date(now);
      waktu.setHours(h, m, 0, 0);
      const selisih = waktu.getTime() - now.getTime(); // dalam milidetik

      if (selisih >= 0 && selisih <= 5000) {
        vscode.window.showInformationMessage(
            `🕋 Waktu ${capitalize(prayer)} telah tiba. Hentikan sementara aktivitas duniawi Anda.`
        );
        if (playSound && mainPanel) {
          mainPanel.webview.postMessage({ command: 'playAdzan' });
        }
        if (notificationTimer) clearInterval(notificationTimer);
      }
    }, 1000);
  }
}

function prayerWatcher() {
  if (prayerTimer) clearInterval(prayerTimer);
  prayerTimer = setInterval(() => {
    console.log('prayerWatcher');
    startAdzanWatcher();
  }, 60000); // cek setiap 1 menit
}

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('kalenderqu_adzan');
  savedLat = config.get<number>('lat') ?? 0;
  savedLon = config.get<number>('lon') ?? 0;
  savedTz = config.get<number>('tz') ?? 7;
  const city = config.get<string>('city') || '';
  savedHisab = config.get<string>('hisab') || 'umum';

  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;
  const day = new Date().getDate();

  islam.Hisab(year);
  imsakiyah = islam.Imsakiyah(year, month, day, savedLat, savedLon, savedTz, savedHisab);

  mainPanel = createMainPanel(context);

  startAdzanWatcher();
  prayerWatcher();

  vscode.window.showInformationMessage(`🕌 Notifikasi adzan aktif untuk wilayah ${city}`);

  const disposable = vscode.commands.registerCommand('kalenderqu.openCitySelector', () => {
    createMainPanel(context);
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
