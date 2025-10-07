export interface PrayerTimes {
  imsak: string;
  subuh: string;
  terbit: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
}

export class PrayerTimeCalculator {
  constructor(
    private latitude: number,
    private longitude: number,
    private timezone: number
  ) {}

  // Perhitungan jadwal shalat sederhana (menggunakan rumus umum)
  getTodayTimes() {
    const date = new Date();
    const times: Record<string, string> = {};

    console.log('latitude', this.latitude);
    console.log('longitude', this.longitude);
    console.log('timezone', this.timezone);

    // Konversi ke UTC
    const dayOfYear = this.getDayOfYear(date);
    const lngHour = this.longitude / 15;

    // Fungsi bantu untuk menghitung waktu matahari (untuk Subuh, Terbit, Maghrib, dll)
    const calcTime = (angle: number, isSunrise: boolean): string => {
      const t = isSunrise ? dayOfYear + ((6 - lngHour) / 24) : dayOfYear + ((18 - lngHour) / 24);
      const M = (0.9856 * t) - 3.289;
      const L = M + (1.916 * Math.sin(this.deg2rad(M))) + (0.020 * Math.sin(this.deg2rad(2 * M))) + 282.634;
      const Lnorm = (L + 360) % 360;
      const RA = (this.rad2deg(Math.atan(0.91764 * Math.tan(this.deg2rad(Lnorm))))) % 360;
      const Lquadrant  = Math.floor(Lnorm/90) * 90;
      const RAquadrant = Math.floor(RA/90) * 90;
      const RAnorm = (RA + (Lquadrant - RAquadrant)) / 15;

      const sinDec = 0.39782 * Math.sin(this.deg2rad(Lnorm));
      const cosDec = Math.cos(Math.asin(sinDec));
      const cosH = (Math.cos(this.deg2rad(angle)) - (sinDec * Math.sin(this.deg2rad(this.latitude)))) / (cosDec * Math.cos(this.deg2rad(this.latitude)));
      if (cosH > 1 || cosH < -1) return ''; // matahari tidak terbit/terbenam di lokasi ekstrem

      const H = isSunrise ? 360 - this.rad2deg(Math.acos(cosH)) : this.rad2deg(Math.acos(cosH));
      const Hhours = H / 15;

      const T = Hhours + RAnorm - (0.06571 * t) - 6.622;
      const UT = (T - lngHour) % 24;
      const localT = UT + this.timezone;
      return this.toTime(localT);
    };

    // Hitung waktu
    const terbit: string = calcTime(90.833, true);
    const maghrib: string = calcTime(90.833, false);

    // Jadwal standar (disesuaikan dengan rumus umum)
    times['Imsak'] = this.addMinutes(terbit, -10);
    times['Subuh'] = this.addMinutes(terbit, -6);
    times['Terbit'] = terbit;
    times['Dzuhur'] = this.toTime(12 + this.timezone - (this.longitude / 15)); // kira-kira tengah hari
    times['Ashar'] = this.addMinutes(times['Dzuhur'], 240);
    times['Maghrib'] = maghrib;
    times['Isya'] = this.addMinutes(maghrib, 90);

    return times;
  }

  private getDayOfYear(d: Date) {
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = (d as any) - (start as any);
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private deg2rad(deg: number) { return (deg * Math.PI) / 180; }
  private rad2deg(rad: number) { return (rad * 180) / Math.PI; }

  private toTime(hours: number): string {
    if (isNaN(hours)) return '—';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  private addMinutes(time: string, minutes: number): string {
    if (!time || time === '—') return '—';
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + minutes;
    const newH = Math.floor((total / 60) % 24);
    const newM = total % 60;
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
  }
}