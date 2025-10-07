import * as vscode from "vscode";
import { PrayerTimes } from "./prayerTimes";

export function startAdzanNotifier(prayerTimes: PrayerTimes) {
    const checkInterval = 30 * 1000; // setiap 30 detik
    const notified: Record<string, boolean> = {};
    // const testTime = new Date(Date.now() + 60 * 1000); // 1 menit dari sekarang
    setInterval(() => {
        const now = new Date();
        const nowTime = now.toTimeString().slice(0, 5); // HH:MM

        for (const [name, time] of Object.entries(prayerTimes)) {
            if (!notified[name] && nowTime === time.slice(0, 5)) {
                vscode.window.showInformationMessage(`🕌 Waktu ${name.toUpperCase()} telah tiba`);
                notified[name] = true;
            }
        }
    }, checkInterval);
}
