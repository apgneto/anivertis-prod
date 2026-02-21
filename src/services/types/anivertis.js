"use strict";
// types/anivertis.ts - V57_ULTRA_GRANULAR + SANITARYSHIELD
// ✅ CORRIGIDO - TODAS AS INTERFACES FALTANTES ADICIONADAS!
Object.defineProperty(exports, "__esModule", { value: true });
exports.NCM_MAPA_DETALHADO = exports.TEMAS_ESTRUTURAIS = exports.ONTOLOGIA_TEMAS_12 = void 0;
exports.ONTOLOGIA_TEMAS_12 = {
    soja: { nome: 'Soja', prioridade: 1 },
    milho: { nome: 'Milho', prioridade: 1 },
    boi: { nome: 'Boi', prioridade: 1 },
    aves_frango: { nome: 'Aves/Frango', prioridade: 2 },
    suinos: { nome: 'Suínos', prioridade: 2 },
    peixes: { nome: 'Peixes', prioridade: 3 },
    reciclagem_animal: { nome: 'Reciclagem Animal', prioridade: 1 },
    minerais: { nome: 'Minerais', prioridade: 2 },
    biodiesel: { nome: 'Biodiesel', prioridade: 1 },
    pet_food: { nome: 'Pet Food', prioridade: 3 },
    racao_producao: { nome: 'Ração Produção', prioridade: 2 },
    fertilizantes: { nome: 'Fertilizantes', prioridade: 2 },
    macroeconomia: { nome: 'Macroeconomia', prioridade: 3 }
};
exports.TEMAS_ESTRUTURAIS = [
    'soja',
    'milho',
    'boi',
    'aves_frango',
    'suinos',
    'peixes',
    'reciclagem_animal',
    'minerais',
    'biodiesel',
    'pet_food',
    'racao_producao',
    'fertilizantes',
    'macroeconomia'
];
// Mapeamento completo de NCMs por tema
exports.NCM_MAPA_DETALHADO = {
    soja: [
        { segmento: 'graos', descricao: 'Soja em grão', ncms: ['1201.90.00'], sources: ['CEPEA', 'B3_Futures', 'USDA_WASDE'] },
        { segmento: 'farelo', descricao: 'Farelo de soja 46-48%', ncms: ['2304.00.10', '2304.00.90'], sources: ['CEPEA', 'Abiove'] },
        { segmento: 'oleo_bruto', descricao: 'Óleo de soja bruto', ncms: ['1507.10.00'], sources: ['CEPEA', 'ANP'] },
        { segmento: 'oleo_refinado', descricao: 'Óleo refinado', ncms: ['1507.90.11'], sources: ['CEPEA', 'ABIOVE'] }
    ],
    milho: [
        { segmento: 'graos', descricao: 'Milho em grão', ncms: ['1005.90.10'], sources: ['CEPEA', 'B3_Futures', 'CONAB'] },
        { segmento: 'ddg_ddgs', descricao: 'DDG/DDGS (resíduo etanol)', ncms: ['2303.30.00'], sources: ['UNEM', 'Sindirações', 'USDA_Grain_Crush'] },
        { segmento: 'farelo_milho', descricao: 'Farelo de milho', ncms: ['2302.10.00'], sources: ['CEPEA', 'CONAB'] },
        { segmento: 'oleo_milho', descricao: 'Óleo de milho', ncms: ['1515.21.00'], sources: ['CEPEA'] },
        { segmento: 'etanol', descricao: 'Álcool etílico', ncms: ['2207.10.00', '2207.20.00'], sources: ['ANP', 'UNICA'] }
    ],
    reciclagem_animal: [
        { segmento: 'fco', descricao: 'Farinha de carne e ossos (FCO)', ncms: ['2301.10.10'], sources: ['ABRA', 'IBGE_Abate', 'Comex_Stat'] },
        { segmento: 'proteinas_aves', descricao: 'Farinha de vísceras de aves (Low Ash/Premium)', ncms: ['2301.10.10'], filter_keyword: 'vísceras|visceras|low ash', sources: ['ABRA', 'Sindirações'] },
        { segmento: 'penas_hidrolisadas', descricao: 'Farinha de penas', ncms: ['0505.90.00'], sources: ['ABRA'] },
        { segmento: 'proteinas_peixes', descricao: 'Fishmeal - Gold standard proteína', ncms: ['2301.20.10'], sources: ['ABRA', 'IFFO', 'Comex_Stat'] },
        { segmento: 'crustaceos_moluscos', descricao: 'Outras farinhas marinhas', ncms: ['2301.20.90'], sources: ['Comex_Stat'] },
        { segmento: 'sangue_basico', descricao: 'Farinha de sangue', ncms: ['0511.99.10'], sources: ['ABRA'] },
        { segmento: 'plasma_sanguineo', descricao: 'Plasma sanguíneo (Alta tecnologia)', ncms: ['3502.90.90'], shadow_price_weight: 4.5, sources: ['ABRA', 'Import_Stats'] },
        { segmento: 'hemoglobina_hemacias', descricao: 'Hemoglobina em pó', ncms: ['3504.00.90'], shadow_price_weight: 2.1, sources: ['ABRA'] },
        { segmento: 'hidrolisados_proteicos', descricao: 'Hidrolisados de proteínas', ncms: ['3504.00.19', '3504.00.11'], sources: ['ABRA', 'Sindirações'] },
        { segmento: 'sebo_bruto', descricao: 'Sebo bovino em bruto', ncms: ['1502.10.11'], sources: ['CEPEA', 'ABRA'] },
        { segmento: 'sebo_fundido', descricao: 'Sebo fundido (Premier Jus)', ncms: ['1502.10.12'], sources: ['CEPEA', 'ABRA'] },
        { segmento: 'oleo_aves', descricao: 'Óleo de aves', ncms: ['1501.90.00'], sources: ['CEPEA', 'ABRA'] },
        { segmento: 'oleo_peixes', descricao: 'Óleos de peixes', ncms: ['1504.20.00'], sources: ['ABRA', 'IFFO'] }
    ],
    boi: [
        { segmento: 'animais_vivos', descricao: 'Bovinos vivos para abate', ncms: ['0102.29.90'], sources: ['IBGE_PPM', 'MAPA'] },
        { segmento: 'carne_fresca', descricao: 'Carne bovina fresca desossada', ncms: ['0201.30.00'], sources: ['CEPEA', 'ABIEC'] },
        { segmento: 'carne_congelada', descricao: 'Carne bovina congelada desossada', ncms: ['0202.30.00'], sources: ['CEPEA', 'ABIEC', 'SECEX'] }
    ],
    aves_frango: [
        { segmento: 'pintos_dia', descricao: 'Pintos de um dia', ncms: ['0105.11.00'], sources: ['IBGE_PPM', 'ABPA'] },
        { segmento: 'aves_vivas', descricao: 'Aves vivas para abate', ncms: ['0105.94.00'], sources: ['IBGE_PPM'] },
        { segmento: 'carne_inteira', descricao: 'Frango inteiro congelado', ncms: ['0207.12.00'], sources: ['CEPEA', 'ABPA'] },
        { segmento: 'cortes_pedacos', descricao: 'Cortes e pedaços', ncms: ['0207.14.00'], sources: ['CEPEA', 'ABPA', 'SECEX'] },
        { segmento: 'figado_coracoes', descricao: 'Miúdos comestíveis', ncms: ['0207.27.00'], sources: ['ABPA', 'SECEX'] }
    ],
    suinos: [
        { segmento: 'suinos_vivos', descricao: 'Suínos vivos >= 50kg', ncms: ['0103.92.00'], sources: ['IBGE_PPM', 'MAPA'] },
        { segmento: 'carne_fresca', descricao: 'Carne suína fresca', ncms: ['0203.11.00', '0203.12.00'], sources: ['CEPEA', 'ABPA'] },
        { segmento: 'carne_congelada', descricao: 'Carne suína congelada', ncms: ['0203.29.00'], sources: ['CEPEA', 'ABPA', 'SECEX'] }
    ],
    peixes: [
        { segmento: 'alevinos_vivos', descricao: 'Alevinos e peixes vivos', ncms: ['0301.99.90'], sources: ['IBGE_PPM_Aquicultura', 'MPA'] },
        { segmento: 'filetes_tilapia', descricao: 'Filés de tilápia', ncms: ['0304.61.00'], sources: ['CEPEA', 'ABRA', 'SECEX'] },
        { segmento: 'filetes_outros', descricao: 'Filés de outros peixes', ncms: ['0304.62.00', '0304.69.00'], sources: ['CEPEA', 'SECEX'] },
        { segmento: 'camaroes', descricao: 'Camarões', ncms: ['0306.17.00'], sources: ['SECEX'] }
    ],
    minerais: [
        { segmento: 'rocha_fosforica', descricao: 'Fosfatos naturais', ncms: ['2510.10.10'], sources: ['ANP', 'Comex_Import'] },
        { segmento: 'fosfato_bicalcico', descricao: 'Fosfato bicálcico (DCP)', ncms: ['2835.26.00'], sources: ['ANDA', 'Comex_Import'] },
        { segmento: 'fosfato_monoamonico', descricao: 'MAP - Proxy global fósforo', ncms: ['3105.30.00'], sources: ['ANDA', 'Fertecon'] },
        { segmento: 'calcario', descricao: 'Calcário para correção solo', ncms: ['2521.00.00', '2521.00.10'], sources: ['ANDA', 'IBGE_PAM'] }
    ],
    biodiesel: [
        { segmento: 'biodiesel_puro', descricao: 'Biodiesel puro B100', ncms: ['3826.00.00'], sources: ['ANP', 'UBRABIO'] }
    ],
    pet_food: [
        { segmento: 'racao_caes_gatos', descricao: 'Rações cães e gatos', ncms: ['2309.10.00'], sources: ['Sindirações', 'Abinpet'] },
        { segmento: 'petiscos', descricao: 'Produtos petiscos', ncms: ['2309.90.90'], sources: ['Abinpet'] }
    ],
    racao_producao: [
        { segmento: 'racoes_completas', descricao: 'Rações completas preparadas', ncms: ['2309.90.90'], sources: ['Sindirações', 'IBGE_PIA'] }
    ],
    fertilizantes: [
        { segmento: 'fertilizantes_organicos', descricao: 'Fertilizantes orgânicos', ncms: ['3101.00.00'], sources: ['ANDA', 'MAPA'] }
    ],
    macroeconomia: [
        { segmento: 'indicadores_bcb', descricao: 'SELIC, IPCA, PTAX', ncms: [], sources: ['BCB_SGS'] },
        { segmento: 'indicadores_ibge', descricao: 'PIB, PPM, IPCA', ncms: [], sources: ['IBGE_SIDRA'] }
    ]
};
