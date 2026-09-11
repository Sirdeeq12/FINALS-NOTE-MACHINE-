'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AggregatedTrade, formatPrice, formatUnits, formatAsTSV } from '@/lib/excelUtils';

interface ContractNoteTableProps {
  trades: AggregatedTrade[];
  clientName: string;
  accountNumber: string;
}

export function ContractNoteTable({ trades, clientName, accountNumber }: ContractNoteTableProps) {
  const [copied, setCopied] = useState<'table' | 'title' | null>(null);

  const handleCopyToExcel = async (includeTitle: boolean) => {
    const tsv = formatAsTSV(trades, clientName, accountNumber, includeTitle);
    try {
      await navigator.clipboard.writeText(tsv);
      setCopied(includeTitle ? 'title' : 'table');
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (trades.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-8 bg-white rounded-lg border border-dashed border-gray-300">
        <p className="text-center text-gray-500 text-sm">
          Upload an Excel file and configure filters to generate a contract note
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Title and Copy Buttons */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h2 className="text-center text-lg font-bold text-gray-900 mb-4">
          {clientName} - {accountNumber}
        </h2>

        <div className="flex gap-2 mb-4">
          <Button
            onClick={() => handleCopyToExcel(false)}
            variant="outline"
            className="flex-1 text-sm"
            title="Copy table as TSV (without title)"
          >
            {copied === 'table' ? '✓ Copied!' : 'Copy to Excel'}
          </Button>
          <Button
            onClick={() => handleCopyToExcel(true)}
            variant="outline"
            className="flex-1 text-sm"
            title="Copy with title and blank line, then TSV"
          >
            {copied === 'title' ? '✓ Copied!' : 'Copy with Title'}
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Paste into Excel for proper column alignment
        </p>
      </div>

      {/* Contract Note Table */}
      <div className="bg-white rounded-lg border-2 border-dashed border-primary overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-300">
                <th className="border border-gray-400 px-4 py-2 text-left font-bold text-sm text-gray-900">
                  TYPE
                </th>
                <th className="border border-gray-400 px-4 py-2 text-right font-bold text-sm text-gray-900">
                  PRICE
                </th>
                <th className="border border-gray-400 px-4 py-2 text-right font-bold text-sm text-gray-900">
                  UNITS
                </th>
                <th className="border border-gray-400 px-4 py-2 text-left font-bold text-sm text-gray-900">
                  SECURITY
                </th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                    {trade.type}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right font-mono">
                    {formatPrice(trade.price)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right font-mono">
                    {formatUnits(trade.units)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                    {trade.security}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
