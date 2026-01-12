
import React, { useState, useEffect, useRef } from 'react';
import { AppStatus, ProductData, Storyboard, VideoModel, ReasoningModel, ApiKeys, ScenePrompt } from './types';
import { mockScrapeProduct, generateStoryboard } from './geminiService';
import { generateVideoClip, autoEditMaster } from './videoService';

const App: React.FC = () => {
  const [url, setUrl] = useState('');
  const [keys, setKeys] = useState<ApiKeys>(() => {
    const saved = localStorage.getItem('AFF_GEN_KEYS');
    return saved ? JSON.parse(saved) : { gemini: '', veo: '', kling: '' };
  });
  
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [videoClips, setVideoClips] = useState<string[]>([]);
  const [masterVideo, setMasterVideo] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'creative' | 'render' | 'export'>('creative');

  // Advanced Configs
  const [reasoningModel, setReasoningModel] = useState<ReasoningModel>('gemini-3-pro');
  const [videoModel, setVideoModel] = useState<VideoModel>('veo-3.1-fast');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('AFF_GEN_KEYS', JSON.stringify(keys));
  }, [keys]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUploadedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const startAnalysis = async () => {
    if (!keys.gemini) { setShowSettings(true); return; }
    setStatus(AppStatus.SCRAPING);
    setLoadingMsg('SCRAPING PRODUCT DATA...');
    try {
      const data = await mockScrapeProduct(url);
      data.imageUrl = uploadedImage || "";
      setProduct(data);
      
      setStatus(AppStatus.STORYBOARDING);
      setLoadingMsg('AI CREATIVE DIRECTOR IS THINKING...');
      const script = await generateStoryboard(data, reasoningModel);
      setStoryboard(script);
      setStatus(AppStatus.IDLE);
      setActiveTab('creative');
    } catch (err: any) {
      setStatus(AppStatus.ERROR);
      alert(err.message);
    }
  };

  const executeProduction = async () => {
    if (!storyboard || !product) return;
    setStatus(AppStatus.GENERATING_VIDEO);
    setActiveTab('render');
    try {
      const clips: string[] = [];
      setVideoClips([]);
      for (let i = 0; i < storyboard.scenes.length; i++) {
        setLoadingMsg(`RENDERING SCENE ${i + 1}/${storyboard.scenes.length}...`);
        const vUrl = await generateVideoClip(storyboard.scenes[i], storyboard.character_seed_description, product, videoModel, storyboard.global_style);
        clips.push(vUrl);
        setVideoClips([...clips]);
      }
      
      setStatus(AppStatus.EDITING);
      setLoadingMsg('AUTO-EDITING MASTER SEQUENCE...');
      const master = await autoEditMaster(clips);
      setMasterVideo(master);
      setStatus(AppStatus.COMPLETED);
      setActiveTab('export');
    } catch (err: any) {
      setStatus(AppStatus.ERROR);
      alert(err.message);
    }
  };

  const updateScene = (index: number, field: keyof ScenePrompt, value: string) => {
    if (!storyboard) return;
    const newScenes = [...storyboard.scenes];
    (newScenes[index] as any)[field] = value;
    setStoryboard({ ...storyboard, scenes: newScenes });
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {/* HUD HEADER */}
      <header className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-2xl flex items-center justify-between px-8 sticky top-0 z-[100]">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h1 className="text-sm font-black tracking-[0.2em] uppercase text-blue-500">AFF-GEN ULTIMATE</h1>
            <span className="text-[9px] font-bold text-white/30 uppercase">Production Suite v4.0.b</span>
          </div>
          <div className="h-8 w-px bg-white/10 hidden md:block"></div>
          <nav className="hidden md:flex gap-6">
            {['creative', 'render', 'export'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'text-white border-b-2 border-blue-600' : 'text-white/30 hover:text-white/60'}`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-3 px-4 py-1.5 bg-white/5 rounded-full border border-white/10">
            <span className="text-[8px] font-bold text-white/40 uppercase">Engine:</span>
            <span className="text-[8px] font-bold text-blue-400 uppercase">{videoModel}</span>
          </div>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2.5 rounded-xl transition-all ${showSettings ? 'bg-blue-600' : 'bg-white/5 hover:bg-white/10'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
          </button>
        </div>
      </header>

      {/* PRO CONFIG PANEL */}
      {showSettings && (
        <div className="bg-[#050505] border-b border-white/5 p-10 animate-in slide-in-from-top duration-500">
          <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-10">
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span> Logic Hub
              </h3>
              <input 
                type="password" 
                value={keys.gemini}
                onChange={(e) => setKeys({...keys, gemini: e.target.value})}
                className="w-full bg-black border border-white/5 rounded-xl p-4 text-xs focus:border-blue-500 outline-none transition-all"
                placeholder="Gemini Enterprise Key"
              />
              <select 
                value={reasoningModel} 
                onChange={(e) => setReasoningModel(e.target.value as ReasoningModel)}
                className="w-full bg-black border border-white/5 rounded-xl p-4 text-xs"
              >
                <option value="gemini-3-pro">Gemini 3 Pro (Creative Master)</option>
                <option value="gemini-3-flash">Gemini 3 Flash (Fast Analysis)</option>
              </select>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-purple-500 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span> Visual Engine
              </h3>
              <input 
                type="password" 
                value={keys.veo}
                onChange={(e) => setKeys({...keys, veo: e.target.value})}
                className="w-full bg-black border border-white/5 rounded-xl p-4 text-xs focus:border-purple-500 outline-none"
                placeholder="Veo 3.1 GCP Key"
              />
              <select 
                value={videoModel} 
                onChange={(e) => setVideoModel(e.target.value as VideoModel)}
                className="w-full bg-black border border-white/5 rounded-xl p-4 text-xs"
              >
                <option value="veo-3.1-fast">Veo 3.1 Fast (Preview Mode)</option>
                <option value="veo-3.1-high">Veo 3.1 High (Production Mode)</option>
                <option value="kling-v1.5">Kling v1.5 (Professional)</option>
              </select>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-green-500 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Kling Advanced
              </h3>
              <input 
                type="password" 
                value={keys.kling}
                onChange={(e) => setKeys({...keys, kling: e.target.value})}
                className="w-full bg-black border border-white/5 rounded-xl p-4 text-xs focus:border-green-500 outline-none"
                placeholder="Kling Enterprise API Key"
              />
              <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[9px] text-white/40 leading-relaxed uppercase">Kling integration requires specialized project permissions for high-res video.</p>
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <button onClick={() => setShowSettings(false)} className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black py-4 rounded-xl uppercase tracking-widest transition-all">Save Production Config</button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-[1700px] mx-auto p-6 lg:p-12 pb-40">
        {status === AppStatus.IDLE || status === AppStatus.ERROR ? (
          <div className="grid lg:grid-cols-12 gap-12">
            {/* INPUT PANEL */}
            <div className="lg:col-span-4 space-y-8 animate-in fade-in slide-in-from-left duration-700">
              <div className="group relative">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-[4/3] bg-gradient-to-br from-[#0a0a0a] to-[#050505] border border-white/5 rounded-[40px] overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/40 transition-all shadow-2xl group"
                >
                  {uploadedImage ? (
                    <img src={uploadedImage} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Ref" />
                  ) : (
                    <div className="text-center space-y-6">
                      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/5 group-hover:bg-blue-600/10 transition-colors">
                        <svg className="w-10 h-10 text-white/20 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Source Reference</p>
                        <p className="text-[9px] text-white/20 uppercase font-bold">Image-to-Video Anchor</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-all"></div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
              </div>

              <div className="bg-[#080808] border border-white/5 p-10 rounded-[40px] space-y-10 shadow-xl">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] block ml-1">Affiliate Link</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="w-full bg-black/60 border border-white/5 rounded-2xl px-6 py-5 text-sm focus:border-blue-500 outline-none transition-all placeholder:text-white/10"
                        placeholder="Paste Shopee/TikTok/Amazon URL..."
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={startAnalysis}
                  className="w-full bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 py-6 rounded-2xl font-black text-xs uppercase tracking-[0.5em] transition-all shadow-[0_20px_40px_rgba(37,99,235,0.15)] active:scale-95"
                >
                  Start Analysis
                </button>
              </div>
            </div>

            {/* CREATIVE STUDIO PANEL */}
            <div className="lg:col-span-8">
              {!storyboard ? (
                <div className="h-full min-h-[600px] bg-[#050505] border border-white/5 rounded-[50px] flex flex-col items-center justify-center p-20 text-center opacity-40">
                  <div className="w-24 h-24 border-2 border-dashed border-white/10 rounded-full flex items-center justify-center mb-8 animate-spin-slow">
                    <svg className="w-8 h-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" strokeWidth="2"/></svg>
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-[0.4em]">Creative Director Idle</h3>
                  <p className="text-[10px] text-white/20 mt-4 max-w-sm font-bold uppercase leading-relaxed">System is awaiting target URL to generate high-conversion storyboard and cinematic direction.</p>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700">
                  <div className="flex items-center justify-between border-b border-white/5 pb-6">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-black italic tracking-tighter uppercase">Creative Director <span className="text-blue-500">Suite</span></h2>
                      <p className="text-[9px] text-white/30 font-bold uppercase tracking-[0.2em]">Character Seed: {storyboard.character_seed_description.substring(0, 40)}...</p>
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setStoryboard(null)}
                        className="px-6 py-3 rounded-full text-[10px] font-black uppercase border border-white/10 hover:bg-white hover:text-black transition-all"
                      >
                        Reset
                      </button>
                      <button 
                        onClick={executeProduction}
                        className="bg-blue-600 text-white px-10 py-3 rounded-full text-[10px] font-black uppercase hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/20"
                      >
                        Execute Full Production
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[600px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-white/5">
                    {storyboard.scenes.map((s, i) => (
                      <div key={i} className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 space-y-4 hover:border-blue-500/30 transition-all group">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-blue-500/50 uppercase tracking-widest italic">Scene_0{i+1} / T-{s.timestamp}</span>
                          <select 
                            value={s.transition}
                            onChange={(e) => updateScene(i, 'transition', e.target.value)}
                            className="bg-black text-[8px] font-bold border border-white/10 rounded px-2 py-1 uppercase text-white/40"
                          >
                            <option value="cut">Cut</option>
                            <option value="fade">Fade</option>
                            <option value="glitch">Glitch</option>
                          </select>
                        </div>
                        <textarea 
                          value={s.visual_prompt}
                          onChange={(e) => updateScene(i, 'visual_prompt', e.target.value)}
                          className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-[10px] text-white/60 focus:border-blue-500 outline-none transition-all resize-none h-24 font-mono leading-relaxed"
                        />
                        <div className="flex gap-4 items-center">
                          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600/20 w-full"></div>
                          </div>
                          <span className="text-[8px] font-black text-white/20 uppercase">RAW_FEED</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* CINEMATIC PROCESSING STATE */
          <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-16 animate-in fade-in duration-1000">
            <div className="relative w-56 h-56">
              <div className="absolute inset-0 border-[8px] border-blue-600/5 rounded-full animate-ping"></div>
              <div className="absolute inset-4 border-t-4 border-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-10 border-b-4 border-purple-600 rounded-full animate-spin-slow"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-[12px] font-black text-white tracking-[0.4em] uppercase animate-pulse">Processing</div>
              </div>
            </div>
            
            <div className="text-center space-y-6 max-w-2xl">
              <h3 className="text-4xl font-black italic tracking-tighter uppercase text-white/90">{loadingMsg}</h3>
              <p className="text-[10px] text-white/30 uppercase tracking-[0.5em] font-bold leading-loose">
                Allocating GPU Clusters • Neural Interpolation Active • Master Sequence Rendering
              </p>
              
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-8">
                <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-1000" 
                     style={{ width: `${(videoClips.length / (storyboard?.scenes.length || 1)) * 100}%` }}></div>
              </div>
            </div>
          </div>
        )}

        {/* PRODUCTION OUTPUT GRID */}
        {(status === AppStatus.COMPLETED || (status === AppStatus.GENERATING_VIDEO && videoClips.length > 0)) && (
          <div className="mt-20 space-y-16 animate-in slide-in-from-bottom-20 duration-1000">
            <div className="flex items-end justify-between border-b border-white/5 pb-10">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/10 border border-blue-600/20 rounded-full">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                  <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Master Feed Active</span>
                </div>
                <h2 className="text-6xl font-black italic tracking-tighter uppercase">Final Production</h2>
              </div>
              
              {status === AppStatus.COMPLETED && (
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = masterVideo || "";
                    link.download = 'affiliate_master_v4.mp4';
                    link.click();
                  }}
                  className="px-12 py-5 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-blue-600 hover:text-white transition-all shadow-2xl shadow-blue-900/40"
                >
                  Download Master Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
              {videoClips.map((vUrl, i) => (
                <div key={i} className="relative aspect-[9/16] bg-black rounded-[50px] overflow-hidden border border-white/5 group shadow-2xl hover:scale-[1.05] transition-all duration-700 hover:border-blue-600/30">
                  <video src={vUrl} controls className="w-full h-full object-cover" />
                  <div className="absolute top-8 left-8 flex flex-col gap-2">
                    <span className="bg-blue-600 px-3 py-1 rounded-full text-[8px] font-black italic">CLIP_0{i+1}</span>
                    <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-black uppercase text-white/40 border border-white/5 tracking-widest">4K_RENDER</span>
                  </div>
                </div>
              ))}
              {status === AppStatus.GENERATING_VIDEO && storyboard && Array.from({length: storyboard.scenes.length - videoClips.length}).map((_, i) => (
                <div key={i} className="aspect-[9/16] bg-[#050505] border border-white/5 border-dashed rounded-[50px] flex items-center justify-center group overflow-hidden relative">
                  <div className="absolute inset-0 bg-blue-600/5 animate-pulse"></div>
                  <div className="w-10 h-10 border-4 border-white/5 border-t-blue-600 rounded-full animate-spin relative z-10"></div>
                  <span className="absolute bottom-10 text-[8px] font-black text-white/20 uppercase tracking-[0.4em] z-10">Queueing...</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* DASHBOARD SYSTEM FOOTER */}
      <footer className="fixed bottom-0 left-0 right-0 h-14 bg-black/95 backdrop-blur-xl border-t border-white/5 flex items-center justify-between px-10 z-[100]">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_10px_#22c55e]"></div>
            <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">System Ready</span>
          </div>
          <div className="hidden md:flex items-center gap-6 border-l border-white/10 pl-6">
            <div className="flex flex-col">
              <span className="text-[7px] text-white/20 uppercase font-black tracking-widest">GPU Temp</span>
              <span className="text-[8px] text-white/60 font-bold uppercase tracking-widest">42°C Optimal</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[7px] text-white/20 uppercase font-black tracking-widest">Latency</span>
              <span className="text-[8px] text-white/60 font-bold uppercase tracking-widest">14ms Low</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">Affiliate Intelligence Suite // Ultimate Edition</p>
          <div className="w-2 h-2 bg-blue-600/20 rounded-sm transform rotate-45"></div>
        </div>
      </footer>

      <style>{`
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e1e1e; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #2563eb; }
      `}</style>
    </div>
  );
};

export default App;
