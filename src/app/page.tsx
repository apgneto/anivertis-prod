'use client';

import React, { useState, useEffect, useMemo, memo } from 'react';
import {
  Newspaper, RefreshCw, ExternalLink, TrendingUp, Sparkles, Loader2,
  BarChart3, Target, X, ArrowRightCircle
} from 'lucide-react';
import { TabType } from '../types';

// REGRA IMUTÁVEL: Temas fixos definidos para a aplicação
const TEMAS_OBRIGATORIOS = [
  'RECICLAGEM ANIMAL', 'MILHO', 'SOJA', 'BOVINOCULTURA', 'ECONOMIA', 
  'SUINOCULTURA', 'AVICULTURA', 'BIODIESEL', 'RACOES_PET', 'PISCICULTURA'
];

const CATEGORY_ICONS: Record<string, string> = {
  'RECICLAGEM ANIMAL': '🔄', 'MILHO': '🌽', 'SOJA': '🌱',
  'BOVINOCULTURA': '🐂', 'ECONOMIA': '💲', 'SUINOCULTURA': '🐖',
  'AVICULTURA': '🐔', 'BIODIESEL': '⛽', 'RACOES_PET': '🐕', 
  'PISCICULTURA': '🐟', 'GERAL': '📰'
};

const ensureHttps = (url: string) => {
  if (!url || url === "#") return "#";
  return url.startsWith('http') ? url : (url.startsWith('//') ? `https:${url}` : `https://${url}`);
};

// --- MODAL DE LEITURA ---
const ClippingModal: React.FC<{ item: any; onClose: () => void }> = memo(({ item, onClose }) => {
  if (!item) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-8 border-b flex justify-between items-center bg-slate-50">
          <div>
            <span className="text-xs font-black text-green-700 uppercase bg-green-50 px-3 py-1 rounded-lg mb-3 inline-block">{item.category} | {item.source}</span>
            <h2 className="text-2xl font-black text-slate-900">{item.title}</h2>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-2xl transition-all"><X className="w-6 h-6"/></button>
        </div>
        <div className="p-10 overflow-y-auto whitespace-pre-wrap text-slate-600 font-medium leading-relaxed text-lg">
          {item.content || "Sem conteúdo textual extraído."}
        </div>
        <div className="p-6 border-t bg-slate-50 flex justify-end">
           <a href={ensureHttps(item.url)} target="_blank" rel="noopener noreferrer" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-2 hover:bg-slate-800 transition-colors">
             Acessar Site Original <ExternalLink className="w-4 h-4"/>
           </a>
        </div>
      </div>
    </div>
  );
});

// --- CLIPPING CARD ---
const ClippingCard: React.FC<{ item: any, onClick: () => void }> = memo(({ item, onClick }) => (
  <div onClick={onClick} className="cursor-pointer bg-white rounded-[32px] border border-slate-200/60 shadow-sm p-6 hover:shadow-xl transition-all h-full flex flex-col group border-b-4 hover:border-b-green-500">
    <div className="flex justify-between items-start mb-4">
      <span className="bg-slate-50 text-slate-500 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
        {CATEGORY_ICONS[item.category] || '📰'} {item.category}
      </span>
      <span className="text-[10px] text-slate-400 font-bold">{item.timestamp ? new Date(item.timestamp).toLocaleDateString('pt-BR') : 'Hoje'}</span>
    </div>
    <h3 className="text-base font-black text-slate-900 mb-3 leading-tight line-clamp-3 group-hover:text-green-700 transition-colors">{item.title}</h3>
    <p className="text-xs text-slate-500 mb-6 line-clamp-3 flex-1 font-medium">{item.summary}</p>
    <div className="pt-5 border-t flex justify-between items-center">
      <span className="text-[10px] font-black text-slate-400 uppercase truncate max-w-[140px]">{item.source}</span>
      <span className="text-[10px] font-black text-green-600 flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-lg group-hover:bg-green-100 transition-colors">Ler Notícia <ArrowRightCircle className="w-3.5 h-3.5"/></span>
    </div>
  </div>
));

// --- APP PRINCIPAL ---
const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [news, setNews] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<string>('');
  const [clippingFilter, setClippingFilter] = useState<string>('TODOS');
  const [selectedClipping, setSelectedClipping] = useState<any | null>(null);

  useEffect(() => { handleFetch(); }, []);

  const handleFetch = async () => {
    setIsRefreshing(true);
    setRefreshStatus('🚀 Lendo o Banco de Dados...');

    try {
      const response = await fetch('/api/dados?limit=300');
      const resultado = await response.json();

      if (resultado.success && resultado.dados && resultado.dados.length > 0) {
        
        // FILTRO ESTRITO: Apenas fontes classificadas como Layer 3 (Mídia)
        const noticiasReais = resultado.dados.filter((n: any) => Number(n.layer) === 3);

        setNews(noticiasReais.map((n: any) => {
          let safeContent = (n.content || '').trim();
          const isTrash = /var\s+|function\s*\(|if\s*\(|<iframe/.test(safeContent);
          
          return {
            id: n.id,
            title: n.title || 'Sem Título',
            summary: isTrash ? 'Falha na extração. Clique em "Ler Notícia" para acessar o original.' : safeContent.substring(0, 150) + '...',
            content: isTrash ? 'O sistema detectou uma falha na extração desta matéria. Por favor, acesse o site original.' : safeContent,
            url: n.url,
            category: (n.theme || 'GERAL').toUpperCase(),
            source: n.source_name,
            timestamp: n.published_at || n.collected_at
          };
        }));
        setRefreshStatus(`✅ ${noticiasReais.length} matérias de mídia carregadas.`);
      } else {
        setRefreshStatus('⚠️ Banco de dados retornou vazio.');
      }
    } catch (error: any) {
      setRefreshStatus(`❌ Falha: ${error.message}`);
    }
    setIsRefreshing(false);
  };

  const filteredClipping = useMemo(() =>
    clippingFilter === 'TODOS' ? news : news.filter(item => item.category === clippingFilter),
  [news, clippingFilter]);

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-800 pb-32">
      <header className="bg-white/80 backdrop-blur-xl border-b sticky top-0 z-[50]">
        <div className="px-10 h-24 flex items-center justify-between max-w-[1800px] mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 rounded-[18px] flex items-center justify-center"><TrendingUp className="text-white w-7 h-7" /></div>
            <div><h1 className="text-2xl font-black uppercase">Anivertis</h1><span className="text-[10px] font-black text-green-600 tracking-[0.3em] block">Intelligence Suite V51</span></div>
          </div>
          <nav className="flex bg-slate-100/50 rounded-[24px] p-2 gap-1.5 border">
            {[{ id: 'feed', label: 'Clipping', icon: Newspaper }, { id: 'predictor', label: 'Predictor', icon: Target }, { id: 'discovery', label: 'Briefings', icon: Sparkles }, { id: 'bi', label: 'BI Market', icon: BarChart3 }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`px-8 py-3.5 rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}><tab.icon className="w-4.5 h-4.5" /> {tab.label}</button>
            ))}
          </nav>
          <button onClick={handleFetch} disabled={isRefreshing} className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-[20px] font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-3">
            {isRefreshing ? <Loader2 className="animate-spin w-5 h-5" /> : <RefreshCw className="w-5 h-5" />} Atualizar Intel
          </button>
        </div>
      </header>
      {isRefreshing && <div className="bg-slate-900 text-white text-[10px] font-black uppercase py-4 text-center animate-pulse">{refreshStatus}</div>}
      <main className="p-10 max-w-[1700px] mx-auto">
        {activeTab === 'feed' && (
          <div className="space-y-10">
            {/* BOTÕES DE TEMAS RESTAURADOS E IMUTÁVEIS */}
            <div className="flex gap-3 overflow-x-auto pb-6">
              <button onClick={() => setClippingFilter('TODOS')} className={`px-8 py-3.5 rounded-full text-[10px] font-black uppercase ${clippingFilter === 'TODOS' ? 'bg-slate-900 text-white' : 'bg-white shadow-sm'}`}>Todos</button>
              {TEMAS_OBRIGATORIOS.map((cat) => (
                <button key={cat} onClick={() => setClippingFilter(cat)} className={`px-8 py-3.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap shadow-sm ${clippingFilter === cat ? 'bg-green-600 text-white' : 'bg-white hover:bg-slate-50'}`}>
                  {CATEGORY_ICONS[cat] || ''} {cat}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredClipping.length > 0 ? filteredClipping.map(item => <ClippingCard key={item.id} item={item} onClick={() => setSelectedClipping(item)} />) : <div className="col-span-full text-center py-20 text-slate-400 font-bold uppercase tracking-widest">Nenhuma notícia encontrada para este filtro.</div>}
            </div>
          </div>
        )}
      </main>
      {selectedClipping && <ClippingModal item={selectedClipping} onClose={() => setSelectedClipping(null)} />}
    </div>
  );
};

export default App;