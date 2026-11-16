import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireGate } from './gate-middleware';
const input=(data:unknown)=>z.object({ticker:z.string().trim().toUpperCase().regex(/^[A-Z.\-]{1,10}$/)}).parse(data);
export const getByobModel=createServerFn({method:'POST'}).middleware([requireGate]).inputValidator(input).handler(async({data})=>{
  const {getByob}=await import('./byob.server');return getByob(data.ticker);
});
export const trainByobModel=createServerFn({method:'POST'}).middleware([requireGate]).inputValidator(input).handler(async({data})=>{
  const {gateConfigured}=await import('./gate.server');
  if(!gateConfigured()) throw new Error('Configure the app passcode before starting research from the browser.');
  const {prepareByob,trainByob}=await import('./byob.server');
  try{await prepareByob('SPY');await prepareByob(data.ticker);}catch{throw new Error('Historical market data is unavailable. Existing research remains unchanged.');}
  return trainByob(data.ticker);
});