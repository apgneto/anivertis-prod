export enum NewsStatus { PENDING = 'pending', APPROVED = 'approved', REJECTED = 'rejected' }

export enum Category {
  RECICLAGEM = 'Reciclagem',
  MILHO = 'Milho',
  SOJA = 'Soja',
  BOVINOCULTURA = 'Bovinocultura',
  ECONOMIA = 'Economia & Macro',
  SUINOCULTURA = 'Suinocultura',
  AVICULTURA = 'Avicultura',
  BIODIESEL = 'Biodiesel',
  RACOES_PET = 'Rações Pet',
  PISCICULTURA = 'Piscicultura'
}

export enum Sentiment { BULLISH = 'bullish', BEARISH = 'bearish', NEUTRAL = 'neutral' }

export enum RiskType {
  SANITARY = 'SANITARY',
  REGULATORY = 'REGULATORY',
  MARKET = 'MARKET'
}

export interface MarketData {
  product: string;
  price: string;
  currency: string;
  unit: string;
  region: 'BR' | 'USA' | 'WORLD'; 
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface SanitaryRisk {
  classificationType: 'SANITARIO' | 'NAO_CONFIRMADO';
  diseaseName: string | null;
  epidemicLevel: 'FOCO_ISOLADO' | 'SURTO_LOCAL' | 'EPIDEMIA_REGIONAL' | 'PANZOOTIA' | null;
  geographicScope: string | null;
  affectedUnits: number | null;
  leadTimeDays: number | null;
  impactMagnitude: string | null;
  historicalValidation: string | null;
  officialSource: string | null; 
  confidenceScore: number; 
  affectedRenderingProducts: string[];
}

export interface NewsItem {
  id: string;
  clusterId?: string;
  theme: string;
  title: string;
  summary: string;
  source: string;
  sources?: any[];
  url: string;
  category: Category;
  timestamp: number;
  status: NewsStatus;
  imageUrl: string;
  marketData?: MarketData | null;
  sentiment?: Sentiment;
  riskType?: RiskType; 
  sanitaryRisk?: SanitaryRisk;
  qualityScore?: number;
  impactScore?: number;
  significanceNote?: string;
  impact?: string;
}

export interface PredictionFactor {
  name: string;
  value: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  description: string;
  source: string;
}

export interface DiscoveryReport {
  id: string;
  category: Category;
  title: string;
  content: string;
  whatsappText: string;
  trends: string[];
  timestamp: number;
  predictionScore?: number;
  baseScore?: number;
  predictionLabel?: string;
  predictionJustification?: string;
  sanitaryAdjustment?: number;
  leadTimeDays?: number;
  activeSanitaryRisks?: SanitaryRisk[];
  supplyFactors?: PredictionFactor[];
  demandFactors?: PredictionFactor[];
  substitutesFactors?: PredictionFactor[];
  macroFactors?: PredictionFactor[];
  context?: string;
  sources?: {name: string, url: string}[];
}

export type TabType = 'predictor' | 'discovery' | 'bi' | 'feed';