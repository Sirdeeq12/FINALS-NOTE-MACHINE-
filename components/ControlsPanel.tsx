'use client';

import { ChangeEvent, DragEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { parseExcelFile, ParsedExcelData } from '@/lib/excelUtils';

interface ControlsPanelProps {
  onDataLoaded: (data: ParsedExcelData) => void;
  onClientNameChange: (name: string) => void;
  onAccountChange: (account: string) => void;
  onTypeChange: (type: 'ALL' | 'BUY' | 'SELL') => void;
  onAggregationChange: (mode: 'vwap' | 'price') => void;
  clientNameValue: string;
  accountValue: string;
  typeValue: 'ALL' | 'BUY' | 'SELL';
  aggregationMode: 'vwap' | 'price';
}

export function ControlsPanel({
  onDataLoaded,
  onClientNameChange,
  onAccountChange,
  onTypeChange,
  onAggregationChange,
  clientNameValue,
  accountValue,
  typeValue,
  aggregationMode,
}: ControlsPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const data = await parseExcelFile(file);
      onDataLoaded(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-white border-r-4 border-primary overflow-y-auto">
      <h1 className="text-2xl font-bold text-primary">Upload Excel</h1>

      {/* File Upload */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Step 1: Upload Excel File</h2>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-primary bg-purple-50' : 'border-gray-300 bg-gray-50'
          } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileInput}
            disabled={loading}
            className="hidden"
            id="file-input"
          />
          <label htmlFor="file-input" className="block cursor-pointer">
            <p className="text-sm font-medium text-gray-700">
              {loading ? 'Processing...' : 'Drag & drop your Excel file here'}
            </p>
            <p className="text-xs text-gray-500 mt-1">or click to browse</p>
          </label>
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>

      {/* Client Name Input */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Step 2: Client Name</h2>
        <input
          type="text"
          placeholder="Enter client name..."
          value={clientNameValue}
          onChange={(e) => onClientNameChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-gray-500 mt-1">e.g., sodiq</p>
      </div>

      {/* Account Filter */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Step 3: Filter by Buy Account (Optional)</h2>
        <input
          type="text"
          placeholder="Enter account number..."
          value={accountValue}
          onChange={(e) => onAccountChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-gray-500 mt-1">Leave blank to show all trades</p>
      </div>

      {/* Trade Type Filter */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Step 4: Trade Type</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => onTypeChange('BUY')}
            variant={typeValue === 'BUY' ? 'default' : 'outline'}
            className="flex-1 text-sm"
          >
            Buy
          </Button>
          <Button
            onClick={() => onTypeChange('SELL')}
            variant={typeValue === 'SELL' ? 'default' : 'outline'}
            className="flex-1 text-sm"
          >
            Sell
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Select the trade type to display</p>
      </div>

      {/* Aggregation Mode */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Step 5: Aggregation Mode</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => onAggregationChange('vwap')}
            variant={aggregationMode === 'vwap' ? 'default' : 'outline'}
            className="flex-1 text-sm"
          >
            Average Price
          </Button>
          <Button
            onClick={() => onAggregationChange('price')}
            variant={aggregationMode === 'price' ? 'default' : 'outline'}
            className="flex-1 text-sm"
          >
            Price by Price
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {aggregationMode === 'vwap'
            ? 'Shows volume-weighted average price per security'
            : 'Shows each price level per security'}
        </p>
      </div>

      <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
        <p className="font-semibold text-gray-700 mb-1">Expected Columns:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Type (BUY/SELL)</li>
          <li>Price</li>
          <li>Units/Qty</li>
          <li>Security</li>
          <li>Client Name</li>
          <li>Account Number</li>
        </ul>
      </div>
    </div>
  );
}
