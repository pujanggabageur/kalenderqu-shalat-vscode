import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import Islam from "./islam";
// import { PrayerTimeCalculator } from './prayerTimes';
// Buat instance class Islam
const islam = new Islam();
let notificationTimer: NodeJS.Timeout | null = null;
let soundPanel: vscode.WebviewPanel | null = null;

export function activate(context: vscode.ExtensionContext) {
  console.log('KalenderQu - Jadwal Shalat: aktif!');
  const year = new Date().getFullYear();
  islam.Hisab(year);
  
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

  startAdzanWatcher(context);

  const disposable = vscode.commands.registerCommand('kalenderqu.openCitySelector', () => {
    const panel = vscode.window.createWebviewPanel(
      'kalenderquCitySelector',
      'KalenderQu - Jadwal Shalat',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    const config = vscode.workspace.getConfiguration('kalenderqu_adzan');
    const currentCity = config.get<string>('city') || '';
    const dataPath = path.join(
      context.extensionPath,
      "media",
      "data",
      "indonesia"
    );
    panel.webview.html = getWebviewContent(context, currentCity);

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

          vscode.window.showInformationMessage(`Kota disimpan: ${selected.name}`);

          // const calc = new PrayerTimeCalculator(selected.lat, selected.lon, selected.tz);
          // const jadwal = calc.getTodayTimes();

          const year = new Date().getFullYear();
          const month = new Date().getMonth() + 1;
          const day = new Date().getDate()

          const imsakiyah = islam.Imsakiyah(year, month, day, selected.lat, selected.lon, selected.tz);
          panel.webview.postMessage({ command: 'showTimes', imsakiyah, city: selected.name });
          break;
        }

        case 'loadSavedCity': {
          const cityName = message.city;
          const lat = config.get<number>('lat');
          const lon = config.get<number>('lon');
          const tz = config.get<number>('tz');

          if (cityName && lat && lon && tz) {
            // const calc = new PrayerTimeCalculator(lat, lon, tz);
            // const jadwal = calc.getTodayTimes();
            const year = new Date().getFullYear();
            const month = new Date().getMonth() + 1;
            const day = new Date().getDate()

            const imsakiyah = islam.Imsakiyah(year, month, day, lat, lon, tz);
            panel.webview.postMessage({ command: 'showTimes', imsakiyah, city: cityName });

            const masehiDate = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ')[0];
            
            const hijriDate = islam.MasehiToHijri(year, month, day);
            const dates = {
              'masehi': formatMasehi(masehiDate),
              'hijriyah': formatHijriyah(hijriDate),
            };
            
            panel.webview.postMessage({ command: 'showDates', dates });
          } else {
            // Jika data tidak lengkap, tampilkan pemilihan kota
            panel.webview.postMessage({ command: 'showCities', cities: await loadAllCities(dataPath) });
          }
          break;
        }
      }
    });
  });

  context.subscriptions.push(disposable);
}

function capitalize(s: string) {
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

function startAdzanWatcher(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('kalenderqu_adzan');
  const lat = config.get<number>('lat');
  const lon = config.get<number>('lon');
  const tz = config.get<number>('tz') ?? 7;
  const city = config.get<string>('city') || '';
  const playSound = config.get<boolean>('playSound') ?? true;

  if (!lat || !lon) {
    console.log('❗ Belum ada kota tersimpan, notifikasi adzan tidak dijalankan.');
    return;
  }

  if (notificationTimer) clearInterval(notificationTimer);

  vscode.window.showInformationMessage(`🕌 Notifikasi adzan aktif untuk wilayah ${city}`);

  // buat panel tersembunyi untuk memutar audio
  soundPanel = vscode.window.createWebviewPanel(
    'kalenderquAdzanSound',
    'Adzan Player',
    { preserveFocus: true, viewColumn: vscode.ViewColumn.Two },
    { enableScripts: true }
  );
  soundPanel.webview.html = getAudioPlayerHTML(context, soundPanel.webview, playSound);

  notificationTimer = setInterval(() => {
    const now = new Date();
    
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const day = new Date().getDate()

    const imsakiyah = islam.Imsakiyah(year, month, day, lat, lon, tz);
    if (!imsakiyah) return;

    for (const [key, time] of Object.entries(imsakiyah)) {
      if (!time) continue;
      const [h, m] = time.split(':').map(Number);
      const waktu = new Date(now);
      waktu.setHours(h, m, 0, 0);

      const selisih = now.getTime() - waktu.getTime();

      // Jika dalam rentang 0–59 detik setelah masuk waktu
      if (selisih >= 0 && selisih < 60000) {
        vscode.window.showInformationMessage(`🕋 Waktu ${capitalize(key)} telah tiba. Hentikan sementara aktivitas duniawi Anda.`);
        
        if (playSound && soundPanel) {
          soundPanel.webview.postMessage({ command: 'playAdzan' });
        }
      }
    }
  }, 60000); // cek setiap 1 menit
}

function getAudioPlayerHTML(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
  playSound: boolean
): string {
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

function getWebviewContent(context: vscode.ExtensionContext, currentCity: string): string {
  const htmlPath = path.join(context.extensionPath, 'media', 'view', 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  // Sisipkan variabel dinamis (misalnya nama kota)
  html = html.replace(/\$\{currentCity\}/g, currentCity || '');
  return html;
}

export function deactivate() {}
