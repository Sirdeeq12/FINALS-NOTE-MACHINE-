'use client';

import { useState } from 'react';
import { ControlsPanel } from '@/components/ControlsPanel';
import { ContractNoteTable } from '@/components/ContractNoteTable';
import {
    ParsedExcelData,
    AggregatedTrade,
    aggregateBySecurityVWAP,
    aggregateBySecurityAndPrice,
    filterByAccount,
    filterByType,
  } from '@/lib/excelUtils';

export default function Page() {
  const [data, setData] = useState<ParsedExcelData | null>(null);
  const [accountFilter, setAccountFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'BUY' | 'SELL'>('BUY');
  const [aggregationMode, setAggregationMode] = useState<'vwap' | 'price'>('vwap');
  const [aggregatedTrades, setAggregatedTrades] = useState<AggregatedTrade[]>([]);
  const [clientNameInput, setClientNameInput] = useState('');
  const [clientName, setClientName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const handleDataLoaded = (newData: ParsedExcelData) => {
    setData(newData);
    
    // Extract unique accounts and set the first one or a default
    const uniqueAccounts = [...new Set(newData.trades.map(t => t.accountNumber))];
    if (uniqueAccounts.length > 0) {
      setAccountNumber(uniqueAccounts[0]);
    }
    
    updateAggregation(newData.trades, aggregationMode, accountFilter, typeFilter);
  };

  const handleClientNameChange = (name: string) => {
    setClientNameInput(name);
    setClientName(name);
  };

  const handleAccountChange = (account: string) => {
    setAccountFilter(account);
    setAccountNumber(account);
    if (data) {
      updateAggregation(data.trades, aggregationMode, account, typeFilter);
    }
  };

  const handleTypeChange = (type: 'ALL' | 'BUY' | 'SELL') => {
    setTypeFilter(type);
    if (data) {
      updateAggregation(data.trades, aggregationMode, accountFilter, type);
    }
  };

  const handleAggregationChange = (mode: 'vwap' | 'price') => {
    setAggregationMode(mode);
    if (data) {
      updateAggregation(data.trades, mode, accountFilter, typeFilter);
    }
  };

  const updateAggregation = (trades: any[], mode: 'vwap' | 'price', account: string, type: 'ALL' | 'BUY' | 'SELL') => {
    let filtered = trades;

    // Apply account filter if specified
    if (account.trim()) {
      filtered = filterByAccount(filtered, account);
    }

    // Apply trade type filter
    filtered = filterByType(filtered, type);

    // Apply aggregation
    const aggregated =
      mode === 'vwap' ? aggregateBySecurityVWAP(filtered) : aggregateBySecurityAndPrice(filtered);

    setAggregatedTrades(aggregated);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header with CSL Logo */}
      <div className="bg-primary text-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Finalsnote Machine</h1>
        <img 
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/csl%20logo-NYc124qNJqieQY0e3JARZUTH2LZSDL.png" 
          alt="CSL Logo" 
          className="h-12"
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left Panel: Controls */}
        <div className="w-80 overflow-y-auto min-h-0">
          <ControlsPanel
            onDataLoaded={handleDataLoaded}
            onClientNameChange={handleClientNameChange}
            onAccountChange={handleAccountChange}
            onTypeChange={handleTypeChange}
            onAggregationChange={handleAggregationChange}
            clientNameValue={clientNameInput}
            accountValue={accountFilter}
            typeValue={typeFilter}
            aggregationMode={aggregationMode}
          />
        </div>

        {/* Right Panel: Preview */}
        <div className="flex-1 overflow-hidden p-8 min-h-0">
          <div className="h-full overflow-y-auto">
            <ContractNoteTable
              trades={aggregatedTrades}
              clientName={clientName}
              accountNumber={accountNumber}
            />
          </div>
        </div>
      </div>

      {/* Footer with Signature */}
      <div className="bg-primary text-white px-6 py-3 text-right border-t-2 border-accent">
        <p className="text-sm font-semibold">Sirdeeq--</p>
      </div>
    </div>
  );
}
