import React, { useMemo, useState } from 'react';
import type { PriceList } from '../types';
import { Supplier } from '../types';
import { ChartBarIcon } from './Icons';
import { formatNumberWithCommas } from '../utils/formatting';

interface Magic7PriceMonitorProps {
  prices: PriceList;
}

interface SeriesPriceInfo {
    totals: Record<string, number>;
    prices: Record<string, Record<string, number>>;
    min: number;
    best: string;
}

interface SeriesData {
    ha: SeriesPriceInfo;
    pcw: SeriesPriceInfo;
}

interface Profile {
  haName: string;
  pcwName: string;
  isSdType: boolean;
  displayName: string;
}

const suppliers = Object.values(Supplier).filter(s => s !== Supplier.Best);
const windowSeriesList = ['798', 'TR'];

const MAGIC_PROFILES_TR: Profile[] = [
  { haName: 'Double Head', pcwName: 'Double Head', isSdType: false, displayName: 'Double Head' },
  { haName: 'Double Sill', pcwName: 'Double Sill', isSdType: false, displayName: 'Double Sill' },
  { haName: 'Double Jamb', pcwName: 'Double Jamb', isSdType: false, displayName: 'Double Jamb' },
  { haName: 'Top Rail', pcwName: 'Top Rail', isSdType: true, displayName: 'Top Rail' },
  { haName: 'Bottom Rail', pcwName: 'Bottom Rail', isSdType: true, displayName: 'Bottom Rail' },
  { haName: 'Lock Stile', pcwName: 'Lockstile', isSdType: true, displayName: 'Lock Stile / Lockstile' },
  { haName: 'Interlocker', pcwName: 'Interlocker', isSdType: true, displayName: 'Interlocker' },
];

const MAGIC_PROFILES_798: Profile[] = [
  { haName: 'Double Head', pcwName: 'Double Head', isSdType: false, displayName: 'Double Head' },
  { haName: 'Double Sill', pcwName: 'Double Sill', isSdType: false, displayName: 'Double Sill' },
  { haName: 'Double Jamb', pcwName: 'Double Jamb', isSdType: false, displayName: 'Double Jamb' },
  { haName: 'Bottom Rail/Top Rail', pcwName: 'Bottom Rail/Top Rail', isSdType: true, displayName: 'Bottom Rail/Top Rail' },
  { haName: 'Lock Stile', pcwName: 'Lockstile', isSdType: true, displayName: 'Lock Stile / Lockstile' },
  { haName: 'Interlocker', pcwName: 'Interlocker', isSdType: true, displayName: 'Interlocker' },
];

export const Magic7PriceMonitor: React.FC<Magic7PriceMonitorProps> = ({ prices }) => {
  const [isOpen, setIsOpen] = useState(false);

  const priceData = useMemo(() => {
    const dataBySeries: Record<string, SeriesData> = {};

    windowSeriesList.forEach(windowSeries => {
        const profiles = windowSeries === '798' ? MAGIC_PROFILES_798 : MAGIC_PROFILES_TR;

        const seriesData: SeriesData = {
          ha: { totals: {} as Record<string, number>, prices: {} as Record<string, Record<string, number>>, min: Infinity, best: '' },
          pcw: { totals: {} as Record<string, number>, prices: {} as Record<string, Record<string, number>>, min: Infinity, best: '' },
        };

        suppliers.forEach(supplier => {
          let haTotal = 0;
          let pcwTotal = 0;

          profiles.forEach(profile => {
            // HA Price
            const haProfileName = `${windowSeries}- ${profile.haName}${profile.isSdType ? ' SD' : ''} (HA)`;
            const haPrice = prices[haProfileName]?.[supplier] ?? 0;
            haTotal += haPrice;
            if (!seriesData.ha.prices[profile.displayName]) seriesData.ha.prices[profile.displayName] = {};
            seriesData.ha.prices[profile.displayName][supplier] = haPrice;

            // PCW Price
            const pcwProfileName = `${windowSeries}- ${profile.pcwName} (PCW)`;
            const pcwPrice = prices[pcwProfileName]?.[supplier] ?? 0;
            pcwTotal += pcwPrice;
            if (!seriesData.pcw.prices[profile.displayName]) seriesData.pcw.prices[profile.displayName] = {};
            seriesData.pcw.prices[profile.displayName][supplier] = pcwPrice;
          });

          seriesData.ha.totals[supplier] = haTotal;
          if (haTotal > 0 && haTotal < seriesData.ha.min) {
            seriesData.ha.min = haTotal;
            seriesData.ha.best = supplier;
          }

          seriesData.pcw.totals[supplier] = pcwTotal;
          if (pcwTotal > 0 && pcwTotal < seriesData.pcw.min) {
            seriesData.pcw.min = pcwTotal;
            seriesData.pcw.best = supplier;
          }
        });
        dataBySeries[windowSeries] = seriesData;
    });

    return dataBySeries;
  }, [prices]);

  const PriceTable = ({ title, data, bestSupplier, profiles }: { title: string, data: { totals: Record<string, number>, prices: Record<string, Record<string, number>> }, bestSupplier: string, profiles: Profile[] }) => (
    <div className="mb-6 last:mb-0">
      <h4 className="text-md font-semibold text-sky-300 mb-3">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-sm font-medium text-slate-400 border-b border-slate-600 uppercase tracking-wider sticky left-0 bg-slate-700/80 backdrop-blur-sm">Profile</th>
              {suppliers.map(s => (
                <th key={s} className={`p-2 text-sm font-medium text-slate-400 border-b border-slate-600 uppercase tracking-wider text-center ${s === bestSupplier ? 'bg-green-900/50' : ''}`}>{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profiles.map(profile => (
              <tr key={profile.displayName} className="hover:bg-slate-600/30 transition-colors">
                <td className="p-2 text-sm text-slate-300 border-b border-slate-700 font-medium sticky left-0 bg-slate-700/80 backdrop-blur-sm">{profile.displayName}</td>
                {suppliers.map(supplier => (
                  <td key={supplier} className={`p-2 text-sm text-slate-300 border-b border-slate-700 font-mono text-center ${supplier === bestSupplier ? 'bg-green-900/30' : ''}`}>
                    {data.prices[profile.displayName]?.[supplier] > 0 ? `₱${formatNumberWithCommas(data.prices[profile.displayName][supplier])}` : <span className="text-slate-500">-</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold bg-slate-900/50">
              <td className="p-3 text-sm text-sky-400 border-t-2 border-slate-600 uppercase tracking-wider sticky left-0 bg-slate-900/80 backdrop-blur-sm">Total per Set</td>
              {suppliers.map(supplier => (
                <td key={supplier} className={`p-3 text-sm text-white border-t-2 border-slate-600 text-center font-mono ${supplier === bestSupplier ? 'bg-green-900/50 text-green-300' : ''}`}>
                  ₱{formatNumberWithCommas(data.totals[supplier])}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <ChartBarIcon className="h-6 w-6 text-sky-400" />
          <h3 className="text-xl font-semibold text-white">MAGIC 7 Price Monitor</h3>
        </div>
        <svg
          className={`h-6 w-6 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-6 pb-6 pt-0">
          <div className="border-t border-slate-700 pt-6">
            <p className="text-sm text-slate-400 mb-6 max-w-2xl">
              This panel shows the total cost for one set of the core aluminum profiles from each supplier for both 798 and TR series. The lowest total price for each color finish is highlighted in green.
            </p>
            {Object.entries(priceData).map(([series, seriesData]: [string, SeriesData]) => {
                const profiles = series === '798' ? MAGIC_PROFILES_798 : MAGIC_PROFILES_TR;
                return (
                    <div key={series} className="mb-8 border border-slate-700 rounded-lg p-4 last:mb-0">
                        <h3 className="text-2xl font-bold text-white mb-4 text-center">{series} Series</h3>
                        <PriceTable title="Anodized (HA) Set" data={seriesData.ha} bestSupplier={seriesData.ha.best} profiles={profiles} />
                        <PriceTable title="Powder Coated White (PCW) Set" data={seriesData.pcw} bestSupplier={seriesData.pcw.best} profiles={profiles} />
                    </div>
                );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
